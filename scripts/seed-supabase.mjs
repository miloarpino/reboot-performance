import { createClient } from "@supabase/supabase-js";
import "./load-env.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;

if (!url || !serviceRole || !password) {
  console.error("Variables requises: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et SEED_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const accounts = {
  coach: { email: "coach.milo@reboot.test", role: "coach", firstName: "Milo", lastName: "Arpino" },
  lossClient: { email: "cliente.perte@reboot.test", role: "client", firstName: "Lea", lastName: "Moreau" },
  massClient: { email: "client.masse@reboot.test", role: "client", firstName: "Hugo", lastName: "Bernard" }
};

async function upsertUser(account) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: account.firstName,
      last_name: account.lastName
    }
  });

  if (error && !error.message.toLowerCase().includes("already")) throw error;

  let user = created?.user;
  if (!user) {
    const { data } = await supabase.auth.admin.listUsers();
    user = data.users.find((item) => item.email === account.email);
  }
  if (!user) throw new Error(`Utilisateur introuvable: ${account.email}`);

  await throwIfError(supabase.from("profiles").delete().eq("id", user.id));

  await throwIfError(supabase.from("profiles").insert({
    id: user.id,
    role: account.role,
    first_name: account.firstName,
    last_name: account.lastName,
    email: account.email
  }));

  return user;
}

const coach = await upsertUser(accounts.coach);
const lossClient = await upsertUser(accounts.lossClient);
const massClient = await upsertUser(accounts.massClient);

for (const client of [lossClient, massClient]) {
  await throwIfError(supabase.from("coach_client_relations").upsert({
    coach_id: coach.id,
    client_id: client.id
  }));
}

await seedClient({
  client: lossClient,
  assessment: {
    age: 32,
    sex: "femme",
    height_cm: 166,
    weight_kg: 72,
    body_fat_percent: 31,
    level: "debutant",
    formula: "perte",
    goal: "perte de poids durable",
    sport: "musculation",
    activity_hours: 3,
    injuries: ["cheville droite"],
    pain: ["cheville"],
    food_preferences: ["rapide", "simple"],
    allergies: [],
    restrictions: [],
    calories: 1850,
    protein: 130,
    carbs: 175,
    fat: 58
  },
  nutrition: { calories: 1850, protein: 130, carbs: 175, fat: 58, water_liters: 2.3 }
});

await seedClient({
  client: massClient,
  assessment: {
    age: 27,
    sex: "homme",
    height_cm: 181,
    weight_kg: 78,
    body_fat_percent: 15,
    level: "intermediaire",
    formula: "masse",
    goal: "prise de masse propre",
    sport: "musculation",
    activity_hours: 5,
    injuries: [],
    pain: [],
    food_preferences: ["budget"],
    allergies: [],
    restrictions: [],
    calories: 3050,
    protein: 160,
    carbs: 390,
    fat: 85
  },
  nutrition: { calories: 3050, protein: 160, carbs: 390, fat: 85, water_liters: 2.8 }
});

await ensureRecipe({
  coach_id: coach.id,
  name: "Bowl poulet citron perte",
  description: "Recette compatible avec une phase de perte de poids.",
  objective: "perte de poids",
  formulas: ["perte"],
  goals: ["perte de poids durable"],
  calories: 520,
  protein: 46,
  carbs: 48,
  fat: 16,
  portions: 1,
  prep_minutes: 12,
  cook_minutes: 18,
  difficulty: "facile",
  allergens: [],
  diet_tags: ["sans gluten"],
  sports: ["general"],
  preference_tags: ["rapide"],
  image_alt: "Bowl poulet citron",
  coach_tip: "Garder une portion stable."
});

await ensureRecipe({
  coach_id: coach.id,
  name: "Pasta boeuf prise de masse",
  description: "Recette dense pour soutenir la prise de masse.",
  objective: "prise de masse",
  formulas: ["masse"],
  goals: ["prise de masse propre"],
  calories: 820,
  protein: 52,
  carbs: 92,
  fat: 26,
  portions: 1,
  prep_minutes: 10,
  cook_minutes: 20,
  difficulty: "facile",
  allergens: ["gluten"],
  diet_tags: ["riche en proteines"],
  sports: ["musculation"],
  preference_tags: ["budget"],
  image_alt: "Pasta boeuf",
  coach_tip: "Ajouter un fruit si la seance etait lourde."
});

await throwIfError(supabase.from("notifications").insert({
  coach_id: coach.id,
  client_id: lossClient.id,
  level: "information",
  title: "Compte de test perte de poids pret",
  status: "unread"
}));

await throwIfError(supabase.from("messages").insert({
  sender_id: coach.id,
  recipient_id: massClient.id,
  body: "Bienvenue Hugo, ton espace prise de masse est connecte a Supabase."
}));

console.log("Seed Supabase termine");
console.log("Comptes crees:");
console.log(`- Coach: ${accounts.coach.email}`);
console.log(`- Cliente perte: ${accounts.lossClient.email}`);
console.log(`- Client masse: ${accounts.massClient.email}`);

async function seedClient({ client, assessment, nutrition }) {
  await throwIfError(supabase.from("client_assessments").upsert({
    client_id: client.id,
    ...assessment
  }, { onConflict: "client_id" }));

  await throwIfError(supabase.from("nutrition_targets").upsert({
    client_id: client.id,
    ...nutrition
  }, { onConflict: "client_id" }));
}

async function ensureRecipe(recipe) {
  const existing = await supabase
    .from("recipes")
    .select("id")
    .eq("coach_id", recipe.coach_id)
    .eq("name", recipe.name)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    await throwIfError(supabase.from("recipes").update(recipe).eq("id", existing.data.id));
    return;
  }

  await throwIfError(supabase.from("recipes").insert(recipe));
}

async function throwIfError(query) {
  const { error } = await query;
  if (error) throw error;
}
