import { createClient } from "@supabase/supabase-js";
import "./load-env.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;

if (!url || !anon || !serviceRole || !password) {
  console.error("Variables requises: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY et SEED_PASSWORD");
  process.exit(1);
}

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const emails = {
  coach: "coach.milo@reboot.test",
  lossClient: "cliente.perte@reboot.test",
  massClient: "client.masse@reboot.test",
  otherCoach: "coach.other@reboot.test",
  otherClient: "client.other@reboot.test"
};

const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

function anonClient(key) {
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: key } });
}

async function signIn(email, key) {
  const client = anonClient(key);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, user: data.user };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function ensureAuthProfile(account) {
  const created = await admin.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: { first_name: account.firstName, last_name: account.lastName }
  });
  if (created.error && !created.error.message.toLowerCase().includes("already")) throw created.error;

  let user = created.data?.user;
  if (!user) {
    const { data } = await admin.auth.admin.listUsers();
    user = data.users.find((item) => item.email === account.email);
  }
  if (!user) throw new Error(`Utilisateur introuvable: ${account.email}`);

  await admin.from("profiles").delete().eq("id", user.id);
  const profile = await admin.from("profiles").insert({
    id: user.id,
    role: account.role,
    first_name: account.firstName,
    last_name: account.lastName,
    email: account.email
  });
  if (profile.error) throw profile.error;
  return user;
}

const otherCoach = await ensureAuthProfile({ email: emails.otherCoach, role: "coach", firstName: "Autre", lastName: "Coach" });
const otherClient = await ensureAuthProfile({ email: emails.otherClient, role: "client", firstName: "Autre", lastName: "Client" });
await admin.from("coach_client_relations").upsert({ coach_id: otherCoach.id, client_id: otherClient.id });
await admin.from("client_assessments").upsert({
  client_id: otherClient.id,
  age: 41,
  sex: "homme",
  height_cm: 180,
  weight_kg: 82,
  body_fat_percent: 18,
  level: "debutant",
  formula: "maintien",
  goal: "maintien forme",
  sport: "general",
  activity_hours: 2,
  calories: 2600,
  protein: 150,
  carbs: 280,
  fat: 80
}, { onConflict: "client_id" });

const coach = await signIn(emails.coach, `coach-${runId}`);
const loss = await signIn(emails.lossClient, `loss-${runId}`);

const lossProfile = await loss.client.from("profiles").select("id").eq("email", emails.lossClient).single();
if (lossProfile.error) throw lossProfile.error;

const otherClientProfile = await admin.from("profiles").select("id").eq("email", emails.otherClient).single();
if (otherClientProfile.error) throw otherClientProfile.error;

const clientForbiddenAnalysis = await loss.client.from("ai_analyses").insert({
  coach_id: loss.user.id,
  client_id: loss.user.id,
  scope: "single_client",
  mode: "demo",
  status: "completed",
  summary: "Interdit",
  priority: "low"
});
expect(Boolean(clientForbiddenAnalysis.error), "Un client ne doit pas creer d'analyse IA coach");

const forbiddenOtherClient = await coach.client.from("ai_analyses").insert({
  coach_id: coach.user.id,
  client_id: otherClientProfile.data.id,
  scope: "single_client",
  mode: "demo",
  status: "completed",
  summary: "Interdit autre client",
  priority: "low"
});
expect(Boolean(forbiddenOtherClient.error), "Un coach ne doit pas analyser un client d'un autre coach");

const analysis = await coach.client.from("ai_analyses").insert({
  coach_id: coach.user.id,
  client_id: lossProfile.data.id,
  scope: "single_client",
  mode: "demo",
  status: "completed",
  summary: `Phase5 ${runId} analyse demo`,
  priority: "high",
  data_used: { source: "phase5-test" },
  signals: ["demo_mode", "nutrition"]
}).select("*").single();
if (analysis.error) throw analysis.error;

const beforeNutrition = await coach.client.from("nutrition_targets").select("*").eq("client_id", lossProfile.data.id).single();
if (beforeNutrition.error) throw beforeNutrition.error;

const proposed = {
  calories: Number(beforeNutrition.data.calories) + 25,
  protein: Number(beforeNutrition.data.protein) + 1,
  carbs: Number(beforeNutrition.data.carbs) + 4,
  fat: Number(beforeNutrition.data.fat),
  water_liters: Number(beforeNutrition.data.water_liters)
};

