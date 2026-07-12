import { createClient } from "@supabase/supabase-js";
import "./load-env.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD;

if (!url || !anon || !password) {
  console.error("Variables requises: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY et SEED_PASSWORD");
  process.exit(1);
}

const emails = {
  coach: "coach.milo@reboot.test",
  lossClient: "cliente.perte@reboot.test",
  massClient: "client.masse@reboot.test"
};

async function signIn(email, suppliedPassword = password) {
  const client = createClient(url, anon);
  const { error } = await client.auth.signInWithPassword({ email, password: suppliedPassword });
  if (error) throw error;
  return client;
}

async function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const badLogin = await createClient(url, anon).auth.signInWithPassword({
  email: emails.coach,
  password: "mot-de-passe-invalide"
});
await expect(Boolean(badLogin.error), "Une mauvaise connexion doit echouer");

const coach = await signIn(emails.coach);
const coachProfile = await coach.from("profiles").select("id, role, email").eq("email", emails.coach).single();
if (coachProfile.error) throw coachProfile.error;
await expect(coachProfile.data.role === "coach", "Le compte Milo doit avoir le role coach");

const relations = await coach.from("coach_client_relations").select("client_id");
if (relations.error) throw relations.error;
await expect(relations.data.length >= 2, "Le coach doit lire ses relations clients");

const lossClient = await signIn(emails.lossClient);
const lossProfile = await lossClient.from("profiles").select("id, role, email").eq("email", emails.lossClient).single();
if (lossProfile.error) throw lossProfile.error;
await expect(lossProfile.data.role === "client", "Le compte perte doit avoir le role client");

const lossAssessments = await lossClient.from("client_assessments").select("*");
if (lossAssessments.error) throw lossAssessments.error;
await expect(lossAssessments.data.some((item) => item.formula === "perte"), "La cliente perte doit lire son bilan perte");

const forbiddenTemplate = await lossClient.from("templates").insert({
  coach_id: lossProfile.data.id,
  source_type: "challenge",
  title: "Interdit client",
  payload: {}
});
await expect(Boolean(forbiddenTemplate.error), "RLS attendue: un client ne doit pas creer de template coach");

const forbiddenRoleUpdate = await lossClient.from("profiles").update({ role: "coach" }).eq("id", lossProfile.data.id);
await expect(Boolean(forbiddenRoleUpdate.error), "Un client ne doit pas pouvoir devenir coach depuis le frontend");

const massClient = await signIn(emails.massClient);
const massAssessments = await massClient.from("client_assessments").select("*");
if (massAssessments.error) throw massAssessments.error;
await expect(massAssessments.data.some((item) => item.formula === "masse"), "Le client masse doit lire son bilan masse");

await coach.auth.signOut();
const signedOut = await coach.auth.getSession();
await expect(!signedOut.data.session, "La deconnexion coach doit supprimer la session locale");

console.log("Smoke test Supabase Auth/RLS OK");
