import { createClient } from "@supabase/supabase-js";
import "./load-env.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD;

if (!url || !anon || !password) {
  console.error("Variables requises: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY et DEMO_PASSWORD ou SEED_PASSWORD");
  process.exit(1);
}

const emails = [
  "client1@milo.reboot",
  "client2@milo.reboot",
  "client3@milo.reboot",
  "client4@milo.reboot"
];

async function signIn(email) {
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const coach = await signIn("coach@milo.reboot");
const coachProfile = await coach.from("profiles").select("id, role, email, first_name, last_name").eq("email", "coach@milo.reboot").single();
if (coachProfile.error) throw coachProfile.error;
expect(coachProfile.data.role === "coach", "Le compte coach doit avoir le role coach");
expect(coachProfile.data.first_name === "Milo", "Le coach doit s'appeler Milo");

const relations = await coach.from("coach_client_relations").select("client_id");
if (relations.error) throw relations.error;
expect(relations.data.length === 4, "Le coach doit lire exactement 4 clients demo");

const coachClients = await coach.from("profiles").select("email, role, objective").eq("role", "client").in("email", emails);
if (coachClients.error) throw coachClients.error;
expect(coachClients.data.length === 4, "Le coach doit acceder aux 4 profils clients demo");

const coachAssessments = await coach.from("client_assessments").select("client_id, goal, formula");
if (coachAssessments.error) throw coachAssessments.error;
for (const expectedGoal of ["prise de masse", "perte de poids", "performance", "maintien"]) {
  expect(coachAssessments.data.some((item) => item.goal === expectedGoal), `Bilan manquant: ${expectedGoal}`);
}

const expectedByEmail = {
  "client1@milo.reboot": "prise de masse",
  "client2@milo.reboot": "perte de poids",
  "client3@milo.reboot": "performance",
  "client4@milo.reboot": "maintien"
};

for (const email of emails) {
  const client = await signIn(email);
  const profile = await client.from("profiles").select("id, role, email, objective").eq("email", email).single();
  if (profile.error) throw profile.error;
  expect(profile.data.role === "client", `${email} doit avoir le role client`);
  expect(profile.data.objective === expectedByEmail[email], `${email} doit avoir le bon objectif`);

  const ownAssessments = await client.from("client_assessments").select("client_id, goal");
  if (ownAssessments.error) throw ownAssessments.error;
  expect(ownAssessments.data.length === 1, `${email} doit lire uniquement son bilan`);
  expect(ownAssessments.data[0].client_id === profile.data.id, `${email} ne doit pas lire le bilan d'un autre client`);

  const nutrition = await client.from("nutrition_targets").select("client_id, calories, protein, carbs, fat");
  if (nutrition.error) throw nutrition.error;
  expect(nutrition.data.length === 1, `${email} doit lire uniquement sa nutrition`);
  expect(nutrition.data[0].client_id === profile.data.id, `${email} ne doit pas lire la nutrition d'un autre client`);

  const workouts = await client.from("workouts").select("client_id, title");
  if (workouts.error) throw workouts.error;
  expect(workouts.data.length >= 3, `${email} doit avoir des seances demo`);
  expect(workouts.data.every((item) => item.client_id === profile.data.id), `${email} ne doit voir que ses seances`);

  const measurements = await client.from("measurements").select("client_id, weight_kg");
  if (measurements.error) throw measurements.error;
  expect(measurements.data.length >= 3, `${email} doit avoir une progression`);
  expect(measurements.data.every((item) => item.client_id === profile.data.id), `${email} ne doit voir que sa progression`);

  const notifications = await client.from("notifications").select("client_id, title");
  if (notifications.error) throw notifications.error;
  expect(notifications.data.some((item) => item.client_id === profile.data.id), `${email} doit avoir une notification`);

  const forbiddenProfiles = await client.from("profiles").select("email").neq("id", profile.data.id);
  if (forbiddenProfiles.error) throw forbiddenProfiles.error;
  expect(!forbiddenProfiles.data.some((item) => emails.includes(item.email)), `${email} ne doit pas lire les autres profils clients`);

  await client.auth.signOut();
}

const badLogin = await createClient(url, anon).auth.signInWithPassword({
  email: "coach@milo.reboot",
  password: "mot-de-passe-invalide"
});
expect(Boolean(badLogin.error), "Une mauvaise connexion demo doit echouer");

await coach.auth.signOut();
console.log("Smoke test demo Supabase Auth/RLS OK");
