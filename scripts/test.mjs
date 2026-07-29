import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initialState } from "../src/seed.mjs";
import {
  analyzeClient,
  assignRecipeToClient,
  assignWorkoutToClient,
  applyTemplateToClients,
  calculateNutritionTargets,
  clone,
  completeAssignedWorkout,
  createAiApproval,
  createContent,
  createTemplate,
  getRecipeById,
  resolveApproval,
  toggleRecipeFavorite,
  updateClientAssessment,
  updateClientNutrition,
  updateNotification,
  visibleContentsForClient,
  visibleRecipesForClient
} from "../src/domain.mjs";
import { ACTION_NAMES } from "../src/actions.mjs";

let state = clone(initialState);

const countBy = (predicate) => state.recipes.filter(predicate).length;
assert.ok(countBy((recipe) => recipe.formulas.includes("perte")) >= 15, "minimum 15 recettes perte");
assert.ok(countBy((recipe) => recipe.formulas.includes("masse")) >= 15, "minimum 15 recettes prise de masse");
assert.ok(countBy((recipe) => recipe.formulas.includes("maintien")) >= 15, "minimum 15 recettes maintien");
assert.ok(countBy((recipe) => recipe.goals.includes("performance")) >= 10, "minimum 10 recettes performance");
assert.ok(countBy((recipe) => recipe.dietTags.includes("vegetarien")) >= 10, "minimum 10 recettes vegetariennes");
assert.ok(countBy((recipe) => recipe.dietTags.includes("sans gluten")) >= 10, "minimum 10 recettes sans gluten");

state = createContent(state, {
  type: "recipe",
  title: "Salade seche test",
  status: "published",
  target: { mode: "profile", formulas: ["perte"] },
  payload: { description: "Recette perte", calories: 430, protein: 38, carbs: 42, fat: 12 }
});
const lucasRecipes = visibleContentsForClient(state, "client-lucas", "recipe");
const emmaRecipes = visibleContentsForClient(state, "client-emma", "recipe");
assert.ok(lucasRecipes.some((item) => item.title === "Salade seche test"), "client perte doit voir la recette perte");
assert.ok(!emmaRecipes.some((item) => item.title === "Salade seche test"), "client masse ne doit pas voir la recette perte");

state = createContent(state, {
  type: "recipe",
  title: "Salade seche envoyee manuellement",
  status: "published",
  target: { mode: "manual", clientIds: ["client-emma"] },
  payload: { description: "Envoi manuel", calories: 430, protein: 38, carbs: 42, fat: 12 }
});
assert.ok(visibleContentsForClient(state, "client-emma", "recipe").some((item) => item.title === "Salade seche envoyee manuellement"), "envoi manuel visible meme si profil normalement incompatible");

state = createContent(state, {
  type: "workout",
  title: "Modele seance force",
  status: "draft",
  target: { mode: "all" },
  payload: { description: "Squat, pousse, tirage", exercises: ["squat", "developpe", "tirage"] }
});
const workout = state.contents.find((item) => item.title === "Modele seance force");
state = createTemplate(state, workout.id);
const template = state.templates.find((item) => item.title === "Modele seance force");
state = applyTemplateToClients(state, template.id, ["client-lucas"]);
assert.ok(visibleContentsForClient(state, "client-lucas", "workout").some((item) => item.title === "Modele seance force"), "modele applique et publie au client");

state = createContent(state, {
  type: "challenge",
  title: "Defi hydratation programme",
  status: "scheduled",
  publishAt: "2099-01-01T09:00:00.000Z",
  target: { mode: "all" },
  payload: { description: "Boire la cible quotidienne" }
});
assert.ok(!visibleContentsForClient(state, "client-lucas", "challenge", new Date("2026-07-10")).some((item) => item.title === "Defi hydratation programme"), "publication future invisible avant date");
assert.ok(visibleContentsForClient(state, "client-lucas", "challenge", new Date("2099-01-02")).some((item) => item.title === "Defi hydratation programme"), "publication future visible apres date");

state = updateNotification(state, "notif-lucas-fatigue", "handled");
assert.equal(state.notifications.find((item) => item.id === "notif-lucas-fatigue").status, "handled", "notification traitee");

const lucas = state.clients.find((item) => item.id === "client-lucas");
const analysis = analyzeClient(lucas);
assert.ok(analysis.detections.length >= 2, "analyse IA detecte sommeil/fatigue/douleur");

state = createAiApproval(state, "client-lucas", "nutrition");
const approval = state.approvals.find((item) => item.clientId === "client-lucas" && item.status === "pending");
assert.ok(approval, "proposition IA creee");
state = resolveApproval(state, approval.id, "approved");
assert.equal(state.approvals.find((item) => item.id === approval.id).status, "approved", "proposition IA approuvee");
assert.deepEqual(state.clients.find((item) => item.id === "client-lucas").nutrition, approval.analysis.proposedNutrition, "macros client mises a jour apres validation");

