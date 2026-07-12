export const contentTypes = {
  workout: "Seance",
  program: "Programme",
  recipe: "Recette",
  nutrition_plan: "Plan nutritionnel",
  revision: "Fiche",
  dossier: "Dossier",
  badge: "Badge",
  challenge: "Defi",
  announcement: "Annonce",
  message: "Message"
};

export const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function ageBand(age) {
  if (age < 18) return "moins de 18 ans";
  if (age <= 25) return "18-25 ans";
  if (age <= 39) return "26-39 ans";
  if (age <= 59) return "40-59 ans";
  return "60 ans et plus";
}

export function getLatestCheckin(client) {
  return [...(client.checkins || [])].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function targetMatchesClient(target = {}, client) {
  if (!target || target.mode === "all") return true;
  if (target.mode === "manual") return (target.clientIds || []).includes(client.id);
  if (target.mode !== "profile") return false;
  if (target.clientIds?.length && !target.clientIds.includes(client.id)) return false;
  if (target.formulas?.length && !target.formulas.includes(client.formula)) return false;
  if (target.goals?.length && !target.goals.includes(client.goal)) return false;
  if (target.sexes?.length && !target.sexes.includes(client.sex)) return false;
  if (target.levels?.length && !target.levels.includes(client.level)) return false;
  if (target.sports?.length && !target.sports.includes(client.sport)) return false;
  if (typeof target.minAge === "number" && client.age < target.minAge) return false;
  if (typeof target.maxAge === "number" && client.age > target.maxAge) return false;
  if (target.excludedInjuries?.some((injury) => client.injuries.includes(injury))) return false;
  if (target.requiredRestrictions?.length && !target.requiredRestrictions.every((item) => client.restrictions.includes(item))) return false;
  return true;
}

export function isVisibleContent(content, client, now = new Date()) {
  if (!["published", "scheduled"].includes(content.status)) return false;
  if (content.status === "scheduled" && content.publishAt && new Date(content.publishAt) > now) return false;
  if (content.endsAt && new Date(content.endsAt) < now) return false;
  return targetMatchesClient(content.target, client);
}

export function visibleContentsForClient(state, clientId, type, now = new Date()) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return [];
  return state.contents.filter((content) => (!type || content.type === type) && isVisibleContent(content, client, now));
}

export function isRecipeAssignedToClient(state, recipeId, clientId) {
  return (state.recipeAssignments || []).some((item) => item.recipeId === recipeId && item.clientId === clientId);
}

export function recipeHasClientConflict(recipe, client) {
  const allergies = normalizeList(client.allergies);
  const restrictions = normalizeList(client.restrictions);
  const allergens = normalizeList(recipe.allergens);
  const dietTags = normalizeList(recipe.dietTags);
  if (allergies.some((allergy) => allergens.includes(allergy))) return true;
  if (restrictions.includes("vegetarien") && !dietTags.includes("vegetarien")) return true;
  if (restrictions.includes("sans gluten") && !dietTags.includes("sans gluten")) return true;
  if (restrictions.includes("sans lactose") && !dietTags.includes("sans lactose")) return true;
  return false;
}

export function recipeMatchesClientPlan(recipe, client) {
  if (recipeHasClientConflict(recipe, client)) return false;
  const formulas = normalizeList(recipe.formulas);
  const goals = normalizeList(recipe.goals);
  const sportTags = normalizeList(recipe.sports);
  const formulaMatch = formulas.includes(client.formula);
  const performanceMatch = client.formula !== "perte" && goals.includes("performance");
  const maintenanceForLoss = client.formula === "perte" && recipe.compatibleWithLossPlan === true;
  if (!formulaMatch && !performanceMatch && !maintenanceForLoss) return false;
  if (recipe.minAge && client.age < recipe.minAge) return false;
  if (recipe.maxAge && client.age > recipe.maxAge) return false;
  if (recipe.maxCaloriesForLoss && client.formula === "perte" && recipe.calories > recipe.maxCaloriesForLoss) return false;
  if (recipe.minProtein && recipe.protein < recipe.minProtein) return false;
  if (sportTags.length && !sportTags.includes(client.sport) && !sportTags.includes("general")) return false;
  return true;
}

