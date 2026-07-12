import { createClient } from "@supabase/supabase-js";
import "./load-env.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD;

if (!url || !serviceRole || !password) {
  console.error("Variables requises: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DEMO_PASSWORD ou SEED_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const avatar = "/avatars/default.svg";
const coachAccount = {
  email: "coach@milo.reboot",
  role: "coach",
  firstName: "Milo",
  lastName: "Coach",
  objective: "coaching premium"
};

const clientAccounts = [
  {
    email: "client1@milo.reboot",
    firstName: "Lucas",
    lastName: "Masse",
    objective: "prise de masse",
    assessment: {
      age: 24,
      sex: "homme",
      height_cm: 181,
      weight_kg: 76,
      body_fat_percent: 14,
      level: "intermediaire",
      formula: "masse",
      goal: "prise de masse",
      sport: "musculation",
      activity_hours: 5,
      physical_job: false,
      injuries: [],
      pain: [],
      food_preferences: ["budget", "rapide"],
      allergies: [],
      restrictions: [],
      calories: 3150,
      protein: 165,
      carbs: 405,
      fat: 85
    },
    nutrition: { calories: 3150, protein: 165, carbs: 405, fat: 85, water_liters: 3 },
    status: "progression forte",
    notification: "Lucas progresse vite sur les charges.",
    message: "Objectif de la semaine : ajouter une repetition propre sur les mouvements principaux.",
    measurements: [
      { daysAgo: 21, weight_kg: 73.8, body_fat_percent: 14.5, waist_cm: 79, chest_cm: 100 },
      { daysAgo: 7, weight_kg: 75.1, body_fat_percent: 14.2, waist_cm: 79, chest_cm: 102 },
      { daysAgo: 0, weight_kg: 76, body_fat_percent: 14, waist_cm: 80, chest_cm: 103 }
    ],
    workouts: [
      { title: "Push hypertrophie", focus: "pectoraux epaules triceps", offset: 1, duration: 65, status: "planned", exercises: ["Developpe couche", "Developpe incline", "Dips", "Elevations laterales"] },
      { title: "Pull progression", focus: "dos biceps", offset: 3, duration: 60, status: "planned", exercises: ["Tractions", "Rowing barre", "Tirage vertical", "Curl incline"] },
      { title: "Jambes force", focus: "squat et chaine posterieure", offset: -2, duration: 70, status: "completed", exercises: ["Squat", "Presse", "Souleve roumain", "Mollets"] }
    ]
  },
  {
    email: "client2@milo.reboot",
    firstName: "Emma",
    lastName: "Perte",
    objective: "perte de poids",
    assessment: {
      age: 31,
      sex: "femme",
      height_cm: 166,
      weight_kg: 72,
      body_fat_percent: 32,
      level: "debutant",
      formula: "perte",
      goal: "perte de poids",
      sport: "musculation",
      activity_hours: 3,
      physical_job: false,
      injuries: ["cheville droite"],
      pain: ["cheville"],
      food_preferences: ["simple", "rapide"],
      allergies: [],
      restrictions: [],
      calories: 1780,
      protein: 135,
      carbs: 165,
      fat: 58
    },
    nutrition: { calories: 1780, protein: 135, carbs: 165, fat: 58, water_liters: 2.4 },
    status: "alerte douleur",
    notification: "Emma signale une douleur cheville et doit adapter le cardio.",
    message: "On garde le cap, mais on remplace les impacts par du velo cette semaine.",
    measurements: [
      { daysAgo: 21, weight_kg: 74.4, body_fat_percent: 33, waist_cm: 86, hip_cm: 104 },
      { daysAgo: 7, weight_kg: 72.8, body_fat_percent: 32.3, waist_cm: 84, hip_cm: 103 },
      { daysAgo: 0, weight_kg: 72, body_fat_percent: 32, waist_cm: 83, hip_cm: 102 }
    ],
    workouts: [
      { title: "Full body sans impact", focus: "perte de poids et articulation", offset: 1, duration: 45, status: "planned", exercises: ["Goblet squat", "Rowing haltères", "Hip thrust", "Velo zone 2"] },
      { title: "Mobilite cheville", focus: "recuperation active", offset: 2, duration: 25, status: "planned", exercises: ["Mobilite cheville", "Gainage", "Respiration"] },
      { title: "Circuit controle", focus: "depense calorique", offset: -1, duration: 40, status: "completed", exercises: ["Presse", "Tirage", "Pompes inclinees", "Marche inclinee"] }
    ]
  },
  {
    email: "client3@milo.reboot",
    firstName: "Noah",
    lastName: "Performance",
    objective: "performance",
    assessment: {
      age: 28,
      sex: "homme",
      height_cm: 178,
      weight_kg: 80,
      body_fat_percent: 16,
      level: "avance",
      formula: "maintien",
      goal: "performance",
      sport: "sports de combat",
      activity_hours: 7,
      physical_job: true,
      injuries: ["epaule gauche ancienne"],
      pain: [],
      food_preferences: ["meal prep"],
      allergies: [],
      restrictions: [],
      calories: 2920,
      protein: 175,
      carbs: 350,
      fat: 88
    },
    nutrition: { calories: 2920, protein: 175, carbs: 350, fat: 88, water_liters: 3.2 },
    status: "performance combat",
    notification: "Noah a une semaine intensive, surveiller recuperation et sommeil.",
    message: "Priorite : qualite des rounds, pas plus de volume inutile cette semaine.",
    measurements: [
      { daysAgo: 21, weight_kg: 80.5, body_fat_percent: 16.4, waist_cm: 82, chest_cm: 105 },
      { daysAgo: 7, weight_kg: 80.1, body_fat_percent: 16.1, waist_cm: 81, chest_cm: 106 },
      { daysAgo: 0, weight_kg: 80, body_fat_percent: 16, waist_cm: 81, chest_cm: 106 }
    ],
    workouts: [
      { title: "Puissance bas du corps", focus: "explosivite", offset: 1, duration: 50, status: "planned", exercises: ["Trap bar jump", "Front squat", "Fentes explosives", "Sled push"] },
      { title: "Conditioning combat", focus: "intervalles", offset: 3, duration: 35, status: "planned", exercises: ["Assault bike", "Shadow boxing", "Med ball slam", "Core anti-rotation"] },
      { title: "Sparring technique", focus: "qualite", offset: -2, duration: 75, status: "completed", exercises: ["Rounds techniques", "Defense", "Retour au calme"] }
    ]
  },
  {
    email: "client4@milo.reboot",
    firstName: "Sarah",
    lastName: "Maintien",
    objective: "maintien",
    assessment: {
      age: 42,
      sex: "femme",
      height_cm: 170,
      weight_kg: 64,
      body_fat_percent: 24,
      level: "intermediaire",
      formula: "maintien",
      goal: "maintien",
      sport: "fitness",
      activity_hours: 4,
      physical_job: false,
      injuries: [],
      pain: ["fatigue lombaire legere"],
      food_preferences: ["vegetarien"],
      allergies: ["lactose"],
      restrictions: ["vegetarien"],
      calories: 2050,
      protein: 125,
      carbs: 240,
      fat: 68
    },
    nutrition: { calories: 2050, protein: 125, carbs: 240, fat: 68, water_liters: 2.2 },
    status: "maintien stable",
    notification: "Sarah est reguliere, proposer un defi mobilite.",
    message: "Tres bonne regularite. Cette semaine, on garde 3 seances et un focus sommeil.",
    measurements: [
      { daysAgo: 21, weight_kg: 64.2, body_fat_percent: 24.2, waist_cm: 75, hip_cm: 96 },
      { daysAgo: 7, weight_kg: 64.1, body_fat_percent: 24.1, waist_cm: 75, hip_cm: 96 },
      { daysAgo: 0, weight_kg: 64, body_fat_percent: 24, waist_cm: 74, hip_cm: 96 }
    ],
    workouts: [
      { title: "Renfo maintien", focus: "tonus general", offset: 1, duration: 50, status: "planned", exercises: ["Split squat", "Developpe haltères", "Rowing cable", "Gainage"] },
      { title: "Mobilite dos", focus: "lombaires", offset: 2, duration: 30, status: "planned", exercises: ["Cat cow", "Dead bug", "Bird dog", "Etirements hanches"] },
      { title: "Cardio plaisir", focus: "regularite", offset: -3, duration: 35, status: "completed", exercises: ["Velo", "Marche rapide", "Respiration"] }
    ]
  }
];

const coach = await upsertAuthProfile(coachAccount);
const clients = [];

for (const account of clientAccounts) {
  const client = await upsertAuthProfile({ ...account, role: "client" });
  clients.push({ user: client, account });
  await throwIfError(supabase.from("coach_client_relations").upsert({
    coach_id: coach.id,
    client_id: client.id
  }));
}

await seedRecipes(coach.id);

for (const item of clients) {
  await seedClientDashboard(coach.id, item.user.id, item.account);
}

await seedCoachContent(coach.id, clients);
await seedAiDemo(coach.id, clients);

console.log("Seed demo Supabase OK");
console.log("Comptes demo prets: coach@milo.reboot, client1@milo.reboot, client2@milo.reboot, client3@milo.reboot, client4@milo.reboot");

async function upsertAuthProfile(account) {
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let user = existingUsers.users.find((item) => item.email === account.email);

  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: account.firstName,
        last_name: account.lastName
      }
    });
    if (created.error || !created.data.user) throw created.error || new Error(`Utilisateur non cree: ${account.email}`);
    user = created.data.user;
  } else {
    const updated = await supabase.auth.admin.updateUserById(user.id, {
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: account.firstName,
        last_name: account.lastName
      }
    });
    if (updated.error) throw updated.error;
  }

  await throwIfError(supabase.rpc("service_upsert_profile", {
    p_id: user.id,
    p_role: account.role,
    p_first_name: account.firstName,
    p_last_name: account.lastName,
    p_email: account.email,
    p_avatar_url: avatar,
    p_objective: account.objective
  }));

  return user;
}