state = createAiApproval(state, "client-emma", "nutrition");
const rejected = state.approvals.find((item) => item.clientId === "client-emma" && item.status === "pending");
const beforeNutrition = clone(state.clients.find((item) => item.id === "client-emma").nutrition);
state = resolveApproval(state, rejected.id, "rejected");
assert.deepEqual(state.clients.find((item) => item.id === "client-emma").nutrition, beforeNutrition, "refus IA ne change pas les macros");

const beforeAssessment = state.clients.find((item) => item.id === "client-jeanne");
const recalculated = calculateNutritionTargets({ ...beforeAssessment, weightKg: 70, heightCm: 162, formula: "maintien" });
assert.ok(recalculated.calories > 1400 && recalculated.protein > 90, "recalcul nutrition coherent");

state = updateClientAssessment(state, "client-jeanne", {
  age: 69,
  heightCm: 162,
  weightKg: 70,
  bodyFatPercent: 27,
  sex: "femme",
  formula: "maintien",
  goal: "mobilite sans douleur",
  level: "debutant",
  sport: "mobilite",
  activityHours: 3,
  injuries: "epaule gauche",
  pain: "epaule",
  foodPreferences: "simple",
  allergies: "",
  restrictions: ""
}, "coach");
const jeanne = state.clients.find((item) => item.id === "client-jeanne");
assert.equal(jeanne.age, 69, "bilan client modifie");
assert.equal(jeanne.goal, "mobilite sans douleur", "objectif bilan modifie");
assert.deepEqual(jeanne.nutrition, calculateNutritionTargets(jeanne), "macros recalculees apres bilan");

state = updateClientNutrition(state, "client-lucas", {
  calories: 2100,
  protein: 160,
  carbs: 220,
  fat: 60,
  waterLiters: 2.6
}, "coach");
assert.equal(state.clients.find((item) => item.id === "client-lucas").nutrition.calories, 2100, "nutrition coach synchronisee cote client");

state = assignWorkoutToClient(state, "client-lucas", {
  title: "Seance test Phase 2",
  date: "2026-07-12",
  durationMinutes: 40,
  focus: "technique",
  exercises: "Goblet squat, Rowing poulie, Dead bug",
  notes: "Controle douleur"
}, "coach");
const assigned = state.clients.find((item) => item.id === "client-lucas").assignedWorkouts.find((item) => item.title === "Seance test Phase 2");
assert.ok(assigned, "seance attribuee au client");
assert.equal(assigned.status, "planned", "seance attribuee en statut prevu");

state = completeAssignedWorkout(state, "client-lucas", assigned.id, { difficulty: 6, feeling: "OK", pain: "aucune" });
const completedClient = state.clients.find((item) => item.id === "client-lucas");
assert.equal(completedClient.assignedWorkouts.find((item) => item.id === assigned.id).status, "completed", "client termine la seance");
assert.ok(completedClient.workouts.some((item) => item.title === "Seance test Phase 2"), "historique entrainement alimente");

const lucasLossRecipes = visibleRecipesForClient(state, "client-lucas");
assert.ok(lucasLossRecipes.length >= 15, "client perte voit au moins 15 recettes compatibles");
assert.ok(lucasLossRecipes.every((recipe) => recipe.formulas.includes("perte") || recipe.compatibleWithLossPlan || recipe.isAssignedByCoach), "client perte ne voit pas les recettes masse non compatibles");

const emmaMassRecipes = visibleRecipesForClient(state, "client-emma");
assert.ok(emmaMassRecipes.some((recipe) => recipe.formulas.includes("masse")), "client masse voit des recettes masse");
assert.ok(!emmaMassRecipes.some((recipe) => recipe.id === "loss-01"), "client masse ne voit pas une recette perte non assignee");

state = assignRecipeToClient(state, "loss-11", "client-emma", "coach");
const emmaAfterManual = visibleRecipesForClient(state, "client-emma");
assert.ok(emmaAfterManual.some((recipe) => recipe.id === "loss-11" && recipe.isAssignedByCoach), "recette formule incompatible envoyee manuellement visible si restrictions respectees");

state = assignRecipeToClient(state, "mass-03", "client-emma", "coach");
assert.ok(!visibleRecipesForClient(state, "client-emma").some((recipe) => recipe.id === "mass-03"), "allergie lactose rend la recette invisible meme assignee");

const jeanneMaintRecipes = visibleRecipesForClient(state, "client-jeanne");
assert.ok(jeanneMaintRecipes.some((recipe) => recipe.formulas.includes("maintien")), "client maintien voit des recettes maintien");
assert.ok(!jeanneMaintRecipes.some((recipe) => recipe.formulas.includes("masse") && !recipe.goals.includes("performance")), "client maintien ne voit pas les recettes masse standard");

