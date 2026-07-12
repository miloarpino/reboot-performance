export const demoCoach = {
  id: "coach-milo",
  role: "coach",
  firstName: "Milo",
  lastName: "Arpino",
  email: "coach@reboot.demo"
};

export const demoClients = [
  {
    id: "client-lucas",
    coachId: "coach-milo",
    role: "client",
    firstName: "Lucas",
    lastName: "Martin",
    email: "lucas@reboot.demo",
    age: 34,
    sex: "homme",
    formula: "perte",
    goal: "perte de poids",
    level: "debutant",
    sport: "musculation",
    activityHours: 3,
    injuries: ["genou droit"],
    pain: ["genou"],
    foodPreferences: ["rapide"],
    allergies: [],
    restrictions: [],
    assessmentUpdatedAt: "2026-07-09T08:30:00.000Z",
    nutrition: { calories: 2050, protein: 155, carbs: 205, fat: 58, waterLiters: 2.4 },
    checkins: [
      { date: "2026-07-03", weight: 86.1, energy: 5, stress: 7, sleepHours: 5.8, hydrationLiters: 1.5, pain: "genou apres squat", adherence: 62 },
      { date: "2026-07-10", weight: 86.0, energy: 4, stress: 8, sleepHours: 5.2, hydrationLiters: 1.4, pain: "genou encore sensible", adherence: 58 }
    ],
    heightCm: 178,
    weightKg: 86,
    bodyFatPercent: 24,
    assignedWorkouts: [
      {
        id: "assigned-lucas-1",
        title: "Full body controle genou",
        focus: "force technique",
        date: "2026-07-11",
        durationMinutes: 45,
        exercises: ["Presse amplitude controlee", "Developpe incline", "Rowing poulie", "Gainage"],
        notes: "Stopper si douleur genou superieure a 3/10.",
        status: "planned",
        createdAt: "2026-07-10T08:00:00.000Z",
        createdBy: "coach"
      }
    ],
    workouts: [{ id: "w-lucas-1", title: "Full body controle", completedAt: "2026-07-08", difficulty: 8, pain: "genou" }],
    badges: ["Premier pas"],
    lastSeenAt: "2026-07-08T19:00:00.000Z"
  },
  {
    id: "client-emma",
    coachId: "coach-milo",
    role: "client",
    firstName: "Emma",
    lastName: "Rossi",
    email: "emma@reboot.demo",
    age: 27,
    sex: "femme",
    formula: "masse",
    goal: "prise de masse",
    level: "intermediaire",
    sport: "sports de combat",
    activityHours: 6,
    injuries: [],
    pain: [],
    foodPreferences: ["vegetarien"],
    allergies: ["arachide"],
    restrictions: ["vegetarien"],
    assessmentUpdatedAt: "2026-07-10T07:15:00.000Z",
    nutrition: { calories: 2550, protein: 130, carbs: 330, fat: 72, waterLiters: 2.8 },
    checkins: [
      { date: "2026-07-03", weight: 61.8, energy: 8, stress: 4, sleepHours: 7.6, hydrationLiters: 2.6, pain: "", adherence: 91 },
      { date: "2026-07-10", weight: 62.3, energy: 8, stress: 3, sleepHours: 7.9, hydrationLiters: 2.9, pain: "", adherence: 94 }
    ],
    heightCm: 166,
    weightKg: 62.3,
    bodyFatPercent: 19,
    assignedWorkouts: [
      {
        id: "assigned-emma-1",
        title: "Puissance jambes combat",
        focus: "explosivite",
        date: "2026-07-11",
        durationMinutes: 50,
        exercises: ["Trap bar deadlift", "Fentes arriere", "Hip thrust", "Med ball slam"],
        notes: "Garder deux repetitions en reserve.",
        status: "planned",
        createdAt: "2026-07-10T08:00:00.000Z",
        createdBy: "coach"
      }
    ],
    workouts: [{ id: "w-emma-1", title: "Force bas du corps", completedAt: "2026-07-09", difficulty: 7, pain: "" }],
    badges: ["Premier pas", "Nutrition maitrisee"],
    lastSeenAt: "2026-07-10T08:45:00.000Z"
  },
  {
    id: "client-jeanne",
    coachId: "coach-milo",
    role: "client",
    firstName: "Jeanne",
    lastName: "Durand",
    email: "jeanne@reboot.demo",
    age: 68,
    sex: "femme",
    formula: "maintien",
    goal: "mobilite et maintien",
    level: "debutant",
    sport: "mobilite",
    activityHours: 2,
    injuries: ["epaule gauche"],
    pain: ["epaule"],
    foodPreferences: ["simple"],
    allergies: [],
    restrictions: [],
    assessmentUpdatedAt: "2026-07-06T17:20:00.000Z",
    nutrition: { calories: 1780, protein: 105, carbs: 190, fat: 58, waterLiters: 2.0 },
    checkins: [
      { date: "2026-07-03", weight: 69.5, energy: 6, stress: 5, sleepHours: 6.4, hydrationLiters: 1.8, pain: "epaule legere", adherence: 78 }
    ],
    heightCm: 162,
    weightKg: 69.5,
    bodyFatPercent: 28,
    assignedWorkouts: [],
    workouts: [],
    badges: ["Premier pas"],
    lastSeenAt: "2026-07-01T12:00:00.000Z"
  }
];