export function visibleRecipesForClient(state, clientId, options = {}) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return [];
  const query = normalizeText(options.query || "");
  const filter = options.filter || "all";
  const favorites = new Set((state.recipeFavorites || []).filter((item) => item.clientId === clientId).map((item) => item.recipeId));
  const recipes = (state.recipes || []).filter((recipe) => {
    const manuallyAssigned = isRecipeAssignedToClient(state, recipe.id, clientId);
    if (recipeHasClientConflict(recipe, client)) return false;
    if (!manuallyAssigned && !recipeMatchesClientPlan(recipe, client)) return false;
    if (query && !normalizeText(`${recipe.name} ${recipe.description} ${recipe.ingredients.map((item) => item.name).join(" ")}`).includes(query)) return false;
    if (filter !== "all" && filter === "favorites" && !favorites.has(recipe.id)) return false;
    if (filter !== "all" && filter !== "favorites" && !normalizeList(recipe.goals).includes(filter) && !normalizeList(recipe.dietTags).includes(filter) && !normalizeList(recipe.formulas).includes(filter)) return false;
    return true;
  }).map((recipe) => ({
    ...recipe,
    isFavorite: favorites.has(recipe.id),
    isAssignedByCoach: isRecipeAssignedToClient(state, recipe.id, clientId),
    compatibility: getRecipeCompatibility(recipe, client)
  }));
  return sortRecipes(recipes, options.sort || "recommended");
}

export function getRecipeCompatibility(recipe, client) {
  const scoreParts = [];
  if (normalizeList(recipe.formulas).includes(client.formula)) scoreParts.push(45);
  if (normalizeList(recipe.goals).some((goal) => normalizeText(client.goal).includes(normalizeText(goal)) || goal === "performance")) scoreParts.push(20);
  if (recipe.protein >= Math.round(client.nutrition.protein * 0.22)) scoreParts.push(15);
  if (client.formula === "perte" && recipe.calories <= Math.round(client.nutrition.calories * 0.34)) scoreParts.push(10);
  if (client.formula === "masse" && recipe.carbs >= Math.round(client.nutrition.carbs * 0.18)) scoreParts.push(10);
  if (client.formula === "maintien" && recipe.calories <= Math.round(client.nutrition.calories * 0.4)) scoreParts.push(10);
  const score = Math.min(100, scoreParts.reduce((total, value) => total + value, 20));
  return {
    score,
    planBadge: score >= 70 ? "Compatible avec votre plan" : "Compatible",
    goalBadge: normalizeList(recipe.formulas).includes(client.formula) ? "Recommande pour votre objectif" : "Envoye par votre coach"
  };
}

export function toggleRecipeFavorite(state, clientId, recipeId) {
  const exists = (state.recipeFavorites || []).some((item) => item.clientId === clientId && item.recipeId === recipeId);
  const nextFavorites = exists
    ? state.recipeFavorites.filter((item) => !(item.clientId === clientId && item.recipeId === recipeId))
    : [{ id: uid("recipe-favorite"), clientId, recipeId, createdAt: new Date().toISOString() }, ...(state.recipeFavorites || [])];
  return withAudit({ ...state, recipeFavorites: nextFavorites }, exists ? "recipe.favorite.removed" : "recipe.favorite.added", recipeId, clientId);
}

export function assignRecipeToClient(state, recipeId, clientId, actor = "coach") {
  if (isRecipeAssignedToClient(state, recipeId, clientId)) return state;
  const assignment = { id: uid("recipe-assignment"), recipeId, clientId, assignedBy: actor, createdAt: new Date().toISOString() };
  const notification = { id: uid("notif"), level: "information", title: `Nouvelle recette envoyee`, clientId, status: "unread", createdAt: new Date().toISOString() };
  return withAudit({ ...state, recipeAssignments: [assignment, ...(state.recipeAssignments || [])], notifications: [notification, ...state.notifications] }, "recipe.assigned", recipeId, clientId);
}

export function getRecipeById(state, recipeId) {
  return (state.recipes || []).find((recipe) => recipe.id === recipeId) || null;
}

export function createContent(state, input) {
  const now = new Date().toISOString();
  const content = {
    id: uid(input.type || "content"),
    type: input.type,
    title: input.title.trim(),
    status: input.status || "draft",
    target: input.target || { mode: "all" },
    payload: input.payload || {},
    publishAt: input.publishAt || null,
    endsAt: input.endsAt || null,
    createdAt: now,
    updatedAt: now
  };
  return withAudit({ ...state, contents: [content, ...state.contents] }, "content.created", content.id, content.title);
}