const searched = visibleRecipesForClient(state, "client-lucas", { query: "cabillaud" });
assert.ok(searched.length > 0 && searched.every((recipe) => recipe.name.toLowerCase().includes("cabillaud") || recipe.description.toLowerCase().includes("cabillaud") || recipe.ingredients.some((item) => item.name.toLowerCase().includes("cabillaud"))), "recherche recette fonctionne");

state = toggleRecipeFavorite(state, "client-lucas", "loss-01");
const favorites = visibleRecipesForClient(state, "client-lucas", { filter: "favorites" });
assert.ok(favorites.some((recipe) => recipe.id === "loss-01" && recipe.isFavorite), "favori recette fonctionne");

const detailedRecipe = getRecipeById(state, "loss-01");
assert.ok(detailedRecipe.ingredients.length > 0 && detailedRecipe.steps.length > 0 && detailedRecipe.imageUrl.startsWith("data:image/svg+xml"), "detail recette complet disponible");

assert.ok(state.auditLogs.length >= 8, "historique audit alimente");
assert.ok(ACTION_NAMES.includes("open-create") && ACTION_NAMES.includes("approve-ai"), "actions UI principales declarees");
assert.ok(ACTION_NAMES.includes("open-assessment-editor") && ACTION_NAMES.includes("complete-workout"), "actions Phase 2 declarees");
assert.ok(ACTION_NAMES.includes("toggle-recipe-favorite") && ACTION_NAMES.includes("open-recipe-detail"), "actions Corner Cuisine declarees");

const supabaseServerSource = readFileSync(new URL("../lib/supabase/server.ts", import.meta.url), "utf8");
assert.ok(supabaseServerSource.includes("cookieStore.getAll()"), "Supabase SSR conserve cookieStore.getAll");
assert.ok(supabaseServerSource.includes("Cookies can only be modified in a Server Action or Route Handler"), "Supabase SSR ignore uniquement l'erreur cookie Server Component");
assert.ok(supabaseServerSource.includes("throw error;"), "Supabase SSR ne masque pas les autres erreurs cookie");

const serverActionsSource = readFileSync(new URL("../app/actions.ts", import.meta.url), "utf8");
for (const actionName of ["updateAssessmentAction", "assignWorkoutAction", "updateNutritionAction", "createAiRecommendationAction"]) {
  const actionBlock = serverActionsSource.slice(
    serverActionsSource.indexOf(`export async function ${actionName}`),
    serverActionsSource.indexOf("export async function", serverActionsSource.indexOf(`export async function ${actionName}`) + 1)
  );
  assert.ok(actionBlock.includes("await requireCoachClient"), `${actionName} verifie le rattachement coach-client avant mutation`);
}
assert.ok(serverActionsSource.includes("reboot_session_v1"), "le feedback de seance utilise une structure versionnee");
assert.ok(serverActionsSource.includes("weekly_private_journals"), "le journal prive hebdo est enregistre dans weekly_private_journals");
assert.ok(!serverActionsSource.includes("private_journal:"), "weekly_checkins ne doit plus recevoir private_journal");
assert.ok(serverActionsSource.includes("${clientId}/${checkinId}/"), "les photos hebdo utilisent le chemin client_id/checkin_id/fichier");
assert.ok(serverActionsSource.includes("weekly_private_journal.visibility_updated"), "le consentement de partage du journal est modifiable sans modifier le bilan");

const appSource = readFileSync(new URL("../app/supabase-app.tsx", import.meta.url), "utf8");
const themeBlock = appSource.slice(appSource.indexOf("function ThemeSwitcher()"), appSource.indexOf("function LiveUpdateBridge"));
assert.ok(!themeBlock.includes("<strong>"), "le bouton theme ne rend pas de libelle Clair/Sombre visible");
assert.ok(appSource.includes("workoutCompletedSetKeys"), "l'interface lit les series terminees depuis le feedback versionne");
assert.ok(appSource.includes("Partager cette note privée avec mon coach"), "le bilan client expose le consentement de partage du journal privé");
assert.ok(appSource.includes("weeklyCheckinStatusLabel"), "les statuts de bilan hebdo sont traduits sans exposer les valeurs techniques");

const dataSource = readFileSync(new URL("../lib/supabase/data.ts", import.meta.url), "utf8");
assert.ok(dataSource.includes("weekly_private_journals"), "les lectures Supabase recuperent les journaux prives separes");
assert.ok(dataSource.includes("createSignedUrl"), "les photos de bilan sont lues via URL signee");

const phase8Source = readFileSync(new URL("../scripts/supabase-phase8-client-tracking-test.mjs", import.meta.url), "utf8");
assert.ok(phase8Source.includes("ALLOW_REMOTE_RLS_TESTS"), "le test Phase 8 refuse les mutations distantes sans autorisation explicite");
assert.ok(phase8Source.includes("finally"), "le test Phase 8 garantit un nettoyage meme en cas d'echec");

console.log("Tests Phase 3 OK: audit local, Corner Cuisine personnalise, profils perte/masse/maintien, allergies, recherche, favoris et detail.");