export const demoContents = [
  {
    id: "recipe-perte-bowl",
    type: "recipe",
    title: "Bowl poulet citron",
    status: "published",
    target: { mode: "profile", formulas: ["perte"], goals: ["perte de poids"] },
    payload: {
      description: "Assiette rassasiante, riche en proteines et facile a preparer.",
      calories: 520,
      protein: 46,
      carbs: 48,
      fat: 16,
      prepMinutes: 12,
      cookMinutes: 18,
      difficulty: "facile",
      ingredients: ["poulet", "riz complet", "courgette", "citron", "yaourt grec"],
      steps: ["Cuire le riz", "Saisir le poulet", "Ajouter les legumes", "Servir avec sauce citron"],
      coachTip: "Garder la sauce a part si le repas est prepare en avance."
    },
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  },
  {
    id: "library-sleep",
    type: "revision",
    title: "Sommeil et progression",
    status: "published",
    target: { mode: "profile", minAge: 18, maxAge: 80, levels: ["debutant", "intermediaire"] },
    payload: {
      summary: "Comprendre pourquoi dormir aide a recuperer, progresser et eviter les douleurs.",
      readingMinutes: 4,
      category: "recuperation"
    },
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  }
];

const svgImage = (title, accent = "#c99a55") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" role="img" aria-label="${title}">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f8efe1"/>
        <stop offset="1" stop-color="#d9c2a0"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#2b2116" flood-opacity="0.28"/>
      </filter>
    </defs>
    <rect width="900" height="620" fill="url(#bg)"/>
    <ellipse cx="450" cy="335" rx="285" ry="178" fill="#fffaf0" filter="url(#shadow)"/>
    <ellipse cx="450" cy="335" rx="210" ry="126" fill="#f2eadf"/>
    <circle cx="365" cy="302" r="58" fill="${accent}"/>
    <circle cx="485" cy="368" r="66" fill="#6f8f57"/>
    <circle cx="545" cy="292" r="46" fill="#f0d06b"/>
    <path d="M274 375 C360 425 530 432 630 362" fill="none" stroke="#8f5e35" stroke-width="32" stroke-linecap="round"/>
    <text x="450" y="86" text-anchor="middle" font-family="Inter, Arial" font-size="42" font-weight="700" fill="#2a2118">${title}</text>
    <text x="450" y="550" text-anchor="middle" font-family="Inter, Arial" font-size="26" fill="#6c5a45">Reboot Performance</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const baseSteps = [
  "Preparer et peser les ingredients.",
  "Cuire les elements principaux avec une cuisson douce.",
  "Assembler l'assiette sans masquer les sources de proteines.",
  "Ajouter l'assaisonnement et verifier les portions."
];

function recipe(id, name, formulas, goals, calories, protein, carbs, fat, options = {}) {
  const dietTags = options.dietTags || [];
  const allergens = options.allergens || [];
  return {
    id,
    name,
    description: options.description || `Recette ${goals.join(", ")} adaptee au plan ${formulas.join(", ")}.`,
    objective: goals[0] || formulas[0],
    formulas,
    goals,
    calories,
    protein,
    carbs,
    fat,
    portions: options.portions || 1,
    ingredients: options.ingredients || [
      { name: options.main || "source proteinee", quantity: "150 g" },
      { name: options.carb || "legumes", quantity: "180 g" },
      { name: options.fat || "huile d'olive", quantity: "8 g" }
    ],
    steps: options.steps || baseSteps,
    prepMinutes: options.prepMinutes || 12,
    cookMinutes: options.cookMinutes || 18,
    difficulty: options.difficulty || "facile",
    allergens,
    dietTags,
    variants: options.variants || ["Version plus proteinee", "Version meal prep"],
    substitutions: options.substitutions || ["Remplacer la source de glucides selon tolerance digestive"],
    coachTip: options.coachTip || "Garder une portion stable pour faciliter le suivi.",
    imageUrl: options.imageUrl || svgImage(name, options.accent),
    imageAlt: `${name} servi en assiette complete`,
    sports: options.sports || ["general"],
    preferenceTags: options.preferenceTags || ["simple"],
    minAge: options.minAge || 16,
    maxAge: options.maxAge || 90,
    compatibleWithLossPlan: Boolean(options.compatibleWithLossPlan),
    maxCaloriesForLoss: options.maxCaloriesForLoss || 620,
    minProtein: options.minProtein || 0
  };
}