export function updateContentStatus(state, contentId, status) {
  const updated = state.contents.map((content) => content.id === contentId ? { ...content, status, updatedAt: new Date().toISOString() } : content);
  return withAudit({ ...state, contents: updated }, "content.status", contentId, status);
}

export function duplicateContent(state, contentId) {
  const source = state.contents.find((content) => content.id === contentId);
  if (!source) return state;
  const copy = { ...clone(source), id: uid(source.type), title: `${source.title} - copie`, status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  return withAudit({ ...state, contents: [copy, ...state.contents] }, "content.duplicated", copy.id, source.id);
}

export function createTemplate(state, sourceId) {
  const source = state.contents.find((content) => content.id === sourceId);
  if (!source) return state;
  const template = { id: uid("template"), sourceType: source.type, title: source.title, payload: clone(source.payload), createdAt: new Date().toISOString(), archived: false };
  return withAudit({ ...state, templates: [template, ...state.templates] }, "template.created", template.id, template.title);
}

export function applyTemplateToClients(state, templateId, clientIds) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template || !clientIds.length) return state;
  const created = clientIds.map((clientId) => ({
    id: uid(template.sourceType),
    type: template.sourceType,
    title: template.title,
    status: "published",
    target: { mode: "manual", clientIds: [clientId] },
    payload: clone(template.payload),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  return withAudit({ ...state, contents: [...created, ...state.contents] }, "template.applied", templateId, clientIds.join(","));
}

export function calculateNutritionTargets(assessment) {
  const weight = Number(assessment.weightKg || assessment.weight || 70);
  const height = Number(assessment.heightCm || 170);
  const age = Number(assessment.age || 35);
  const activityHours = Number(assessment.activityHours || 3);
  const sexFactor = assessment.sex === "femme" ? -161 : 5;
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + sexFactor);
  const activity = 1.25 + Math.min(activityHours, 10) * 0.035;
  const maintenance = Math.round(bmr * activity);
  const formula = assessment.formula || "maintien";
  const calories = formula === "perte" ? maintenance - 320 : formula === "masse" ? maintenance + 260 : maintenance;
  const proteinFactor = age >= 60 ? 1.7 : formula === "masse" ? 2 : 1.8;
  const protein = Math.round(weight * proteinFactor);
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return {
    calories: Math.max(1400, calories),
    protein,
    carbs,
    fat,
    waterLiters: Number((Math.max(1.8, weight * 0.035)).toFixed(1))
  };
}

export function updateClientAssessment(state, clientId, input, actor = "coach") {
  const updatedClients = state.clients.map((client) => {
    if (client.id !== clientId) return client;
    const assessment = {
      ...client,
      age: Number(input.age ?? client.age),
      sex: input.sex ?? client.sex,
      formula: input.formula ?? client.formula,
      goal: input.goal?.trim() || client.goal,
      level: input.level ?? client.level,
      sport: input.sport?.trim() || client.sport,
      activityHours: Number(input.activityHours ?? client.activityHours),
      heightCm: Number(input.heightCm ?? client.heightCm ?? 170),
      weightKg: Number(input.weightKg ?? client.weightKg ?? getLatestCheckin(client)?.weight ?? 70),
      bodyFatPercent: Number(input.bodyFatPercent ?? client.bodyFatPercent ?? 0),
      injuries: splitList(input.injuries ?? client.injuries),
      pain: splitList(input.pain ?? client.pain),
      foodPreferences: splitList(input.foodPreferences ?? client.foodPreferences),
      allergies: splitList(input.allergies ?? client.allergies),
      restrictions: splitList(input.restrictions ?? client.restrictions)
    };
    return {
      ...client,
      ...assessment,
      nutrition: calculateNutritionTargets(assessment),
      assessmentUpdatedAt: new Date().toISOString(),
      assessmentUpdatedBy: actor
    };
  });
  return withAudit({ ...state, clients: updatedClients }, "client.assessment.updated", clientId, actor);
}

export function updateClientNutrition(state, clientId, input, actor = "coach") {
  const updatedClients = state.clients.map((client) => {
    if (client.id !== clientId) return client;
    return {
      ...client,
      nutrition: {
        calories: Number(input.calories ?? client.nutrition.calories),
        protein: Number(input.protein ?? client.nutrition.protein),
        carbs: Number(input.carbs ?? client.nutrition.carbs),
        fat: Number(input.fat ?? client.nutrition.fat),
        waterLiters: Number(input.waterLiters ?? client.nutrition.waterLiters)
      }
    };
  });
  return withAudit({ ...state, clients: updatedClients }, "client.nutrition.updated", clientId, actor);
}

export function assignWorkoutToClient(state, clientId, input, actor = "coach") {
  const workout = {
    id: uid("assigned-workout"),
    title: input.title.trim(),
    focus: input.focus?.trim() || "general",
    date: input.date || new Date().toISOString().slice(0, 10),
    durationMinutes: Number(input.durationMinutes || 45),
    exercises: splitList(input.exercises),
    notes: input.notes?.trim() || "",
    status: "planned",
    createdAt: new Date().toISOString(),
    createdBy: actor
  };
  const updatedClients = state.clients.map((client) => client.id === clientId ? {
    ...client,
    assignedWorkouts: [workout, ...(client.assignedWorkouts || [])]
  } : client);
  const notification = { id: uid("notif"), level: "information", title: `Nouvelle seance attribuee`, clientId, status: "unread", createdAt: new Date().toISOString() };
  return withAudit({ ...state, clients: updatedClients, notifications: [notification, ...state.notifications] }, "workout.assigned", workout.id, clientId);
}

export function completeAssignedWorkout(state, clientId, workoutId, feedback = {}) {
  const updatedClients = state.clients.map((client) => {
    if (client.id !== clientId) return client;
    const assignedWorkouts = (client.assignedWorkouts || []).map((workout) => workout.id === workoutId ? {
      ...workout,
      status: "completed",
      completedAt: new Date().toISOString(),
      feedback: {
        difficulty: Number(feedback.difficulty || 7),
        feeling: feedback.feeling || "Seance terminee",
        pain: feedback.pain || ""
      }
    } : workout);
    const completed = assignedWorkouts.find((workout) => workout.id === workoutId);
    const workoutLog = completed ? {
      id: uid("workout-log"),
      title: completed.title,
      completedAt: completed.completedAt,
      difficulty: completed.feedback.difficulty,
      pain: completed.feedback.pain
    } : null;
    return {
      ...client,
      assignedWorkouts,
      workouts: workoutLog ? [workoutLog, ...(client.workouts || [])] : client.workouts
    };
  });
  const notification = { id: uid("notif"), level: "information", title: `Seance terminee`, clientId, status: "unread", createdAt: new Date().toISOString() };
  return withAudit({ ...state, clients: updatedClients, notifications: [notification, ...state.notifications] }, "workout.completed", workoutId, clientId);
}

export function analyzeClient(client) {
  const latest = getLatestCheckin(client);
  const previous = client.checkins?.length > 1 ? client.checkins[client.checkins.length - 2] : null;
  const detections = [];
  if (!latest) detections.push({ level: "attention", label: "Aucun bilan recent", reason: "Le client n'a pas encore de bilan exploitable." });
  if (latest?.sleepHours < 6) detections.push({ level: "urgent", label: "Sommeil insuffisant", reason: `${latest.sleepHours} h de sommeil au dernier bilan.` });
  if (latest?.hydrationLiters < client.nutrition.waterLiters * 0.75) detections.push({ level: "attention", label: "Hydratation basse", reason: `${latest.hydrationLiters} L pour une cible de ${client.nutrition.waterLiters} L.` });
  if (latest?.energy <= 4) detections.push({ level: "urgent", label: "Fatigue importante", reason: `Energie declaree a ${latest.energy}/10.` });
  if (latest?.pain || client.pain.length) detections.push({ level: "urgent", label: "Douleur detectee", reason: latest?.pain || client.pain.join(", ") });
  if (previous && Math.abs(latest.weight - previous.weight) < 0.2 && latest.adherence < 70) detections.push({ level: "attention", label: "Risque de stagnation", reason: "Poids stable avec adherence faible." });

  const adjustment = proposeNutrition(client, detections);
  const training = proposeTraining(client, detections);
  return {
    clientId: client.id,
    confidence: Math.max(62, 96 - detections.length * 8),
    dataUsed: ["bilan hebdomadaire", "poids", "energie", "sommeil", "hydratation", "douleurs", "seances", "nutrition"],
    detections,
    recommendations: [adjustment.reason, training.reason],
    proposedNutrition: adjustment.nextNutrition,
    proposedTraining: training.nextTraining
  };
}

export function proposeNutrition(client, detections) {
  const next = { ...client.nutrition };
  const hasFatigue = detections.some((item) => item.label.includes("Fatigue") || item.label.includes("Sommeil"));
  const hasStagnation = detections.some((item) => item.label.includes("stagnation"));
  if (client.formula === "perte" && hasStagnation) next.calories = Math.max(1500, next.calories - 120);
  if (client.formula === "masse" && !hasFatigue) next.calories += 120;
  if (hasFatigue) next.carbs += 20;
  next.protein = Math.max(next.protein, Math.round(client.age > 60 ? 1.6 * 65 : next.protein));
  return {
    nextNutrition: next,
    reason: hasFatigue ? "Augmenter legerement les glucides autour des seances et stabiliser les proteines." : "Ajuster les calories selon l'objectif sans changer brutalement le protocole."
  };
}

export function proposeTraining(client, detections) {
  const pain = detections.some((item) => item.label.includes("Douleur"));
  const fatigue = detections.some((item) => item.label.includes("Fatigue") || item.label.includes("Sommeil"));
  return {
    nextTraining: {
      intensity: pain || fatigue ? "reduite" : "progressive",
      restSeconds: pain || fatigue ? 120 : 90,
      setsDelta: pain || fatigue ? -1 : 1,
      notes: pain ? "Remplacer les exercices douloureux et privilegier amplitude controlee." : "Conserver progression lineaire avec controle du ressenti."
    },
    reason: pain ? "La douleur prime sur la surcharge progressive." : "La charge d'entrainement suit la recuperation declaree."
  };
}

export function createAiApproval(state, clientId, kind) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return state;
  const analysis = analyzeClient(client);
  const approval = {
    id: uid("approval"),
    clientId,
    kind,
    status: "pending",
    analysis,
    createdAt: new Date().toISOString()
  };
  const notification = { id: uid("notif"), level: "attention", title: `Action IA a valider pour ${client.firstName}`, clientId, status: "unread", createdAt: new Date().toISOString() };
  return withAudit({ ...state, approvals: [approval, ...state.approvals], notifications: [notification, ...state.notifications] }, "ai.approval.created", approval.id, kind);
}

