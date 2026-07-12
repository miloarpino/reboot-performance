"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createSupabaseServerClient } from "../lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  const profile = await getProfileForUser(supabase, data.user.id);
  redirect(profile?.role === "coach" ? "/coach" : "/client");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createClientAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const firstName = String(formData.get("firstName") || "");
  const lastName = String(formData.get("lastName") || "");

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error || !created.user) throw new Error(error?.message || "Client non cree.");

  await admin.from("profiles").upsert({
    id: created.user.id,
    role: "client",
    first_name: firstName,
    last_name: lastName,
    email
  });

  await admin.from("coach_client_relations").insert({
    coach_id: authData.user.id,
    client_id: created.user.id
  });

  await admin.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: created.user.id,
    action: "client.created",
    summary: `${firstName} ${lastName}`
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function updateAssessmentAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  const weight = Number(formData.get("weightKg") || 70);
  const height = Number(formData.get("heightCm") || 170);
  const age = Number(formData.get("age") || 30);
  const formula = String(formData.get("formula") || "maintien");
  const calories = formula === "perte" ? Math.round(weight * 28) : formula === "masse" ? Math.round(weight * 38) : Math.round(weight * 32);
  const protein = Math.round(weight * 1.8);
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(90, Math.round((calories - protein * 4 - fat * 9) / 4));

  await supabase.from("client_assessments").upsert({
    client_id: clientId,
    age,
    sex: String(formData.get("sex") || "homme"),
    height_cm: height,
    weight_kg: weight,
    body_fat_percent: Number(formData.get("bodyFatPercent") || 0),
    level: String(formData.get("level") || "debutant"),
    formula,
    goal: String(formData.get("goal") || ""),
    sport: String(formData.get("sport") || "general"),
    activity_hours: Number(formData.get("activityHours") || 0),
    injuries: splitList(String(formData.get("injuries") || "")),
    pain: splitList(String(formData.get("pain") || "")),
    food_preferences: splitList(String(formData.get("foodPreferences") || "")),
    allergies: splitList(String(formData.get("allergies") || "")),
    restrictions: splitList(String(formData.get("restrictions") || "")),
    calories,
    protein,
    carbs,
    fat,
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" });

  await supabase.from("nutrition_targets").upsert({
    client_id: clientId,
    calories,
    protein,
    carbs,
    fat,
    water_liters: Number((weight * 0.035).toFixed(1)),
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "assessment.updated",
    summary: "Bilan et nutrition recalcules"
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function assignWorkoutAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  const title = String(formData.get("title") || "");
  await supabase.from("workouts").insert({
    coach_id: authData.user.id,
    client_id: clientId,
    title,
    focus: String(formData.get("focus") || ""),
    scheduled_for: String(formData.get("scheduledFor") || new Date().toISOString().slice(0, 10)),
    duration_minutes: Number(formData.get("durationMinutes") || 45),
    exercises: splitList(String(formData.get("exercises") || "")),
    notes: String(formData.get("notes") || ""),
    status: "planned"
  });

  await supabase.from("notifications").insert({
    coach_id: authData.user.id,
    client_id: clientId,
    level: "information",
    title: "Nouvelle seance attribuee",
    status: "unread"
  });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "workout.assigned",
    summary: title
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function updateNutritionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  await supabase.from("nutrition_targets").upsert({
    client_id: clientId,
    calories: Number(formData.get("calories") || 0),
    protein: Number(formData.get("protein") || 0),
    carbs: Number(formData.get("carbs") || 0),
    fat: Number(formData.get("fat") || 0),
    water_liters: Number(formData.get("waterLiters") || 2),
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "nutrition.updated",
    summary: "Macros modifiees"
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function createAiRecommendationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);
  const clientId = String(formData.get("clientId"));
  const recommendation = {
    detected: ["donnees Supabase lues", "validation coach requise"],
    proposal: String(formData.get("proposal") || "Ajustement nutritionnel prudent"),
    source: "supabase"
  };

  await supabase.from("approval_requests").insert({
    coach_id: authData.user.id,
    client_id: clientId,
    kind: "ai_recommendation",
    status: "pending",
    payload: recommendation
  });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "ai.recommendation.created",
    summary: recommendation.proposal
  });

  revalidatePath("/coach");
}

export async function analyzeClientWithAiAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  await requireCoachClient(supabase, authData.user.id, clientId);
  await createDeterministicAiAnalysis(supabase, authData.user.id, clientId);
  revalidatePath("/coach");
}

export async function analyzeAllClientsWithAiAction() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const { data: relations } = await supabase
    .from("coach_client_relations")
    .select("client_id")
    .eq("coach_id", authData.user.id);

  for (const relation of relations || []) {
    await createDeterministicAiAnalysis(supabase, authData.user.id, relation.client_id);
  }

  revalidatePath("/coach");
}