const lossRecipes = [
  ["loss-01", "Bowl poulet citron deficit", "poulet", 510, 46, 47, 14],
  ["loss-02", "Cabillaud riz vert", "cabillaud", 455, 42, 44, 10],
  ["loss-03", "Omelette blanche epinards", "oeufs", 390, 35, 22, 16],
  ["loss-04", "Dinde patate douce", "dinde", 520, 48, 55, 12],
  ["loss-05", "Crevettes quinoa croquant", "crevettes", 498, 41, 50, 13],
  ["loss-06", "Skyr fruits rouges avoine", "skyr", 365, 32, 42, 6],
  ["loss-07", "Salade thon haricots verts", "thon", 430, 44, 28, 14],
  ["loss-08", "Poulet courgettes tomate", "poulet", 410, 45, 24, 12],
  ["loss-09", "Boeuf maigre wok legumes", "boeuf maigre", 540, 43, 45, 18],
  ["loss-10", "Saumon leger concombre", "saumon", 560, 38, 30, 24],
  ["loss-11", "Tofu gingembre brocoli", "tofu", 470, 31, 38, 18],
  ["loss-12", "Galette sarrasin jambon", "jambon", 445, 34, 46, 13],
  ["loss-13", "Poulet curry light", "poulet", 505, 47, 52, 11],
  ["loss-14", "Bowl lentilles feta", "lentilles", 520, 29, 62, 16],
  ["loss-15", "Fromage blanc pomme cannelle", "fromage blanc", 330, 30, 34, 5]
].map(([id, name, main, calories, protein, carbs, fat], index) => recipe(id, name, ["perte"], ["perte de poids", "deficit calorique", "seche"], calories, protein, carbs, fat, {
  main,
  carb: index % 3 === 0 ? "riz complet" : "legumes",
  accent: "#6f8f57",
  dietTags: ["sans gluten"].concat(["tofu", "lentilles", "fromage blanc"].includes(main) ? ["vegetarien"] : []),
  allergens: main === "fromage blanc" || name.includes("feta") ? ["lactose"] : [],
  preferenceTags: ["rapide", "simple"],
  maxCaloriesForLoss: 620,
  minProtein: 25
}));

const massRecipes = [
  ["mass-01", "Pasta poulet parmesan", "poulet", 820, 58, 94, 22],
  ["mass-02", "Riz boeuf avocat", "boeuf", 880, 55, 96, 28],
  ["mass-03", "Porridge banane whey", "whey", 720, 45, 98, 15],
  ["mass-04", "Burrito dinde haricots", "dinde", 790, 52, 88, 21],
  ["mass-05", "Saumon riz mangue", "saumon", 840, 48, 90, 29],
  ["mass-06", "Gnocchis tofu pesto", "tofu", 760, 36, 92, 24],
  ["mass-07", "Omelette avoine fromage", "oeufs", 735, 42, 64, 30],
  ["mass-08", "Poulet patate douce noix", "poulet", 810, 54, 78, 27],
  ["mass-09", "Chili boeuf riz", "boeuf", 860, 58, 104, 20],
  ["mass-10", "Wrap thon houmous", "thon", 745, 49, 70, 24],
  ["mass-11", "Smoothie masse cacao", "lait", 690, 39, 82, 19],
  ["mass-12", "Lentilles oeufs riz", "lentilles", 770, 38, 102, 18],
  ["mass-13", "Poulet nouilles sesame", "poulet", 830, 56, 99, 21],
  ["mass-14", "Tempeh quinoa avocat", "tempeh", 805, 41, 82, 31],
  ["mass-15", "Bowl grec sportif", "yaourt grec", 700, 44, 74, 22]
].map(([id, name, main, calories, protein, carbs, fat], index) => recipe(id, name, ["masse"], ["prise de masse", "surplus calorique", "recuperation"], calories, protein, carbs, fat, {
  main,
  carb: "riz ou pates",
  accent: "#c99a55",
  dietTags: ["tofu", "lentilles", "tempeh", "yaourt grec"].includes(main) ? ["vegetarien"] : [],
  allergens: id === "mass-03" ? ["arachide", "lactose"] : (["whey", "lait", "yaourt grec"].includes(main) || name.includes("parmesan") || name.includes("fromage") ? ["lactose"] : []),
  preferenceTags: index % 2 ? ["simple"] : ["rapide"],
  minProtein: 35
}));

