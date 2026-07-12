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

function makeClient() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function signIn(email) {
  const client = makeClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function getProfile(client, email) {
  const { data, error } = await client.from("profiles").select("id, role, email").eq("email", email).single();
  if (error) throw error;
  return data;
}

async function waitForSubscribed(channel) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Realtime subscription timeout")), 10000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      }
      if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        clearTimeout(timer);
        reject(new Error(`Realtime subscription failed: ${status}`));
      }
    });
  });
}

function waitForEvent(ms = 10000) {
  let resolveEvent;
  const promise = new Promise((resolve, reject) => {
    resolveEvent = resolve;
    setTimeout(() => reject(new Error("Realtime event timeout")), ms);
  });
  return { promise, resolveEvent };
}

const coach = await signIn(emails.coach);
const lossClient = await signIn(emails.lossClient);
const massClient = await signIn(emails.massClient);
const lossProfile = await getProfile(lossClient, emails.lossClient);
const massProfile = await getProfile(massClient, emails.massClient);

const current = await coach.from("nutrition_targets").select("*").eq("client_id", lossProfile.id).single();
if (current.error) throw current.error;

const nextCalories = Number(current.data.calories) === 1991 ? 1990 : 1991;
const nutritionEvent = waitForEvent();
const workoutEvent = waitForEvent();
const notificationEvent = waitForEvent();
const messageEvent = waitForEvent();
const lossChannel = lossClient
  .channel(`realtime-smoke-loss-${Date.now()}`)
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "nutrition_targets", filter: `client_id=eq.${lossProfile.id}` },
    (payload) => nutritionEvent.resolveEvent(payload)
  )
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "workouts", filter: `client_id=eq.${lossProfile.id}` },
    (payload) => workoutEvent.resolveEvent(payload)
  )
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "notifications", filter: `client_id=eq.${lossProfile.id}` },
    (payload) => notificationEvent.resolveEvent(payload)
  )
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${lossProfile.id}` },
    (payload) => messageEvent.resolveEvent(payload)
  );
await waitForSubscribed(lossChannel);

const forbiddenChannel = massClient.channel(`realtime-smoke-forbidden-${Date.now()}`);
let forbiddenReceived = false;
await waitForSubscribed(
  forbiddenChannel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "nutrition_targets", filter: `client_id=eq.${lossProfile.id}` },
    () => {
      forbiddenReceived = true;
    }
  )
);

const update = await coach
  .from("nutrition_targets")
  .update({ calories: nextCalories, updated_at: new Date().toISOString() })
  .eq("client_id", lossProfile.id);
if (update.error) throw update.error;

const nutritionPayload = await nutritionEvent.promise;
if (nutritionPayload.new.client_id !== lossProfile.id || Number(nutritionPayload.new.calories) !== nextCalories) {
  throw new Error("Le client n'a pas recu la bonne modification nutrition en temps reel");
}

const workoutTitle = `Realtime seance ${Date.now()}`;
const workout = await coach.from("workouts").insert({
  coach_id: (await getProfile(coach, emails.coach)).id,
  client_id: lossProfile.id,
  title: workoutTitle,
  focus: "realtime",
  scheduled_for: new Date().toISOString().slice(0, 10),
  duration_minutes: 30,
  exercises: ["Test realtime"],
  notes: "Smoke test",
  status: "planned"
});
if (workout.error) throw workout.error;
const workoutPayload = await workoutEvent.promise;
if (workoutPayload.new.title !== workoutTitle) throw new Error("La seance attribuee n'est pas arrivee en temps reel");

const notificationTitle = `Realtime notification ${Date.now()}`;
const notification = await coach.from("notifications").insert({
  coach_id: (await getProfile(coach, emails.coach)).id,
  client_id: lossProfile.id,
  level: "information",
  title: notificationTitle,
  status: "unread"
});
if (notification.error) throw notification.error;
const notificationPayload = await notificationEvent.promise;
if (notificationPayload.new.title !== notificationTitle) throw new Error("La notification n'est pas arrivee en temps reel");

const messageBody = `Realtime message ${Date.now()}`;
const message = await coach.from("messages").insert({
  sender_id: (await getProfile(coach, emails.coach)).id,
  recipient_id: lossProfile.id,
  body: messageBody
});
if (message.error) throw message.error;
const messagePayload = await messageEvent.promise;
if (messagePayload.new.body !== messageBody) throw new Error("Le message n'est pas arrive en temps reel");

await new Promise((resolve) => setTimeout(resolve, 2500));
if (forbiddenReceived) {
  throw new Error("RLS Realtime attendu: un autre client ne doit pas recevoir l'evenement nutrition");
}

await lossClient.removeChannel(lossChannel);
await massClient.removeChannel(forbiddenChannel);
await coach.auth.signOut();
await lossClient.auth.signOut();
await massClient.auth.signOut();

console.log(`Smoke test Supabase Realtime OK: nutrition, seance, notification, message; ${massProfile.email} isole.`);
process.exit(0);