export function resolveApproval(state, approvalId, decision) {
  const approval = state.approvals.find((item) => item.id === approvalId);
  if (!approval) return state;
  let nextState = { ...state };
  if (decision === "approved" && approval.kind === "nutrition") {
    nextState.clients = state.clients.map((client) => client.id === approval.clientId ? { ...client, nutrition: approval.analysis.proposedNutrition } : client);
  }
  nextState.approvals = nextState.approvals.map((item) => item.id === approvalId ? { ...item, status: decision, resolvedAt: new Date().toISOString() } : item);
  return withAudit(nextState, `ai.approval.${decision}`, approvalId, approval.kind);
}

export function updateNotification(state, notificationId, status) {
  return withAudit({ ...state, notifications: state.notifications.map((item) => item.id === notificationId ? { ...item, status } : item) }, "notification.updated", notificationId, status);
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map((item) => normalizeText(item)).filter(Boolean) : splitList(value).map((item) => normalizeText(item));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sortRecipes(recipes, sort) {
  const next = [...recipes];
  if (sort === "calories") return next.sort((a, b) => a.calories - b.calories);
  if (sort === "protein") return next.sort((a, b) => b.protein - a.protein);
  if (sort === "duration") return next.sort((a, b) => (a.prepMinutes + a.cookMinutes) - (b.prepMinutes + b.cookMinutes));
  if (sort === "difficulty") return next.sort((a, b) => a.difficulty.localeCompare(b.difficulty));
  return next.sort((a, b) => b.compatibility.score - a.compatibility.score);
}

export function withAudit(state, action, entityId, summary) {
  const log = { id: uid("audit"), action, entityId, summary, createdAt: new Date().toISOString() };
  return { ...state, auditLogs: [log, ...(state.auditLogs || [])] };
}