const maintenanceRecipes = [
  ["maint-01", "Assiette saumon quinoa", "saumon", 650, 42, 58, 24],
  ["maint-02", "Poulet mediterraneen", "poulet", 610, 48, 52, 18],
  ["maint-03", "Tofu legumes riz", "tofu", 590, 33, 68, 18],
  ["maint-04", "Buddha bowl pois chiches", "pois chiches", 620, 27, 78, 18],
  ["maint-05", "Dinde semoule legumes", "dinde", 640, 46, 66, 16],
  ["maint-06", "Oeufs pommes vapeur", "oeufs", 575, 32, 50, 24],
  ["maint-07", "Crevettes nouilles riz", "crevettes", 600, 39, 76, 10],
  ["maint-08", "Salade grecque complete", "feta", 560, 26, 38, 30],
  ["maint-09", "Cabillaud puree carotte", "cabillaud", 545, 41, 54, 12],
  ["maint-10", "Bowl tempeh patate douce", "tempeh", 665, 35, 72, 24],
  ["maint-11", "Riz poulet ananas", "poulet", 630, 45, 70, 14],
  ["maint-12", "Lentilles saumon fume", "saumon", 625, 39, 55, 23],
  ["maint-13", "Poke thon avocat", "thon", 675, 43, 66, 24],
  ["maint-14", "Skyr granola maison", "skyr", 520, 34, 62, 12],
  ["maint-15", "Ratatouille oeufs quinoa", "oeufs", 585, 31, 60, 20]
].map(([id, name, main, calories, protein, carbs, fat], index) => recipe(id, name, ["maintien"], ["maintien", "equilibre alimentaire"], calories, protein, carbs, fat, {
  main,
  carb: "quinoa ou riz",
  accent: "#9d7d55",
  dietTags: ["sans gluten"].concat(["tofu", "pois chiches", "oeufs", "tempeh", "skyr"].includes(main) ? ["vegetarien"] : []),
  allergens: ["feta", "skyr"].includes(main) ? ["lactose"] : [],
  preferenceTags: ["simple"],
  compatibleWithLossPlan: index < 5,
  maxCaloriesForLoss: 620
}));

const performanceRecipes = [
  ["perf-01", "Riz miel banane pre training", "riz", 520, 18, 106, 4],
  ["perf-02", "Wrap poulet energie", "poulet", 690, 45, 82, 18],
  ["perf-03", "Bol recuperation cacao", "skyr", 610, 40, 78, 12],
  ["perf-04", "Patate douce dinde", "dinde", 670, 50, 74, 14],
  ["perf-05", "Pates thon tomate", "thon", 720, 48, 94, 13],
  ["perf-06", "Smoothie banane avoine", "lait vegetal", 560, 26, 86, 12],
  ["perf-07", "Quinoa tofu edamame", "tofu", 640, 38, 70, 19],
  ["perf-08", "Riz crevettes citron", "crevettes", 610, 42, 78, 9],
  ["perf-09", "Pain perdu sportif", "oeufs", 650, 35, 84, 18],
  ["perf-10", "Bowl post combat", "poulet", 760, 56, 96, 16]
].map(([id, name, main, calories, protein, carbs, fat]) => recipe(id, name, ["masse", "maintien"], ["performance", "recuperation"], calories, protein, carbs, fat, {
  main,
  carb: "glucides digestes",
  accent: "#d1aa66",
  dietTags: ["tofu", "lait vegetal"].includes(main) ? ["vegetarien", "sans lactose"] : [],
  allergens: main === "skyr" ? ["lactose"] : [],
  sports: ["sports de combat", "musculation", "general"],
  preferenceTags: ["rapide"]
}));

export const demoRecipes = [...lossRecipes, ...massRecipes, ...maintenanceRecipes, ...performanceRecipes];

export const initialState = {
  schemaVersion: 3,
  currentRole: "coach",
  currentClientId: "client-lucas",
  coach: demoCoach,
  clients: demoClients,
  contents: demoContents,
  recipes: demoRecipes,
  recipeAssignments: [
    { id: "recipe-assignment-emma-loss", recipeId: "loss-11", clientId: "client-emma", assignedBy: "coach", createdAt: "2026-07-10T09:00:00.000Z" }
  ],
  recipeFavorites: [],
  templates: [],
  publications: [],
  notifications: [
    { id: "notif-lucas-fatigue", level: "urgent", title: "Lucas manque de sommeil", clientId: "client-lucas", status: "unread", createdAt: "2026-07-10T08:00:00.000Z" },
    { id: "notif-jeanne-inactive", level: "attention", title: "Jeanne est inactive depuis 9 jours", clientId: "client-jeanne", status: "unread", createdAt: "2026-07-10T08:10:00.000Z" }
  ],
  approvals: [],
  auditLogs: []
};
