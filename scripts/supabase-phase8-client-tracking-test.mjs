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

if (process.env.ALLOW_REMOTE_RLS_TESTS !== "true") {
  console.error("Refus de mutation distante: definis ALLOW_REMOTE_RLS_TESTS=true uniquement pour lancer ce smoke test sur un projet Supabase de test.");
  process.exit(1);
}

const emails = {
  coachA: "phase8.coach.a@reboot.test",
  coachB: "phase8.coach.b@reboot.test",
  clientA: "phase8.client.a@reboot.test",
  clientB: "phase8.client.b@reboot.test"
};

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function browserClient() {
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function signIn(email) {
  const supabase = browserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return supabase;
}

async function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function ensureTestUser(email, role, firstName, lastName) {
  const existing = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (created.error || !created.data.user) throw created.error || new Error(`Utilisateur de test non cree: ${email}`);

  const profile = await admin.from("profiles").upsert({
    id: created.data.user.id,
    email,
    role,
    first_name: firstName,
    last_name: lastName
  }).select("id").single();
  if (profile.error) throw profile.error;
  return profile.data;
}

async function expectNoRows(result, message) {
  if (result.error) throw result.error;
  await expect(Array.isArray(result.data) && result.data.length === 0, message);
}

async function expectRows(result, count, message) {
  if (result.error) throw result.error;
  await expect(Array.isArray(result.data) && result.data.length === count, message);
}

async function expectRejected(result, message) {
  await expect(Boolean(result.error), message);
}

const weekStart = "2099-02-02";
const marker = `Smoke Phase 8 ${Date.now()}`;
const photoPaths = [];
let profiles = null;

async function cleanupTempData() {
  if (!profiles) return;
  const coachIds = [profiles.coachA.id, profiles.coachB.id];
  const clientIds = [profiles.clientA.id, profiles.clientB.id];
  if (photoPaths.length) {
    await admin.storage.from("reboot-weekly-photos").remove(photoPaths);
  }
  await admin.from("tribe_posts").delete().ilike("body", "Smoke Phase 8%");
  await admin.from("tribe_posts").delete().in("author_id", [...coachIds, ...clientIds]);
  await admin.from("weekly_private_journals").delete().eq("week_start", weekStart).in("client_id", clientIds);
  await admin.from("weekly_checkins").delete().eq("week_start", weekStart).in("client_id", clientIds);
  await admin.from("hydration_entries").delete().eq("note", marker).in("client_id", clientIds);
  await admin.from("meal_entries").delete().ilike("meal_name", "Smoke Phase 8%").in("client_id", clientIds);
  await admin.from("coach_client_relations").delete().in("coach_id", coachIds).in("client_id", clientIds);
}

try {
  profiles = {
    coachA: await ensureTestUser(emails.coachA, "coach", "Phase8", "Coach A"),
    coachB: await ensureTestUser(emails.coachB, "coach", "Phase8", "Coach B"),
    clientA: await ensureTestUser(emails.clientA, "client", "Phase8", "Client A"),
    clientB: await ensureTestUser(emails.clientB, "client", "Phase8", "Client B")
  };

  await cleanupTempData();

  const relationA = await admin.from("coach_client_relations").insert([
    { coach_id: profiles.coachA.id, client_id: profiles.clientA.id },
    { coach_id: profiles.coachA.id, client_id: profiles.clientB.id }
  ]);
  if (relationA.error) throw relationA.error;

  const coachA = await signIn(emails.coachA);
  const coachB = await signIn(emails.coachB);
  const clientA = await signIn(emails.clientA);
  const clientB = await signIn(emails.clientB);

  const invalidMeal = await clientA.from("meal_entries").insert({
    client_id: profiles.clientA.id,
    meal_name: "Smoke Phase 8 invalid",
    calories: 99999,
    protein: 35,
    carbs: 45,
    fat: 12
  });
  await expectRejected(invalidMeal, "La base doit refuser des calories incoherentes");

  const mealA = await clientA.from("meal_entries").insert({
    client_id: profiles.clientA.id,
    meal_name: marker,
    description: "Controle RLS client A",
    calories: 420,
    protein: 35,
    carbs: 45,
    fat: 12
  }).select("id").single();
  if (mealA.error) throw mealA.error;

  await expectRows(await coachA.from("meal_entries").select("id").eq("id", mealA.data.id), 1, "Coach rattache doit lire le repas");
  await expectNoRows(await coachB.from("meal_entries").select("id").eq("id", mealA.data.id), "Coach non rattache ne doit pas lire le repas");
  await expectNoRows(await clientB.from("meal_entries").select("id").eq("id", mealA.data.id), "Client B ne doit pas lire le repas de client A");
  await expectNoRows(await clientB.from("meal_entries").update({ calories: 1 }).eq("id", mealA.data.id).select("id"), "Client B ne doit pas modifier le repas de client A");
  await expectNoRows(await clientB.from("meal_entries").delete().eq("id", mealA.data.id).select("id"), "Client B ne doit pas supprimer le repas de client A");

  await expectRejected(
    await clientA.from("hydration_entries").insert({ client_id: profiles.clientA.id, liters: 9, note: marker }),
    "La base doit refuser une hydratation incoherente"
  );

  const hydrationA = await clientA.from("hydration_entries").insert({
    client_id: profiles.clientA.id,
    liters: 0.5,
    note: marker
  }).select("id").single();
  if (hydrationA.error) throw hydrationA.error;

  await expectNoRows(await clientB.from("hydration_entries").select("id").eq("id", hydrationA.data.id), "Client B ne doit pas lire l'hydratation de client A");
  await expectNoRows(await clientB.from("hydration_entries").update({ liters: 0.1 }).eq("id", hydrationA.data.id).select("id"), "Client B ne doit pas modifier l'hydratation de client A");
  await expectNoRows(await clientB.from("hydration_entries").delete().eq("id", hydrationA.data.id).select("id"), "Client B ne doit pas supprimer l'hydratation de client A");

  const draftCheckin = await clientA.from("weekly_checkins").insert({
    client_id: profiles.clientA.id,
    week_start: weekStart,
    status: "draft",
    energy: 7,
    stress: 3,
    sleep_hours: 7.5,
    average_hydration: 2.3,
    training_rpe: 6,
    nutrition_adherence: 8
  }).select("id, status, submitted_at").single();
  if (draftCheckin.error) throw draftCheckin.error;

  await expectRejected(await clientA.from("weekly_checkins").insert({ client_id: profiles.clientA.id, week_start: "2099-02-09", status: "locked" }), "Client A ne doit pas creer directement un bilan locked");
  await expectRejected(await clientA.from("weekly_checkins").insert({ client_id: profiles.clientA.id, week_start: "2099-02-16", status: "draft", viewed_at: new Date().toISOString() }), "Client A ne doit pas definir viewed_at");
  await expectNoRows(await clientB.from("weekly_checkins").select("id").eq("id", draftCheckin.data.id), "Client B ne doit pas lire le bilan de client A");

  const journal = await clientA.from("weekly_private_journals").insert({
    client_id: profiles.clientA.id,
    week_start: weekStart,
    body: "Journal intime non partage",
    visible_to_coach: false
  }).select("id").single();
  if (journal.error) throw journal.error;
  await expectNoRows(await coachA.from("weekly_private_journals").select("id").eq("id", journal.data.id), "Coach rattache ne doit pas lire le journal prive par defaut");

  const sharedJournal = await clientA.from("weekly_private_journals").update({ visible_to_coach: true }).eq("id", journal.data.id).select("id").single();
  if (sharedJournal.error) throw sharedJournal.error;
  await expectRows(await coachA.from("weekly_private_journals").select("id").eq("id", journal.data.id), 1, "Coach rattache doit lire le journal apres consentement explicite");

  const revokedJournal = await clientA.from("weekly_private_journals").update({ visible_to_coach: false }).eq("id", journal.data.id).select("id").single();
  if (revokedJournal.error) throw revokedJournal.error;
  await expectNoRows(await coachA.from("weekly_private_journals").select("id").eq("id", journal.data.id), "Le journal doit disparaitre si le client retire son autorisation");

  const submitted = await clientA.from("weekly_checkins")
    .update({ status: "submitted", weekly_win: "Smoke Phase 8 submission" })
    .eq("id", draftCheckin.data.id)
    .select("id, status, submitted_at")
    .single();
  if (submitted.error) throw submitted.error;
  await expect(submitted.data.status === "submitted" && Boolean(submitted.data.submitted_at), "submitted_at doit etre renseigne lors de la transmission");
  await expectNoRows(await clientA.from("weekly_checkins").update({ energy: 3 }).eq("id", draftCheckin.data.id).select("id"), "Client A ne doit plus modifier son bilan apres transmission");

  await expectRows(await coachA.from("weekly_checkins").select("id").eq("id", draftCheckin.data.id), 1, "Coach rattache doit lire le bilan autorise");
  await expectNoRows(await coachB.from("weekly_checkins").select("id").eq("id", draftCheckin.data.id), "Coach non rattache ne doit pas lire le bilan");

  const viewed = await coachA.from("weekly_checkins").update({ viewed_at: new Date().toISOString() }).eq("id", draftCheckin.data.id).select("id, viewed_at").single();
  if (viewed.error) throw viewed.error;
  await expect(Boolean(viewed.data.viewed_at), "Coach rattache doit pouvoir marquer le bilan consulte");
  const locked = await coachA.from("weekly_checkins").update({ status: "locked" }).eq("id", draftCheckin.data.id).select("id, status").single();
  if (locked.error) throw locked.error;
  await expect(locked.data.status === "locked", "Coach rattache doit pouvoir verrouiller le bilan");

  const draftCheckinB = await clientB.from("weekly_checkins").insert({
    client_id: profiles.clientB.id,
    week_start,
    status: "draft",
    energy: 6,
    stress: 4,
    sleep_hours: 7,
    average_hydration: 2.1,
    training_rpe: 7,
    nutrition_adherence: 7
  }).select("id").single();
  if (draftCheckinB.error) throw draftCheckinB.error;

  await expectRejected(
    await clientA.storage.from("reboot-weekly-photos").upload(
      `${profiles.clientB.id}/${draftCheckinB.data.id}/forbidden.png`,
      new Blob(["fake"], { type: "image/png" }),
      { contentType: "image/png", upsert: false }
    ),
    "Client A ne doit pas televerser dans le dossier Storage de client B"
  );

  const clientBPhotoPath = `${profiles.clientB.id}/${draftCheckinB.data.id}/owner.png`;
  const clientBPhoto = await clientB.storage.from("reboot-weekly-photos").upload(
    clientBPhotoPath,
    new Blob(["fake"], { type: "image/png" }),
    { contentType: "image/png", upsert: false }
  );
  if (clientBPhoto.error) throw clientBPhoto.error;
  photoPaths.push(clientBPhotoPath);

  await expectRejected(await clientA.storage.from("reboot-weekly-photos").download(clientBPhotoPath), "Client A ne doit pas lire une photo de client B");
  const relatedCoachPhoto = await coachA.storage.from("reboot-weekly-photos").download(clientBPhotoPath);
  if (relatedCoachPhoto.error) throw relatedCoachPhoto.error;
  await expectRejected(await coachB.storage.from("reboot-weekly-photos").download(clientBPhotoPath), "Coach non rattache ne doit pas lire la photo");
  await expectRejected(await coachA.storage.from("reboot-weekly-photos").remove([clientBPhotoPath]), "Coach rattache est en lecture seule sur les photos");

  const submittedB = await clientB.from("weekly_checkins").update({ status: "submitted" }).eq("id", draftCheckinB.data.id).select("id").single();
  if (submittedB.error) throw submittedB.error;
  await expectRejected(
    await clientB.storage.from("reboot-weekly-photos").upload(
      clientBPhotoPath,
      new Blob(["replace"], { type: "image/png" }),
      { contentType: "image/png", upsert: true }
    ),
    "Client B ne doit pas remplacer une photo apres transmission"
  );
  await expectRejected(await clientB.storage.from("reboot-weekly-photos").remove([clientBPhotoPath]), "Client B ne doit pas supprimer une photo apres transmission");

  const postA = await clientA.from("tribe_posts").insert({
    coach_id: profiles.coachA.id,
    client_id: profiles.clientA.id,
    author_id: profiles.clientA.id,
    author_role: "client",
    kind: "client_post",
    body: `${marker} client A`
  }).select("id").single();
  if (postA.error) throw postA.error;

  await expectNoRows(await clientB.from("tribe_posts").update({ body: "Tentative client B" }).eq("id", postA.data.id).select("id"), "Client B ne doit pas modifier le post de client A");
  await expectNoRows(await clientB.from("tribe_posts").delete().eq("id", postA.data.id).select("id"), "Client B ne doit pas supprimer le post de client A");
  await expectNoRows(await coachB.from("tribe_posts").select("id").eq("id", postA.data.id), "Coach non rattache ne doit pas lire le post de client A");
  await expectNoRows(
    await coachB.from("tribe_posts").update({ status: "archived", archived_by: profiles.coachB.id, archived_at: new Date().toISOString() }).eq("id", postA.data.id).select("id"),
    "Coach non rattache ne doit pas moderer le post de client A"
  );

  const moderated = await coachA.from("tribe_posts").update({
    status: "archived",
    archived_by: profiles.coachA.id,
    archived_at: new Date().toISOString()
  }).eq("id", postA.data.id).select("id, status").single();
  if (moderated.error) throw moderated.error;
  await expect(moderated.data.status === "archived", "Coach rattache doit archiver selon les regles");

  const temporaryRelation = await admin.from("coach_client_relations").insert({
    coach_id: profiles.coachB.id,
    client_id: profiles.clientA.id
  });
  if (temporaryRelation.error) throw temporaryRelation.error;
  await expectRows(await coachB.from("meal_entries").select("id").eq("id", mealA.data.id), 1, "Coach temporairement rattache doit lire les donnees autorisees");
  await admin.from("coach_client_relations").delete().eq("coach_id", profiles.coachB.id).eq("client_id", profiles.clientA.id);
  await expectNoRows(await coachB.from("meal_entries").select("id").eq("id", mealA.data.id), "Coach dont le rattachement temporaire est supprime doit perdre l'acces");

  console.log("Smoke test Phase 8 Client Tracking RLS OK");
} finally {
  await cleanupTempData();
}
