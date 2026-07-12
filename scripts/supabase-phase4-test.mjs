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

const runId = new Date().toISOString().replace(/[:.]/g, "-");

async function signIn(email) {
  const client = createClient(url, anon);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function profile(client, email) {
  const result = await client.from("profiles").select("id, role, email").eq("email", email).single();
  if (result.error) throw result.error;
  return result.data;
}

async function createContent(coach, coachId, title, status, target) {
  const publishAt = target.publishAt || new Date(Date.now() - 60_000).toISOString();
  const { data: content, error } = await coach.from("contents").insert({
    coach_id: coachId,
    type: target.type || "announcement",
    title,
    status,
    payload: { body: `Payload ${title}`, phase: "4" },
    publish_at: publishAt,
    ends_at: target.endsAt || null
  }).select("*").single();
  if (error) throw error;

  const targetResult = await coach.from("publication_targets").insert({
    content_id: content.id,
    mode: target.mode,
    client_ids: target.clientIds || [],
    formulas: target.formulas || [],
    goals: target.goals || [],
    sexes: target.sexes || [],
    levels: target.levels || [],
    sports: target.sports || [],
    min_age: target.minAge || null,
    max_age: target.maxAge || null
  });
  if (targetResult.error) throw targetResult.error;
  return content;
}

async function visibleTitles(client) {
  const result = await client.from("contents").select("title").like("title", `Phase4 ${runId}%`);
  if (result.error) throw result.error;
  return new Set(result.data.map((item) => item.title));
}

const coach = await signIn(emails.coach);
const lossClient = await signIn(emails.lossClient);
const massClient = await signIn(emails.massClient);

const coachProfile = await profile(coach, emails.coach);
const lossProfile = await profile(lossClient, emails.lossClient);

await createContent(coach, coachProfile.id, `Phase4 ${runId} all`, "published", { mode: "all" });
await createContent(coach, coachProfile.id, `Phase4 ${runId} manual-loss`, "published", { mode: "manual", clientIds: [lossProfile.id] });
await createContent(coach, coachProfile.id, `Phase4 ${runId} formula-loss`, "published", { mode: "profile", formulas: ["perte"] });
await createContent(coach, coachProfile.id, `Phase4 ${runId} age-30-35`, "published", { mode: "profile", minAge: 30, maxAge: 35 });
await createContent(coach, coachProfile.id, `Phase4 ${runId} future`, "scheduled", {
  mode: "all",
  publishAt: new Date(Date.now() + 86_400_000).toISOString()
});
await createContent(coach, coachProfile.id, `Phase4 ${runId} draft`, "draft", { mode: "all" });

const lossTitles = await visibleTitles(lossClient);
const massTitles = await visibleTitles(massClient);

expect(lossTitles.has(`Phase4 ${runId} all`), "La cliente perte doit voir une publication all");
expect(massTitles.has(`Phase4 ${runId} all`), "Le client masse doit voir une publication all");
expect(lossTitles.has(`Phase4 ${runId} manual-loss`), "La cliente perte doit voir sa publication manuelle");
expect(!massTitles.has(`Phase4 ${runId} manual-loss`), "Le client masse ne doit pas voir la publication manuelle de la cliente perte");
expect(lossTitles.has(`Phase4 ${runId} formula-loss`), "La cliente perte doit voir une publication formule perte");
expect(!massTitles.has(`Phase4 ${runId} formula-loss`), "Le client masse ne doit pas voir une publication formule perte");
expect(lossTitles.has(`Phase4 ${runId} age-30-35`), "La cliente de 32 ans doit voir une publication age 30-35");
expect(!massTitles.has(`Phase4 ${runId} age-30-35`), "Le client de 27 ans ne doit pas voir une publication age 30-35");
expect(!lossTitles.has(`Phase4 ${runId} future`), "Une publication programmee dans le futur doit etre invisible");
expect(!lossTitles.has(`Phase4 ${runId} draft`), "Un brouillon doit etre invisible cote client");

const forbidden = await lossClient.from("contents").insert({
  coach_id: lossProfile.id,
  type: "announcement",
  title: `Phase4 ${runId} forbidden`,
  status: "published",
  payload: {},
  publish_at: new Date().toISOString()
});
expect(Boolean(forbidden.error), "Un client ne doit pas creer de contenu coach");

console.log("Smoke test Phase 4 publications/RLS OK");