export async function decideAiRecommendationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const recommendationId = String(formData.get("recommendationId"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") || "");
  const edit = parseJsonObject(String(formData.get("coachEdit") || ""));

  const { data: recommendation, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("id", recommendationId)
    .eq("coach_id", authData.user.id)
    .single();
  if (error || !recommendation) throw new Error(error?.message || "Recommandation introuvable.");
  await requireCoachClient(supabase, authData.user.id, recommendation.client_id);

  const status = decision === "approve"
    ? (edit ? "modified" : "approved")
    : decision === "reject"
      ? "rejected"
      : "postponed";

  await supabase.from("ai_recommendations").update({
    status,
    coach_edit: edit || recommendation.coach_edit,
    decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", recommendation.id);

  await supabase.from("approval_changes").insert({
    recommendation_id: recommendation.id,
    coach_id: authData.user.id,
    previous_status: recommendation.status,
    new_status: status,
    proposed_before: recommendation.proposed_change,
    proposed_after: edit || recommendation.proposed_change,
    note
  });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: recommendation.client_id,
    action: `ai.recommendation.${status}`,
    entity_id: recommendation.id,
    summary: note || recommendation.justification,
    before_data: recommendation,
    after_data: { status, coach_edit: edit || recommendation.coach_edit }
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function applyAiRecommendationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const recommendationId = String(formData.get("recommendationId"));
  const { data: recommendation, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("id", recommendationId)
    .eq("coach_id", authData.user.id)
    .single();
  if (error || !recommendation) throw new Error(error?.message || "Recommandation introuvable.");
  await requireCoachClient(supabase, authData.user.id, recommendation.client_id);

  const rpcName = recommendation.type === "nutrition"
    ? "apply_ai_nutrition_recommendation"
    : recommendation.type === "training"
      ? "apply_ai_training_recommendation"
      : null;
  if (!rpcName) {
    throw new Error("Application transactionnelle disponible pour nutrition et entrainement.");
  }

  const { error: rpcError } = await supabase.rpc(rpcName, {
    p_recommendation_id: recommendation.id,
    p_coach_id: authData.user.id
  });
  if (rpcError) throw new Error(rpcError.message);

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function restoreAiNutritionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const actionId = String(formData.get("actionId"));
  const { error } = await supabase.rpc("restore_ai_nutrition_action", {
    p_action_id: actionId,
    p_coach_id: authData.user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function restoreAiTrainingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const actionId = String(formData.get("actionId"));
  const { error } = await supabase.rpc("restore_ai_training_action", {
    p_action_id: actionId,
    p_coach_id: authData.user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function resolveApprovalAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const id = String(formData.get("approvalId"));
  const status = String(formData.get("status"));
  await supabase.from("approval_requests").update({
    status,
    resolved_at: new Date().toISOString()
  }).eq("id", id);

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: `ai.recommendation.${status}`,
    entity_id: id
  });

  revalidatePath("/coach");
}

export async function sendMessageAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  await supabase.from("messages").insert({
    sender_id: authData.user.id,
    recipient_id: String(formData.get("recipientId")),
    body: String(formData.get("body") || "")
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function createPublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const intent = String(formData.get("intent") || "draft");
  const status = intent === "schedule" ? "scheduled" : intent === "publish" ? "published" : "draft";
  const now = new Date().toISOString();
  const publishAt = status === "published"
    ? now
    : status === "scheduled"
      ? String(formData.get("publishAt") || now)
      : null;

  const payload = {
    body: String(formData.get("body") || ""),
    category: String(formData.get("category") || "general")
  };

  const { data: content, error } = await supabase.from("contents").insert({
    coach_id: authData.user.id,
    type: String(formData.get("type") || "announcement"),
    title: String(formData.get("title") || ""),
    status,
    payload,
    publish_at: publishAt,
    ends_at: String(formData.get("endsAt") || "") || null
  }).select("*").single();
  if (error || !content) throw new Error(error?.message || "Publication non creee.");

  await supabase.from("publication_targets").insert({
    content_id: content.id,
    mode: String(formData.get("targetMode") || "all"),
    client_ids: splitList(String(formData.get("clientIds") || "")),
    formulas: splitList(String(formData.get("formulas") || "")),
    goals: splitList(String(formData.get("goals") || "")),
    sexes: splitList(String(formData.get("sexes") || "")),
    levels: splitList(String(formData.get("levels") || "")),
    sports: splitList(String(formData.get("sports") || "")),
    min_age: optionalNumber(formData.get("minAge")),
    max_age: optionalNumber(formData.get("maxAge"))
  });

  if (status === "published") {
    await notifyPublicationTargets(supabase, authData.user.id, content.id, content.title);
  }

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: `content.${status}`,
    entity_id: content.id,
    summary: content.title
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function archivePublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const contentId = String(formData.get("contentId"));
  await supabase.from("contents").update({
    status: "archived",
    updated_at: new Date().toISOString()
  }).eq("id", contentId).eq("coach_id", authData.user.id);

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "content.archived",
    entity_id: contentId
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function deletePublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const contentId = String(formData.get("contentId"));
  await supabase.from("contents").delete().eq("id", contentId).eq("coach_id", authData.user.id);

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "content.deleted",
    entity_id: contentId
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function duplicatePublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const contentId = String(formData.get("contentId"));
  const { data: source, error } = await supabase
    .from("contents")
    .select("*")
    .eq("id", contentId)
    .eq("coach_id", authData.user.id)
    .single();
  if (error || !source) throw new Error(error?.message || "Publication source introuvable.");

  const { data: copy, error: copyError } = await supabase.from("contents").insert({
    coach_id: authData.user.id,
    type: source.type,
    title: `${source.title} - copie`,
    status: "draft",
    payload: source.payload,
    publish_at: null,
    ends_at: null
  }).select("*").single();
  if (copyError || !copy) throw new Error(copyError?.message || "Duplication impossible.");

  const { data: targets } = await supabase.from("publication_targets").select("*").eq("content_id", contentId);
  for (const target of targets || []) {
    await supabase.from("publication_targets").insert({
      content_id: copy.id,
      mode: target.mode,
      client_ids: target.client_ids,
      formulas: target.formulas,
      goals: target.goals,
      sexes: target.sexes,
      levels: target.levels,
      sports: target.sports,
      min_age: target.min_age,
      max_age: target.max_age
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "content.duplicated",
    entity_id: copy.id,
    summary: source.title
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function optionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function notifyPublicationTargets(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  contentId: string,
  title: string
) {
  const { data: targets } = await supabase.from("publication_targets").select("*").eq("content_id", contentId);
  const { data: relations } = await supabase.from("coach_client_relations").select("client_id").eq("coach_id", coachId);
  const clientIds = (relations || []).map((item) => item.client_id);
  if (!clientIds.length) return;

  const { data: assessments } = await supabase.from("client_assessments").select("*").in("client_id", clientIds);
  const recipients = new Set<string>();

  for (const target of targets || []) {
    for (const assessment of assessments || []) {
      if (targetMatchesAssessment(target, assessment)) {
        recipients.add(assessment.client_id);
      }
    }
  }

  for (const clientId of recipients) {
    await supabase.from("notifications").insert({
      coach_id: coachId,
      client_id: clientId,
      level: "information",
      title: `Nouvelle publication: ${title}`,
      status: "unread"
    });
  }
}

function targetMatchesAssessment(target: any, assessment: any) {
  if (target.mode === "manual") return (target.client_ids || []).includes(assessment.client_id);
  if (target.mode === "all") return true;

  return matchesArray(target.client_ids, assessment.client_id)
    && matchesArray(target.formulas, assessment.formula)
    && matchesArray(target.goals, assessment.goal)
    && matchesArray(target.sexes, assessment.sex)
    && matchesArray(target.levels, assessment.level)
    && matchesArray(target.sports, assessment.sport)
    && (!target.min_age || assessment.age >= target.min_age)
    && (!target.max_age || assessment.age <= target.max_age);
}

function matchesArray(values: string[] | null, value: string) {
  return !values?.length || values.includes(value);
}

async function createDeterministicAiAnalysis(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  clientId: string
) {
  const [profileResult, assessmentResult, nutritionResult, workoutsResult, measurementsResult, messagesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", clientId).single(),
    supabase.from("client_assessments").select("*").eq("client_id", clientId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("nutrition_targets").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("workouts").select("*").eq("client_id", clientId).order("scheduled_for", { ascending: false }).limit(8),
    supabase.from("measurements").select("*").eq("client_id", clientId).order("measured_at", { ascending: false }).limit(4),
    supabase.from("messages").select("*").or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`).order("created_at", { ascending: false }).limit(5)
  ]);

  const client = profileResult.data;
  const assessment = assessmentResult.data;
  const nutrition = nutritionResult.data;
  const workouts = workoutsResult.data || [];
  const measurements = measurementsResult.data || [];
  const messages = messagesResult.data || [];

  if (!client || !assessment || !nutrition) {
    throw new Error("Donnees client insuffisantes pour analyser.");
  }

  const completed = workouts.filter((workout: any) => workout.status === "completed").length;
  const missed = workouts.filter((workout: any) => workout.status === "missed").length;
  const hasPain = [...(assessment.pain || []), ...(assessment.injuries || [])].length > 0;
  const adherence = workouts.length ? Math.round((completed / workouts.length) * 100) : 0;
  const priority = hasPain || missed >= 2 ? "high" : adherence < 50 ? "medium" : "low";
  const mode = process.env.OPENAI_API_KEY && process.env.AI_DEMO_MODE !== "true" ? "api" : "demo";
  const targetCalories = assessment.formula === "perte"
    ? Math.max(1300, Math.round(Number(assessment.weight_kg || 70) * 27))
    : assessment.formula === "masse"
      ? Math.round(Number(assessment.weight_kg || 70) * 39)
      : Math.round(Number(assessment.weight_kg || 70) * 32);
  const nextNutrition = {
    calories: targetCalories,
    protein: Math.round(Number(assessment.weight_kg || 70) * 1.9),
    carbs: Math.max(90, Math.round((targetCalories - Math.round(Number(assessment.weight_kg || 70) * 1.9) * 4 - Math.round(Number(assessment.weight_kg || 70) * 0.8) * 9) / 4)),
    fat: Math.round(Number(assessment.weight_kg || 70) * 0.8),
    water_liters: Number((Number(assessment.weight_kg || 70) * 0.035).toFixed(1))
  };

  const dataUsed = {
    profile: { id: client.id, first_name: client.first_name, role: client.role },
    assessment: {
      age: assessment.age,
      sex: assessment.sex,
      formula: assessment.formula,
      goal: assessment.goal,
      level: assessment.level,
      sport: assessment.sport,
      injuries: assessment.injuries,
      pain: assessment.pain
    },
    nutrition,
    workouts: workouts.map((workout: any) => ({ id: workout.id, title: workout.title, status: workout.status, scheduled_for: workout.scheduled_for })),
    measurements,
    messages_count: messages.length,
    adherence
  };

  const { data: analysis, error: analysisError } = await supabase.from("ai_analyses").insert({
    coach_id: coachId,
    client_id: clientId,
    scope: "single_client",
    mode,
    status: "completed",
    summary: `${client.first_name}: ${priority === "high" ? "attention prioritaire" : "suivi stable"} - adherence ${adherence}%.`,
    priority,
    data_used: dataUsed,
    signals: [
      hasPain ? "douleur_ou_blessure" : "aucune_douleur_majeure",
      missed >= 2 ? "seances_manquees" : "rythme_correct",
      `formule_${assessment.formula}`
    ]
  }).select("*").single();
  if (analysisError || !analysis) throw new Error(analysisError?.message || "Analyse IA non creee.");

  const recommendations: any[] = [
    {
      analysis_id: analysis.id,
      coach_id: coachId,
      client_id: clientId,
      type: "nutrition",
      status: "pending",
      priority,
      confidence: mode === "api" ? 0.82 : 0.72,
      problem: nutrition.calories !== nextNutrition.calories ? "Macros a recalibrer selon le bilan" : "Macros coherentes, hydratation a confirmer",
      current_state: nutrition,
      proposed_change: nextNutrition,
      justification: `Calcul base sur poids, formule ${assessment.formula}, objectif et adherence recente.`,
      expected_benefit: "Aligner les apports avec la progression attendue cette semaine.",
      risks: hasPain ? ["Surveiller fatigue et douleurs avant deficit agressif"] : [],
      requires_client_visibility: true
    },
    {
      analysis_id: analysis.id,
      coach_id: coachId,
      client_id: clientId,
      type: "training",
      status: "pending",
      priority: hasPain ? "high" : "medium",
      confidence: mode === "api" ? 0.78 : 0.68,
      problem: hasPain ? "Douleur ou blessure signalee" : "Optimisation de la charge hebdomadaire",
      current_state: { workouts, adherence },
      proposed_change: {
        title: hasPain ? "Seance adaptee douleur IA" : "Seance progression IA",
        focus: hasPain ? "recuperation active" : "progression controlee",
        scheduled_for: new Date().toISOString().slice(0, 10),
        duration_minutes: hasPain ? 35 : 50,
        exercises: hasPain ? ["Mobilite hanches", "Goblet squat leger", "Rowing elastique"] : ["Squat", "Developpe couche", "Rowing barre"],
        notes: hasPain ? "RPE cible 6, aucun mouvement douloureux." : "Progression prudente, repos strict.",
        deload: hasPain,
        rest_days: hasPain ? 2 : 1,
        intensity: hasPain ? "moderee" : "progressive",
        training_details: {
          sets: hasPain ? 3 : 4,
          reps: hasPain ? "10-12" : "6-8",
          load: hasPain ? "60% charge habituelle" : "+2,5% si RPE <= 8",
          rest_seconds: hasPain ? 75 : 120,
          rpe_target: hasPain ? 6 : 8,
          replacement_exercise: hasPain ? "Remplacer tout exercice douloureux" : null
        }
      },
      justification: "Adaptation preparee depuis les seances, douleurs et adherence recentes.",
      expected_benefit: hasPain ? "Reduire le risque blessure sans arreter le suivi." : "Maintenir la progression sans surcharge.",
      risks: hasPain ? ["Ne pas publier sans validation coach"] : [],
      requires_client_visibility: true
    }
  ];

  for (const recommendation of recommendations) {
    await supabase.from("ai_recommendations").insert(recommendation);
  }

  await supabase.from("ai_usage_logs").insert({
    coach_id: coachId,
    client_id: clientId,
    mode,
    action: "analysis.created",
    status: "success",
    tokens_input: JSON.stringify(dataUsed).length,
    tokens_output: JSON.stringify(recommendations).length
  });

  await supabase.from("audit_logs").insert({
    actor_id: coachId,
    client_id: clientId,
    action: "ai.analysis.created",
    entity_id: analysis.id,
    summary: analysis.summary,
    after_data: { mode, recommendations: recommendations.length }
  });

  return analysis;
}

function parseJsonObject(value: string) {
  if (!value.trim()) return null;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("La modification doit etre un objet JSON.");
  }
  return parsed;
}

async function requireCoachClient(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  clientId: string
) {
  const { data } = await supabase
    .from("coach_client_relations")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data) {
    throw new Error("Client non rattache a ce coach.");
  }
}

async function getProfileForUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data;
}

async function requireCoach(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const profile = await getProfileForUser(supabase, userId);
  if (profile?.role !== "coach") {
    redirect("/client");
  }
}