const recommendation = await coach.client.from("ai_recommendations").insert({
  analysis_id: analysis.data.id,
  coach_id: coach.user.id,
  client_id: lossProfile.data.id,
  type: "nutrition",
  status: "pending",
  priority: "high",
  confidence: 0.74,
  problem: "Phase5 test nutrition",
  current_state: beforeNutrition.data,
  proposed_change: proposed,
  justification: "Test transactionnel Phase 5",
  expected_benefit: "Verifier audit et atomicite",
  risks: ["test"],
  requires_client_visibility: true
}).select("*").single();
if (recommendation.error) throw recommendation.error;

const clientReadPrivate = await loss.client.from("ai_analyses").select("*").eq("id", analysis.data.id);
expect(!clientReadPrivate.error && clientReadPrivate.data.length === 0, "Un client ne doit pas lire les analyses IA privees");

const prematureApply = await coach.client.rpc("apply_ai_nutrition_recommendation", {
  p_recommendation_id: recommendation.data.id,
  p_coach_id: coach.user.id
});
expect(Boolean(prematureApply.error), "Une proposition pending ne doit pas etre appliquee");

const rejected = await coach.client.from("ai_recommendations").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", recommendation.data.id).select("*").single();
if (rejected.error) throw rejected.error;
const rejectedApply = await coach.client.rpc("apply_ai_nutrition_recommendation", {
  p_recommendation_id: recommendation.data.id,
  p_coach_id: coach.user.id
});
expect(Boolean(rejectedApply.error), "Une proposition refusee ne doit pas etre appliquee");

const approved = await coach.client.from("ai_recommendations").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", recommendation.data.id).select("*").single();
if (approved.error) throw approved.error;

const applied = await coach.client.rpc("apply_ai_nutrition_recommendation", {
  p_recommendation_id: recommendation.data.id,
  p_coach_id: coach.user.id
});
if (applied.error) throw applied.error;

const afterNutrition = await coach.client.from("nutrition_targets").select("*").eq("client_id", lossProfile.data.id).single();
if (afterNutrition.error) throw afterNutrition.error;
expect(Number(afterNutrition.data.calories) === proposed.calories, "La transaction doit appliquer les nouvelles calories");

const doubleApply = await coach.client.rpc("apply_ai_nutrition_recommendation", {
  p_recommendation_id: recommendation.data.id,
  p_coach_id: coach.user.id
});
expect(Boolean(doubleApply.error), "Une proposition appliquee ne doit pas etre appliquee deux fois");

const actions = await coach.client.from("ai_actions").select("*").eq("recommendation_id", recommendation.data.id).eq("status", "applied");
if (actions.error) throw actions.error;
expect(actions.data.length === 1, "Une action appliquee doit etre enregistree");
expect(Boolean(actions.data[0].before_data) && Boolean(actions.data[0].after_data), "L'action doit contenir ancienne et nouvelle valeur");

const audit = await coach.client.from("audit_logs").select("*").eq("entity_id", recommendation.data.id).eq("action", "ai.nutrition.applied");
if (audit.error) throw audit.error;
expect(audit.data.length >= 1, "L'application doit creer une entree d'audit");

const restored = await coach.client.rpc("restore_ai_nutrition_action", {
  p_action_id: actions.data[0].id,
  p_coach_id: coach.user.id
});
if (restored.error) throw restored.error;

const restoredNutrition = await coach.client.from("nutrition_targets").select("*").eq("client_id", lossProfile.data.id).single();
if (restoredNutrition.error) throw restoredNutrition.error;
expect(Number(restoredNutrition.data.calories) === Number(beforeNutrition.data.calories), "La restauration doit retablir les anciennes calories");

const workout = await coach.client.from("workouts").insert({
  coach_id: coach.user.id,
  client_id: lossProfile.data.id,
  title: `Phase5 ${runId} seance initiale`,
  focus: "initial",
  scheduled_for: new Date().toISOString().slice(0, 10),
  duration_minutes: 40,
  exercises: ["Squat", "Rowing"],
  notes: "Avant IA",
  status: "planned",
  feedback: { training_details: { sets: 3, reps: "10", load: "leger", rest_seconds: 90 } }
}).select("*").single();
if (workout.error) throw workout.error;

const trainingProposed = {
  workout_id: workout.data.id,
  title: `Phase5 ${runId} seance modifiee IA`,
  focus: "progression controlee",
  scheduled_for: workout.data.scheduled_for,
  duration_minutes: 55,
  exercises: ["Goblet squat", "Rowing haltere", "Gainage"],
  notes: "Applique par transaction IA",
  training_details: {
    sets: 4,
    reps: "8-10",
    load: "+2,5 kg",
    rest_seconds: 120,
    rpe_target: 8,
    replacement_exercise: "Goblet squat"
  }
};