async function seedClientDashboard(coachId, clientId, account) {
  await throwIfError(supabase.from("client_assessments").upsert({
    client_id: clientId,
    ...account.assessment,
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" }));

  await throwIfError(supabase.from("nutrition_targets").upsert({
    client_id: clientId,
    ...account.nutrition,
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" }));

  await throwIfError(supabase.from("measurements").delete().eq("client_id", clientId));
  await throwIfError(supabase.from("workouts").delete().eq("client_id", clientId));
  await throwIfError(supabase.from("notifications").delete().eq("client_id", clientId));
  await throwIfError(supabase.from("messages").delete().or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`));

  for (const measurement of account.measurements) {
    const { daysAgo, ...payload } = measurement;
    await throwIfError(supabase.from("measurements").insert({
      client_id: clientId,
      measured_at: dateOffset(-daysAgo),
      ...payload
    }));
  }

  for (const workout of account.workouts) {
    await throwIfError(supabase.from("workouts").insert({
      coach_id: coachId,
      client_id: clientId,
      title: workout.title,
      focus: workout.focus,
      scheduled_for: dateOffset(workout.offset),
      duration_minutes: workout.duration,
      exercises: workout.exercises,
      notes: `Demo ${account.objective} - ${account.status}`,
      status: workout.status,
      completed_at: workout.status === "completed" ? new Date().toISOString() : null,
      feedback: workout.status === "completed" ? { energy: 8, adherence: "bonne" } : {}
    }));
  }

  await throwIfError(supabase.from("notifications").insert({
    coach_id: coachId,
    client_id: clientId,
    level: account.objective === "perte de poids" ? "attention" : "information",
    title: account.notification,
    status: "unread"
  }));

  await throwIfError(supabase.from("messages").insert([
    {
      sender_id: coachId,
      recipient_id: clientId,
      body: account.message
    },
    {
      sender_id: clientId,
      recipient_id: coachId,
      body: `Bien recu Milo. Objectif actuel: ${account.objective}.`
    }
  ]));

  await throwIfError(supabase.from("audit_logs").insert({
    actor_id: coachId,
    client_id: clientId,
    action: "demo.client.seeded",
    summary: `Dashboard demo ${account.objective}`,
    after_data: {
      objective: account.objective,
      status: account.status,
      progression_photos: [
        `/demo/progress/${account.email}-front.jpg`,
        `/demo/progress/${account.email}-side.jpg`
      ]
    }
  }));
}

async function seedRecipes(coachId) {
  const recipes = [
    {
      name: "Pasta poulet prise de masse",
      description: "Repas dense pour soutenir la progression musculaire.",
      objective: "prise de masse",
      formulas: ["masse"],
      goals: ["prise de masse"],
      calories: 860,
      protein: 55,
      carbs: 98,
      fat: 24,
      allergens: ["gluten"],
      diet_tags: ["riche en proteines"],
      sports: ["musculation"],
      preference_tags: ["budget"],
      image_alt: "Assiette de pasta poulet",
      coach_tip: "Ideal apres une seance lourde."
    },
    {
      name: "Bowl saumon perte de poids",
      description: "Assiette rassasiante et controlee en calories.",
      objective: "perte de poids",
      formulas: ["perte"],
      goals: ["perte de poids"],
      calories: 520,
      protein: 42,
      carbs: 45,
      fat: 18,
      allergens: [],
      diet_tags: ["omega 3"],
      sports: ["fitness", "musculation"],
      preference_tags: ["simple"],
      image_alt: "Bowl saumon legumes",
      coach_tip: "Garder la sauce a part."
    },
    {
      name: "Riz combat performance",
      description: "Carburant digeste avant entrainement intense.",
      objective: "performance",
      formulas: ["maintien"],
      goals: ["performance"],
      calories: 690,
      protein: 44,
      carbs: 92,
      fat: 16,
      allergens: [],
      diet_tags: ["digeste"],
      sports: ["sports de combat"],
      preference_tags: ["meal prep"],
      image_alt: "Bol riz dinde performance",
      coach_tip: "A placer 2 a 3 h avant les rounds."
    },
    {
      name: "Curry tofu maintien",
      description: "Option vegetarienne stable et riche en fibres.",
      objective: "maintien",
      formulas: ["maintien"],
      goals: ["maintien"],
      calories: 610,
      protein: 34,
      carbs: 68,
      fat: 22,
      allergens: [],
      diet_tags: ["vegetarien", "sans lactose"],
      sports: ["fitness"],
      preference_tags: ["vegetarien"],
      image_alt: "Curry tofu legumes",
      coach_tip: "Ajouter une portion de riz les jours actifs."
    }
  ];

  for (const recipe of recipes) {
    const { data: existing, error } = await supabase
      .from("recipes")
      .select("id")
      .eq("coach_id", coachId)
      .eq("name", recipe.name)
      .maybeSingle();
    if (error) throw error;

    const payload = {
      coach_id: coachId,
      portions: 1,
      prep_minutes: 12,
      cook_minutes: 18,
      difficulty: "facile",
      min_age: 16,
      max_age: 90,
      min_protein: recipe.protein,
      compatible_with_loss_plan: recipe.objective === "perte de poids",
      max_calories_for_loss: recipe.objective === "perte de poids" ? recipe.calories : null,
      ...recipe
    };

    let recipeId = existing?.id;
    if (recipeId) {
      await throwIfError(supabase.from("recipes").update(payload).eq("id", recipeId));
    } else {
      const inserted = await supabase.from("recipes").insert(payload).select("id").single();
      if (inserted.error || !inserted.data) throw inserted.error || new Error("Recette non creee");
      recipeId = inserted.data.id;
    }

    await throwIfError(supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId));
    await throwIfError(supabase.from("recipe_steps").delete().eq("recipe_id", recipeId));
    await throwIfError(supabase.from("recipe_ingredients").insert([
      { recipe_id: recipeId, name: "Source de proteines", quantity: `${recipe.protein} g proteines`, position: 1 },
      { recipe_id: recipeId, name: "Glucides adaptes", quantity: `${recipe.carbs} g glucides`, position: 2 },
      { recipe_id: recipeId, name: "Bonnes graisses", quantity: `${recipe.fat} g lipides`, position: 3 }
    ]));
    await throwIfError(supabase.from("recipe_steps").insert([
      { recipe_id: recipeId, body: "Preparer les ingredients et peser les portions.", position: 1 },
      { recipe_id: recipeId, body: "Cuire la base puis ajouter la source de proteines.", position: 2 },
      { recipe_id: recipeId, body: "Assembler et ajuster l'assaisonnement.", position: 3 }
    ]));
  }
}

async function seedCoachContent(coachId, clients) {
  await throwIfError(supabase.from("contents").delete().eq("coach_id", coachId).like("title", "Demo %"));

  const contents = [
    {
      type: "program",
      title: "Demo programme prise de masse",
      status: "published",
      body: "Programme hypertrophie 4 jours avec surcharge progressive.",
      target: { mode: "profile", formulas: ["masse"], goals: ["prise de masse"] }
    },
    {
      type: "program",
      title: "Demo programme perte de poids",
      status: "published",
      body: "Programme full body + cardio sans impact.",
      target: { mode: "profile", formulas: ["perte"], goals: ["perte de poids"] }
    },
    {
      type: "revision_card",
      title: "Demo fiche performance combat",
      status: "published",
      body: "Priorites : sommeil, hydratation, intensite utile et recuperation.",
      target: { mode: "profile", goals: ["performance"], sports: ["sports de combat"] }
    },
    {
      type: "announcement",
      title: "Demo maintien et regularite",
      status: "published",
      body: "Objectif maintien : stabilite, plaisir et constance.",
      target: { mode: "profile", formulas: ["maintien"], goals: ["maintien"] }
    },
    {
      type: "deep_dive",
      title: "Demo photos de progression",
      status: "published",
      body: "Galerie fictive : front, side, back pour illustrer le suivi visuel.",
      target: { mode: "all" }
    }
  ];

  for (const content of contents) {
    const inserted = await supabase.from("contents").insert({
      coach_id: coachId,
      type: content.type,
      title: content.title,
      status: content.status,
      payload: {
        body: content.body,
        category: "demo",
        progress_photos: clients.map(({ account }) => `/demo/progress/${account.email}.jpg`)
      },
      publish_at: new Date().toISOString()
    }).select("id").single();
    if (inserted.error || !inserted.data) throw inserted.error || new Error("Contenu demo non cree");

    await throwIfError(supabase.from("publication_targets").insert({
      content_id: inserted.data.id,
      mode: content.target.mode,
      formulas: content.target.formulas || [],
      goals: content.target.goals || [],
      sports: content.target.sports || [],
      client_ids: [],
      sexes: [],
      levels: []
    }));
  }
}

async function seedAiDemo(coachId, clients) {
  for (const { user, account } of clients) {
    const analysis = await supabase.from("ai_analyses").insert({
      coach_id: coachId,
      client_id: user.id,
      scope: "single_client",
      mode: "demo",
      status: "completed",
      summary: `${account.firstName}: demo ${account.objective} pret.`,
      priority: account.objective === "perte de poids" ? "high" : "medium",
      data_used: { objective: account.objective, source: "seed-demo" },
      signals: [account.objective, account.status]
    }).select("id").single();
    if (analysis.error || !analysis.data) throw analysis.error || new Error("Analyse IA demo non creee");

    await throwIfError(supabase.from("ai_recommendations").insert({
      analysis_id: analysis.data.id,
      coach_id: coachId,
      client_id: user.id,
      type: "message",
      status: "pending",
      priority: account.objective === "perte de poids" ? "high" : "medium",
      confidence: 0.76,
      problem: `Suivi demo ${account.objective}`,
      current_state: { status: account.status },
      proposed_change: { message: account.message },
      justification: "Proposition preparee pour la demonstration coach.",
      expected_benefit: "Montrer la validation coach obligatoire avant action visible.",
      risks: [],
      requires_client_visibility: true
    }));
  }
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function throwIfError(query) {
  const { error } = await query;
  if (error) throw error;
}