const trainingRecommendation = await coach.client.from("ai_recommendations").insert({
  analysis_id: analysis.data.id,
  coach_id: coach.user.id,
  client_id: lossProfile.data.id,
  type: "training",
  status: "pending",
  priority: "high",
  confidence: 0.76,
  problem: "Phase5 test entrainement",
  current_state: workout.data,
  proposed_change: trainingProposed,
  justification: "Test transactionnel entrainement Phase 5",
  expected_benefit: "Verifier series repetitions charge repos exercice et seance",
  risks: ["test"],
  requires_client_visibility: true
}).select("*").single();
if (trainingRecommendation.error) throw trainingRecommendation.error;

const prematureTrainingApply = await coach.client.rpc("apply_ai_training_recommendation", {
  p_recommendation_id: trainingRecommendation.data.id,
  p_coach_id: coach.user.id
});
expect(Boolean(prematureTrainingApply.error), "Une proposition entrainement pending ne doit pas etre appliquee");

const approvedTraining = await coach.client.from("ai_recommendations").update({
  status: "approved",
  decided_at: new Date().toISOString()
}).eq("id", trainingRecommendation.data.id).select("*").single();
if (approvedTraining.error) throw approvedTraining.error;

const appliedTraining = await coach.client.rpc("apply_ai_training_recommendation", {
  p_recommendation_id: trainingRecommendation.data.id,
  p_coach_id: coach.user.id
});
if (appliedTraining.error) throw appliedTraining.error;

const afterWorkout = await coach.client.from("workouts").select("*").eq("id", workout.data.id).single();
if (afterWorkout.error) throw afterWorkout.error;
expect(afterWorkout.data.title === trainingProposed.title, "La transaction entrainement doit modifier la seance");
expect(afterWorkout.data.exercises.includes("Goblet squat"), "La transaction doit remplacer/ajouter les exercices");
expect(afterWorkout.data.feedback.ai_training_details.sets === 4, "Les series doivent etre auditees dans les details IA");
expect(afterWorkout.data.feedback.ai_training_details.reps === "8-10", "Les repetitions doivent etre auditees dans les details IA");
expect(afterWorkout.data.feedback.ai_training_details.load === "+2,5 kg", "La charge doit etre auditee dans les details IA");
expect(afterWorkout.data.feedback.ai_training_details.rest_seconds === 120, "Le repos doit etre audite dans les details IA");

const doubleTrainingApply = await coach.client.rpc("apply_ai_training_recommendation", {
  p_recommendation_id: trainingRecommendation.data.id,
  p_coach_id: coach.user.id
});
expect(Boolean(doubleTrainingApply.error), "Une proposition entrainement appliquee ne doit pas etre appliquee deux fois");

const trainingActions = await coach.client.from("ai_actions").select("*").eq("recommendation_id", trainingRecommendation.data.id).eq("status", "applied");
if (trainingActions.error) throw trainingActions.error;
expect(trainingActions.data.length === 1, "Une action entrainement appliquee doit etre enregistree");
expect(Boolean(trainingActions.data[0].before_data) && Boolean(trainingActions.data[0].after_data), "L'action entrainement doit contenir ancienne et nouvelle valeur");

const trainingAudit = await coach.client.from("audit_logs").select("*").eq("entity_id", trainingRecommendation.data.id).eq("action", "ai.training.applied");
if (trainingAudit.error) throw trainingAudit.error;
expect(trainingAudit.data.length >= 1, "L'application entrainement doit creer une entree d'audit");

const restoredTraining = await coach.client.rpc("restore_ai_training_action", {
  p_action_id: trainingActions.data[0].id,
  p_coach_id: coach.user.id
});
if (restoredTraining.error) throw restoredTraining.error;

const restoredWorkout = await coach.client.from("workouts").select("*").eq("id", workout.data.id).single();
if (restoredWorkout.error) throw restoredWorkout.error;
expect(restoredWorkout.data.title === workout.data.title, "La restauration entrainement doit retablir l'ancien titre");
expect(restoredWorkout.data.exercises.includes("Squat"), "La restauration entrainement doit retablir les anciens exercices");

console.log("Smoke test Phase 5 Agent IA/RLS OK");
