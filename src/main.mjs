import { ACTION_NAMES } from "./actions.mjs";
import { loadState, saveState, resetState } from "./storage.mjs";
import {
  ageBand,
  analyzeClient,
  assignRecipeToClient,
  assignWorkoutToClient,
  applyTemplateToClients,
  calculateNutritionTargets,
  contentTypes,
  completeAssignedWorkout,
  createAiApproval,
  createContent,
  createTemplate,
  duplicateContent,
  getRecipeById,
  resolveApproval,
  toggleRecipeFavorite,
  updateClientAssessment,
  updateClientNutrition,
  updateContentStatus,
  updateNotification,
  visibleContentsForClient,
  visibleRecipesForClient
} from "./domain.mjs";

const root = document.querySelector("#app");
let state = loadState();
let ui = { coachSection: "home", clientSection: "home", clientTab: "resume", selectedClientId: state.currentClientId, recipeQuery: "", recipeFilter: "all", recipeSort: "recommended", selectedRecipeId: null, modal: null, toast: "" };

const coachSections = [
  ["home", "Accueil"],
  ["clients", "Clients"],
  ["ai", "Agent IA"],
  ["contents", "Contenus"],
  ["notifications", "Notifications"]
];

const clientSections = [
  ["home", "Accueil"],
  ["program", "Mon programme"],
  ["nutrition", "Nutrition"],
  ["progress", "Mes progres"],
  ["assessment", "Mon bilan"],
  ["library", "Bibliotheque"],
  ["tribe", "Tribu"],
  ["badges", "Badges et defis"],
  ["messages", "Messages"]
];

const contentShortcuts = [
  ["workout", "Creer une seance"],
  ["program", "Creer un programme"],
  ["recipe", "Creer une recette"],
  ["nutrition_plan", "Creer un plan nutritionnel"],
  ["revision", "Creer une fiche"],
  ["dossier", "Creer un dossier"],
  ["badge", "Creer un badge"],
  ["challenge", "Creer un defi"],
  ["announcement", "Creer une annonce"],
  ["message", "Envoyer un message"]
];

function persist(nextState = state) {
  state = nextState;
  saveState(state);
  render();
}

function selectedClient() {
  return state.clients.find((client) => client.id === ui.selectedClientId) || state.clients[0];
}

function render() {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme || "dark";
  const isCoach = state.currentRole === "coach";
  root.innerHTML = `
    <main class="app-shell">
      ${renderSidebar(isCoach)}
      <section class="content">
        ${isCoach ? renderCoach() : renderClient()}
      </section>
    </main>
    ${ui.modal ? renderModal() : ""}
    ${ui.toast ? `<div class="toast">${escapeHtml(ui.toast)}</div>` : ""}
  `;
}

function renderSidebar(isCoach) {
  const nav = isCoach ? coachSections : clientSections;
  const active = isCoach ? ui.coachSection : ui.clientSection;
  return `
    <aside class="sidebar">
      <div class="brand">
        <strong>Reboot Performance</strong>
        <span class="muted small">Phase 3 - Corner Cuisine</span>
      </div>
      <div class="row">
        <button class="ghost" data-action="switch-role" data-role="coach" aria-pressed="${isCoach}">Coach</button>
        <button class="ghost" data-action="switch-role" data-role="client" aria-pressed="${!isCoach}">Client</button>
      </div>
      <nav class="nav" aria-label="Navigation principale">
        ${nav.map(([id, label]) => `<button data-action="${isCoach ? "set-coach-section" : "set-client-section"}" data-section="${id}" class="${active === id ? "active" : ""}">${label}</button>`).join("")}
      </nav>
      <div class="stack">
        <button class="ghost" data-action="toggle-theme">Changer le theme</button>
        <button class="ghost" data-action="reset-demo">Reinitialiser la demo</button>
      </div>
    </aside>
  `;
}

function renderCoach() {
  const section = ui.coachSection;
  return `
    <header class="hero">
      <div class="stack">
        <span class="pill gold">Interface coach</span>
        <h1>${coachSections.find(([id]) => id === section)?.[1] || "Accueil"}</h1>
        <p class="muted">${coachIntro(section)}</p>
      </div>
      <button class="primary" data-action="open-create" data-type="workout">Creer une seance</button>
    </header>
    ${section === "home" ? renderCoachHome() : ""}
    ${section === "clients" ? renderCoachClients() : ""}
    ${section === "ai" ? renderAiCoach() : ""}
    ${section === "contents" ? renderContents() : ""}
    ${section === "notifications" ? renderNotifications() : ""}
  `;
}

function coachIntro(section) {
  return {
    home: "Vue claire des actions urgentes, validations IA et publications a surveiller.",
    clients: "Retrouver un client, ouvrir sa fiche et agir sans chercher.",
    ai: "Analyser les donnees, preparer les corrections et valider ce qui devient visible.",
    contents: "Creer, publier, programmer, cibler et transformer un contenu en modele.",
    notifications: "Traiter les signaux importants depuis un centre unique."
  }[section];
}

function renderCoachHome() {
  const urgent = state.notifications.filter((item) => item.level === "urgent" && item.status !== "archived").length;
  const pending = state.approvals.filter((item) => item.status === "pending").length;
  const inactive = state.clients.filter((client) => daysSince(client.lastSeenAt) > 7).length;
  const scheduled = state.contents.filter((content) => content.status === "scheduled").length;
  return `
    <div class="grid">
      ${kpi("Actions urgentes", urgent, "Douleurs, sommeil, fatigue")}
      ${kpi("Actions IA", pending, "En attente de validation")}
      ${kpi("Clients inactifs", inactive, "A relancer")}
      ${kpi("Programmes prevus", scheduled, "Publications programmees")}
      <section class="panel span-8 stack">
        <h2>Centre de commandement</h2>
        <div class="list">
          ${state.notifications.slice(0, 4).map(renderNotificationCard).join("")}
        </div>
      </section>
      <section class="panel span-4 stack">
        <h2>Raccourcis utiles</h2>
        ${contentShortcuts.slice(0, 6).map(([type, label]) => `<button class="ghost" data-action="open-create" data-type="${type}">${label}</button>`).join("")}
      </section>
    </div>
  `;
}

function renderCoachClients() {
  const client = selectedClient();
  const tabs = [
    ["resume", "Resume"],
    ["assessment", "Bilan"],
    ["training", "Entrainement"],
    ["nutrition", "Nutrition"],
    ["progress", "Progres"],
    ["messages", "Messages"],
    ["history", "Historique"]
  ];
  return `
    <div class="grid">
      <section class="panel span-4 stack">
        <h2>Clients</h2>
        <div class="list">
          ${state.clients.map((item) => `
            <button class="list-item" data-action="open-client" data-client-id="${item.id}">
              <span><strong>${item.firstName} ${item.lastName}</strong></span>
              <span class="muted small">${item.age} ans - ${item.formula} - ${item.goal}</span>
              <span class="pill ${item.id === client.id ? "gold" : ""}">${daysSince(item.lastSeenAt)} j depuis activite</span>
            </button>
          `).join("")}
        </div>
      </section>
      <section class="panel span-8 stack">
        <div class="row between">
          <div>
            <h2>${client.firstName} ${client.lastName}</h2>
            <p class="muted">${client.age} ans - ${ageBand(client.age)} - ${client.level} - ${client.sport}</p>
          </div>
          <button class="primary" data-action="analyze-client" data-client-id="${client.id}">Analyser ce client</button>
        </div>
        <div class="tabs">
          ${tabs.map(([id, label]) => `<button data-action="set-client-tab" data-tab="${id}" class="${ui.clientTab === id ? "active" : ""}">${label}</button>`).join("")}
        </div>
        ${renderCoachClientTab(client)}
      </section>
    </div>
  `;
}

function renderCoachClientTab(client) {
  if (ui.clientTab === "assessment") return renderAssessmentPanel(client, "coach");
  if (ui.clientTab === "training") return renderTrainingPanel(client, "coach");
  if (ui.clientTab === "nutrition") return renderNutritionEditorPanel(client);
  if (ui.clientTab === "progress") return renderProgressPanel(client);
  if (ui.clientTab === "messages") return renderMessagesPanel(client);
  if (ui.clientTab === "history") return renderHistoryPanel(client);
  return renderClientSummary(client);
}

function renderClientSummary(client) {
  const latest = client.checkins.at(-1);
  return `
    <div class="grid">
      ${kpi("Calories", client.nutrition.calories, "cible jour")}
      ${kpi("Proteines", `${client.nutrition.protein} g`, "cible jour")}
      ${kpi("Sommeil", latest ? `${latest.sleepHours} h` : "-", "dernier bilan")}
      ${kpi("Adherence", latest ? `${latest.adherence}%` : "-", "semaine")}
      <div class="panel span-12 stack">
        <h3>Bilan de forme</h3>
        <p class="muted">Formule ${client.formula}, objectif ${client.goal}, blessures ${client.injuries.join(", ") || "aucune"}, douleurs ${client.pain.join(", ") || "aucune"}.</p>
        <p class="muted small">Derniere modification du bilan : ${formatDate(client.assessmentUpdatedAt)}</p>
        <div class="row">
          <button class="ghost" data-action="open-assessment-editor" data-client-id="${client.id}">Modifier le bilan</button>
          <button class="ghost" data-action="open-nutrition-editor" data-client-id="${client.id}">Ajuster nutrition</button>
          <button class="primary" data-action="open-workout-editor" data-client-id="${client.id}">Attribuer une seance</button>
        </div>
      </div>
    </div>
  `;
}

function renderAssessmentPanel(client, scope) {
  const targets = calculateNutritionTargets(client);
  return `
    <div class="stack">
      <div class="row between">
        <div>
          <h3>Bilan de forme complet</h3>
          <p class="muted small">Recalcule automatiquement calories et macros a la validation.</p>
        </div>
        <button class="primary" data-action="open-assessment-editor" data-client-id="${client.id}">Modifier le bilan</button>
      </div>
      <div class="grid">
        ${kpi("Age", `${client.age} ans`, ageBand(client.age))}
        ${kpi("Taille", `${client.heightCm || "-"} cm`, "bilan")}
        ${kpi("Poids", `${client.weightKg || "-"} kg`, "bilan")}
        ${kpi("Masse grasse", `${client.bodyFatPercent || 0}%`, "estimee")}
      </div>
      <div class="list-item">
        <strong>${client.firstName} ${client.lastName}</strong>
        <p class="muted">Sexe ${client.sex}, formule ${client.formula}, objectif ${client.goal}, niveau ${client.level}, sport ${client.sport}, activite ${client.activityHours} h/semaine.</p>
        <p class="muted">Blessures : ${client.injuries.join(", ") || "aucune"}. Douleurs : ${client.pain.join(", ") || "aucune"}.</p>
        <p class="muted">Preferences : ${client.foodPreferences.join(", ") || "aucune"}. Allergies : ${client.allergies.join(", ") || "aucune"}. Restrictions : ${client.restrictions.join(", ") || "aucune"}.</p>
        <p class="muted small">Macros recalculees possibles : ${targets.calories} kcal, ${targets.protein} g P, ${targets.carbs} g G, ${targets.fat} g L.</p>
        <p class="muted small">Derniere modification : ${formatDate(client.assessmentUpdatedAt)} par ${client.assessmentUpdatedBy || "demo"}.</p>
      </div>
      ${scope === "client" ? `<button class="primary" data-action="open-assessment-editor" data-client-id="${client.id}">Modifier mon bilan</button>` : ""}
    </div>
  `;
}

function renderTrainingPanel(client, scope) {
  const workouts = client.assignedWorkouts || [];
  return `
    <div class="stack">
      <div class="row between">
        <div>
          <h3>Entrainement</h3>
          <p class="muted small">${workouts.length} seance(s) attribuee(s).</p>
        </div>
        ${scope === "coach" ? `<button class="primary" data-action="open-workout-editor" data-client-id="${client.id}">Attribuer une seance</button>` : ""}
      </div>
      <div class="list">
        ${workouts.map((workout) => renderWorkoutCard(client, workout, scope)).join("") || `<p class="muted">Aucune seance attribuee pour le moment.</p>`}
      </div>
    </div>
  `;
}

function renderWorkoutCard(client, workout, scope) {
  return `
    <article class="list-item">
      <div class="row between">
        <div>
          <strong>${workout.title}</strong>
          <p class="muted small">${workout.date} - ${workout.durationMinutes} min - ${workout.focus}</p>
        </div>
        <span class="pill ${workout.status === "completed" ? "ok" : "gold"}">${workout.status === "completed" ? "terminee" : "prevue"}</span>
      </div>
      <p class="muted">${workout.exercises.join(", ")}</p>
      <p class="muted small">${workout.notes || "Aucune consigne supplementaire."}</p>
      ${scope === "client" && workout.status !== "completed" ? `<button class="primary" data-action="complete-workout" data-client-id="${client.id}" data-workout-id="${workout.id}">Terminer la seance</button>` : ""}
    </article>
  `;
}

function renderNutritionEditorPanel(client) {
  return `
    <div class="stack">
      <div class="row between">
        <div>
          <h3>Nutrition</h3>
          <p class="muted small">Macros visibles par le client apres validation.</p>
        </div>
        <button class="primary" data-action="open-nutrition-editor" data-client-id="${client.id}">Modifier les macros</button>
      </div>
      <div class="grid">
        ${kpi("Calories", client.nutrition.calories, "kcal")}
        ${kpi("Proteines", `${client.nutrition.protein} g`, "jour")}
        ${kpi("Glucides", `${client.nutrition.carbs} g`, "jour")}
        ${kpi("Lipides", `${client.nutrition.fat} g`, "jour")}
      </div>
      <p class="muted">Hydratation cible : ${client.nutrition.waterLiters} L par jour.</p>
    </div>
  `;
}

function renderProgressPanel(client) {
  const latest = client.checkins.at(-1);
  const completed = (client.workouts || []).length;
  return `
    <div class="grid">
      ${kpi("Poids actuel", `${latest?.weight || client.weightKg} kg`, "dernier bilan")}
      ${kpi("Seances", completed, "terminees")}
      ${kpi("Energie", latest ? `${latest.energy}/10` : "-", "dernier bilan")}
      ${kpi("Adherence", latest ? `${latest.adherence}%` : "-", "semaine")}
    </div>
  `;
}

function renderMessagesPanel(client) {
  return `<div class="list-item"><strong>Messages</strong><p class="muted">Aucun message en attente pour ${client.firstName}. Les actions visibles restent limitees aux donnees disponibles.</p></div>`;
}

function renderHistoryPanel(client) {
  const related = state.auditLogs.filter((log) => log.entityId === client.id || log.summary === client.id).slice(0, 8);
  return `
    <div class="list">
      ${related.map((log) => `<article class="list-item"><strong>${log.action}</strong><p class="muted small">${formatDate(log.createdAt)} - ${log.summary || log.entityId}</p></article>`).join("") || `<p class="muted">Aucun historique detaille pour ce client dans cette session.</p>`}
    </div>
  `;
}

function renderAiCoach() {
  const client = selectedClient();
  const analysis = analyzeClient(client);
  return `
    <div class="grid">
      <section class="panel span-8 stack">
        <div class="row between">
          <h2>Agent IA Coach</h2>
          <span class="pill gold">Confiance ${analysis.confidence}%</span>
        </div>
        <p class="muted">Donnees utilisees : ${analysis.dataUsed.join(", ")}.</p>
        <div class="row">
          <button class="primary" data-action="analyze-all">Analyser tous les clients</button>
          <button class="ghost" data-action="prepare-nutrition" data-client-id="${client.id}">Preparer nutrition</button>
          <button class="ghost" data-action="prepare-training" data-client-id="${client.id}">Preparer entrainement</button>
        </div>
        <div class="list">
          ${analysis.detections.map((item) => `<article class="list-item"><span class="pill ${item.level === "urgent" ? "urgent" : ""}">${item.level}</span><strong>${item.label}</strong><p class="muted">${item.reason}</p></article>`).join("") || `<article class="list-item"><strong>Aucun risque majeur</strong><p class="muted">Le suivi actuel reste coherent avec l'objectif.</p></article>`}
        </div>
      </section>
      <section class="panel span-4 stack">
        <h2>Validations</h2>
        ${state.approvals.filter((item) => item.status === "pending").map(renderApproval).join("") || `<p class="muted">Aucune action visible en attente.</p>`}
      </section>
    </div>
  `;
}

function renderApproval(approval) {
  const client = state.clients.find((item) => item.id === approval.clientId);
  return `
    <article class="list-item">
      <strong>${client?.firstName || "Client"} - ${approval.kind}</strong>
      <p class="muted">${approval.analysis.recommendations.join(" ")}</p>
      <div class="row">
        <button class="primary" data-action="approve-ai" data-approval-id="${approval.id}">Valider</button>
        <button class="danger" data-action="reject-ai" data-approval-id="${approval.id}">Refuser</button>
      </div>
    </article>
  `;
}

function renderContents() {
  const client = selectedClient();
  const recipes = (state.recipes || []).slice(0, 12);
  return `
    <div class="grid">
      <section class="panel span-4 stack">
        <h2>Creation rapide</h2>
        ${contentShortcuts.map(([type, label]) => `<button class="ghost" data-action="open-create" data-type="${type}">${label}</button>`).join("")}
      </section>
      <section class="panel span-8 stack">
        <div class="row between">
          <h2>Bibliotheque coach</h2>
          <span class="pill">${state.contents.length} contenus</span>
        </div>
        <div class="list">
          ${state.contents.map(renderContentCard).join("")}
        </div>
      </section>
      <section class="panel span-12 stack">
        <h2>Modeles</h2>
        <div class="list">${state.templates.map(renderTemplate).join("") || `<p class="muted">Transforme un contenu en modele pour l'appliquer a plusieurs clients.</p>`}</div>
      </section>
      <section class="panel span-12 stack">
        <div class="row between">
          <div>
            <h2>Corner Cuisine coach</h2>
            <p class="muted small">Envoi manuel vers ${client.firstName}. L'envoi rend la recette visible meme si la formule ne correspond pas, sauf conflit allergie/restriction.</p>
          </div>
          <span class="pill">${state.recipes.length} recettes</span>
        </div>
        <div class="recipe-grid compact">
          ${recipes.map((recipe) => `
            <article class="recipe-card">
              <img src="${recipe.imageUrl}" alt="${escapeAttr(recipe.imageAlt)}" />
              <div class="stack">
                <strong>${recipe.name}</strong>
                <p class="muted small">${recipe.calories} kcal - ${recipe.protein} g proteines - ${recipe.formulas.join(", ")}</p>
                <div class="row">
                  <button class="ghost" data-action="open-recipe-detail" data-recipe-id="${recipe.id}">Details</button>
                  <button class="primary" data-action="assign-recipe" data-client-id="${client.id}" data-recipe-id="${recipe.id}">Envoyer</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderContentCard(content) {
  return `
    <article class="list-item">
      <div class="row between">
        <div>
          <strong>${content.title}</strong>
          <p class="muted small">${contentTypes[content.type]} - ${content.status}</p>
        </div>
        <span class="pill">${describeTarget(content.target)}</span>
      </div>
      <div class="row">
        <button class="primary" data-action="publish-content" data-content-id="${content.id}">Publier</button>
        <button class="ghost" data-action="schedule-content" data-content-id="${content.id}">Programmer</button>
        <button class="ghost" data-action="duplicate-content" data-content-id="${content.id}">Dupliquer</button>
        <button class="ghost" data-action="save-template" data-content-id="${content.id}">Modele</button>
        <button class="danger" data-action="archive-content" data-content-id="${content.id}">Archiver</button>
      </div>
    </article>
  `;
}

function renderTemplate(template) {
  return `
    <article class="list-item">
      <strong>${template.title}</strong>
      <p class="muted small">Modele ${contentTypes[template.sourceType]}</p>
      <button class="primary" data-action="apply-template" data-template-id="${template.id}">Appliquer aux clients selectionnes</button>
    </article>
  `;
}

function renderNotifications() {
  return `
    <section class="panel stack">
      <h2>Centre de notifications</h2>
      <div class="list">${state.notifications.map(renderNotificationCard).join("")}</div>
    </section>
  `;
}

function renderNotificationCard(item) {
  const client = state.clients.find((entry) => entry.id === item.clientId);
  return `
    <article class="list-item">
      <div class="row between">
        <strong>${item.title}</strong>
        <span class="pill ${item.level === "urgent" ? "urgent" : ""}">${item.level}</span>
      </div>
      <p class="muted small">${client ? `${client.firstName} ${client.lastName}` : "General"} - ${item.status}</p>
      <div class="row">
        <button class="ghost" data-action="mark-notification" data-notification-id="${item.id}">Marquer traitee</button>
        <button class="danger" data-action="archive-notification" data-notification-id="${item.id}">Archiver</button>
      </div>
    </article>
  `;
}

function renderClient() {
  const client = selectedClient();
  const section = ui.clientSection;
  return `
    <header class="hero">
      <div class="stack">
        <span class="pill gold">Espace client personnalise</span>
        <h1>Bonjour ${client.firstName}</h1>
        <p class="muted">Objectif : ${client.goal}. Seuls les contenus compatibles avec ton profil sont visibles.</p>
      </div>
      <select data-action="set-client" aria-label="Client de demo">
        ${state.clients.map((item) => `<option value="${item.id}" ${item.id === client.id ? "selected" : ""}>${item.firstName}</option>`).join("")}
      </select>
    </header>
    ${section === "home" ? renderClientHome(client) : ""}
    ${section === "program" ? `<section class="panel">${renderTrainingPanel(client, "client")}</section>` : ""}
    ${section === "nutrition" ? renderClientNutrition(client) : ""}
    ${section === "library" ? renderClientLibrary(client) : ""}
    ${section === "assessment" ? `<section class="panel">${renderAssessmentPanel(client, "client")}</section>` : ""}
    ${section === "progress" ? `<section class="panel">${renderProgressPanel(client)}</section>` : ""}
    ${!["home", "program", "nutrition", "library", "assessment", "progress"].includes(section) ? renderComingFromData(client, section) : ""}
  `;
}

function renderClientHome(client) {
  const latest = client.checkins.at(-1);
  return `
    <div class="grid">
      ${kpi("Objectif", client.goal, "priorite actuelle")}
      ${kpi("Hydratation", `${latest?.hydrationLiters || 0} L`, `cible ${client.nutrition.waterLiters} L`)}
      ${kpi("Sommeil", latest ? `${latest.sleepHours} h` : "-", "dernier bilan")}
      ${kpi("Badges", client.badges.length, "debloques")}
      <section class="panel span-12 stack">
        <h2>Action prioritaire</h2>
        <p class="muted">${latest?.sleepHours < 6 ? "Recuperation prioritaire : viser une nuit plus longue avant la prochaine seance intense." : "Continuer la routine actuelle et valider la prochaine seance."}</p>
      </section>
    </div>
  `;
}

function renderClientNutrition(client) {
  const recipes = visibleRecipesForClient(state, client.id, { query: ui.recipeQuery, filter: ui.recipeFilter, sort: ui.recipeSort });
  return `
    <section class="panel stack">
      <div class="row between">
        <div>
          <h2>Corner Cuisine</h2>
          <p class="muted">Recettes filtrees selon formule, macros, allergies, restrictions, sport et envois coach.</p>
        </div>
        <span class="pill gold">${recipes.length} recette(s)</span>
      </div>
      <div class="grid">
        ${kpi("Calories", client.nutrition.calories, "cible")}
        ${kpi("Proteines", `${client.nutrition.protein} g`, "cible")}
        ${kpi("Glucides", `${client.nutrition.carbs} g`, "cible")}
        ${kpi("Lipides", `${client.nutrition.fat} g`, "cible")}
      </div>
      <p class="muted">Hydratation cible : ${client.nutrition.waterLiters} L par jour.</p>
      <div class="recipe-toolbar">
        <label>Recherche <input data-action="set-recipe-query" value="${escapeAttr(ui.recipeQuery)}" placeholder="Plat, ingredient..." /></label>
        <label>Filtre
          <select data-action="set-recipe-filter">
            ${[
              ["all", "Toutes"],
              ["favorites", "Favoris"],
              ["perte", "Perte"],
              ["masse", "Masse"],
              ["maintien", "Maintien"],
              ["performance", "Performance"],
              ["vegetarien", "Vegetarien"],
              ["sans gluten", "Sans gluten"]
            ].map(([value, label]) => `<option value="${value}" ${ui.recipeFilter === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label>Tri
          <select data-action="set-recipe-sort">
            ${[
              ["recommended", "Recommande"],
              ["calories", "Calories"],
              ["protein", "Proteines"],
              ["duration", "Duree"],
              ["difficulty", "Difficulte"]
            ].map(([value, label]) => `<option value="${value}" ${ui.recipeSort === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="recipe-grid">${recipes.map((recipe) => renderRecipeCard(client, recipe)).join("") || `<p class="muted">Aucune recette compatible avec ce filtre.</p>`}</div>
    </section>
  `;
}

function renderRecipeCard(client, recipe) {
  return `
    <article class="recipe-card">
      <img src="${recipe.imageUrl}" alt="${escapeAttr(recipe.imageAlt)}" />
      <div class="stack">
        <div class="row between">
          <strong>${recipe.name}</strong>
          <span class="pill">${recipe.compatibility.score}%</span>
        </div>
        <p class="muted">${recipe.description}</p>
        <div class="row">
          <span class="pill ok">${recipe.compatibility.planBadge}</span>
          <span class="pill gold">${recipe.isAssignedByCoach ? "Envoye par votre coach" : recipe.compatibility.goalBadge}</span>
        </div>
        <div class="recipe-macros">
          <span>${recipe.calories} kcal</span>
          <span>${recipe.protein} g P</span>
          <span>${recipe.carbs} g G</span>
          <span>${recipe.fat} g L</span>
        </div>
        <div class="row">
          <button class="primary" data-action="open-recipe-detail" data-recipe-id="${recipe.id}">Voir la recette</button>
          <button class="ghost" data-action="toggle-recipe-favorite" data-client-id="${client.id}" data-recipe-id="${recipe.id}">${recipe.isFavorite ? "Retirer favori" : "Ajouter favori"}</button>
        </div>
      </div>
    </article>
  `;
}

function renderClientLibrary(client) {
  const items = visibleContentsForClient(state, client.id).filter((content) => ["revision", "dossier"].includes(content.type));
  return `
    <section class="panel stack">
      <h2>Bibliotheque intelligente</h2>
      <p class="muted">Fiches et dossiers adaptes a ton age, niveau, objectif, sport et douleurs.</p>
      <div class="list">${items.map(renderClientContent).join("") || `<p class="muted">Aucun contenu compatible publie pour le moment.</p>`}</div>
    </section>
  `;
}

function renderClientContent(content) {
  return `
    <article class="list-item">
      <strong>${content.title}</strong>
      <p class="muted">${content.payload.description || content.payload.summary || "Contenu envoye par le coach."}</p>
      ${content.type === "recipe" ? `<span class="pill">${content.payload.calories} kcal - ${content.payload.protein} g proteines</span>` : ""}
    </article>
  `;
}

function renderComingFromData(client, section) {
  return `
    <section class="panel stack">
      <h2>${clientSections.find(([id]) => id === section)?.[1]}</h2>
      <p class="muted">Cette vue affiche uniquement les donnees deja raccordees au profil ${client.firstName}, sans action decorative.</p>
      ${renderClientSummary(client)}
    </section>
  `;
}

function renderModal() {
  if (ui.modal.kind === "create") return renderCreateModal(ui.modal.type);
  if (ui.modal.kind === "assessment") return renderAssessmentModal(selectedClient());
  if (ui.modal.kind === "nutrition") return renderNutritionModal(selectedClient());
  if (ui.modal.kind === "workout") return renderWorkoutModal(selectedClient());
  if (ui.modal.kind === "recipe-detail") return renderRecipeDetailModal(getRecipeById(state, ui.selectedRecipeId));
  return "";
}

function renderRecipeDetailModal(recipe) {
  if (!recipe) return "";
  return `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Detail recette">
      <article class="modal-card stack">
        <div class="row between">
          <div>
            <h2>${recipe.name}</h2>
            <p class="muted">${recipe.objective} - ${recipe.portions} portion(s)</p>
          </div>
          <button type="button" class="ghost" data-action="close-modal">Fermer</button>
        </div>
        <img class="recipe-hero-image" src="${recipe.imageUrl}" alt="${escapeAttr(recipe.imageAlt)}" />
        <div class="grid">
          ${kpi("Calories", recipe.calories, "kcal")}
          ${kpi("Proteines", `${recipe.protein} g`, "portion")}
          ${kpi("Glucides", `${recipe.carbs} g`, "portion")}
          ${kpi("Lipides", `${recipe.fat} g`, "portion")}
        </div>
        <p class="muted">${recipe.description}</p>
        <div class="list-item">
          <strong>Ingredients</strong>
          <p class="muted">${recipe.ingredients.map((item) => `${item.quantity} ${item.name}`).join(", ")}</p>
        </div>
        <div class="list-item">
          <strong>Etapes</strong>
          <ol>${recipe.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
        </div>
        <div class="list-item">
          <strong>Variantes et substitutions</strong>
          <p class="muted">${recipe.variants.join(", ")}. ${recipe.substitutions.join(", ")}.</p>
        </div>
        <p class="muted"><strong>Conseil coach :</strong> ${recipe.coachTip}</p>
        <div class="row">
          <span class="pill">${recipe.prepMinutes} min prep</span>
          <span class="pill">${recipe.cookMinutes} min cuisson</span>
          <span class="pill">${recipe.difficulty}</span>
          ${recipe.allergens.length ? `<span class="pill urgent">Allergenes: ${recipe.allergens.join(", ")}</span>` : `<span class="pill ok">Sans allergene majeur indique</span>`}
        </div>
      </article>
    </div>
  `;
}

function renderCreateModal(type) {
  return `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Creation de contenu">
      <form class="modal-card stack" id="create-content-form">
        <div class="row between">
          <div>
            <h2>${contentTypes[type]}</h2>
            <p class="muted">Formulaire reel : l'element est enregistre dans l'application.</p>
          </div>
          <button type="button" class="ghost" data-action="close-modal">Fermer</button>
        </div>
        <input type="hidden" name="type" value="${type}" />
        <label>Titre <input name="title" required placeholder="Nom clair du contenu" /></label>
        <label>Description <textarea name="description" required placeholder="Objectif, consignes ou message"></textarea></label>
        <div class="grid">
          <label class="span-6">Statut
            <select name="status">
              <option value="draft">Brouillon</option>
              <option value="published">Publier maintenant</option>
              <option value="scheduled">Programmer</option>
            </select>
          </label>
          <label class="span-6">Ciblage
            <select name="targetMode">
              <option value="all">Tous les clients</option>
              <option value="profile">Profil compatible</option>
              <option value="manual">Client selectionne</option>
            </select>
          </label>
          <label class="span-6">Formule
            <select name="formula">
              <option value="">Indifferent</option>
              <option value="perte">Perte de poids</option>
              <option value="masse">Prise de masse</option>
              <option value="maintien">Maintien</option>
            </select>
          </label>
          <label class="span-6">Client manuel
            <select name="clientId">
              ${state.clients.map((client) => `<option value="${client.id}">${client.firstName} ${client.lastName}</option>`).join("")}
            </select>
          </label>
        </div>
        ${type === "recipe" ? recipeFields() : ""}
        <button class="primary" type="submit">Enregistrer</button>
      </form>
    </div>
  `;
}

function recipeFields() {
  return `
    <div class="grid">
      <label class="span-3">Calories <input name="calories" type="number" min="0" value="520" /></label>
      <label class="span-3">Proteines <input name="protein" type="number" min="0" value="40" /></label>
      <label class="span-3">Glucides <input name="carbs" type="number" min="0" value="55" /></label>
      <label class="span-3">Lipides <input name="fat" type="number" min="0" value="16" /></label>
      <label class="span-6">Temps preparation <input name="prepMinutes" type="number" min="0" value="12" /></label>
      <label class="span-6">Temps cuisson <input name="cookMinutes" type="number" min="0" value="18" /></label>
    </div>
  `;
}

function renderAssessmentModal(client) {
  return `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Modification du bilan">
      <form class="modal-card stack" id="assessment-form">
        <div class="row between">
          <div>
            <h2>Bilan de ${client.firstName}</h2>
            <p class="muted">La validation recalcule automatiquement calories et macros.</p>
          </div>
          <button type="button" class="ghost" data-action="close-modal">Fermer</button>
        </div>
        <input type="hidden" name="clientId" value="${client.id}" />
        <div class="grid">
          <label class="span-3">Age <input name="age" type="number" min="10" max="100" value="${client.age}" required /></label>
          <label class="span-3">Taille cm <input name="heightCm" type="number" min="120" max="230" value="${client.heightCm || 170}" required /></label>
          <label class="span-3">Poids kg <input name="weightKg" type="number" min="30" max="250" step="0.1" value="${client.weightKg || 70}" required /></label>
          <label class="span-3">Masse grasse % <input name="bodyFatPercent" type="number" min="0" max="70" step="0.1" value="${client.bodyFatPercent || 0}" /></label>
          <label class="span-4">Sexe
            <select name="sex">
              <option value="homme" ${client.sex === "homme" ? "selected" : ""}>Homme</option>
              <option value="femme" ${client.sex === "femme" ? "selected" : ""}>Femme</option>
            </select>
          </label>
          <label class="span-4">Formule
            <select name="formula">
              <option value="perte" ${client.formula === "perte" ? "selected" : ""}>Perte de poids</option>
              <option value="masse" ${client.formula === "masse" ? "selected" : ""}>Prise de masse</option>
              <option value="maintien" ${client.formula === "maintien" ? "selected" : ""}>Maintien</option>
            </select>
          </label>
          <label class="span-4">Niveau
            <select name="level">
              <option value="debutant" ${client.level === "debutant" ? "selected" : ""}>Debutant</option>
              <option value="intermediaire" ${client.level === "intermediaire" ? "selected" : ""}>Intermediaire</option>
              <option value="avance" ${client.level === "avance" ? "selected" : ""}>Avance</option>
            </select>
          </label>
          <label class="span-6">Objectif <input name="goal" value="${escapeAttr(client.goal)}" required /></label>
          <label class="span-6">Sport <input name="sport" value="${escapeAttr(client.sport)}" required /></label>
          <label class="span-6">Heures d'activite / semaine <input name="activityHours" type="number" min="0" max="30" step="0.5" value="${client.activityHours}" /></label>
          <label class="span-6">Blessures <input name="injuries" value="${escapeAttr(client.injuries.join(", "))}" /></label>
          <label class="span-6">Douleurs <input name="pain" value="${escapeAttr(client.pain.join(", "))}" /></label>
          <label class="span-6">Preferences alimentaires <input name="foodPreferences" value="${escapeAttr(client.foodPreferences.join(", "))}" /></label>
          <label class="span-6">Allergies <input name="allergies" value="${escapeAttr(client.allergies.join(", "))}" /></label>
          <label class="span-6">Restrictions <input name="restrictions" value="${escapeAttr(client.restrictions.join(", "))}" /></label>
        </div>
        <button class="primary" type="submit">Valider et recalculer</button>
      </form>
    </div>
  `;
}

function renderNutritionModal(client) {
  return `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Modification nutrition">
      <form class="modal-card stack" id="nutrition-form">
        <div class="row between">
          <div>
            <h2>Nutrition de ${client.firstName}</h2>
            <p class="muted">Les nouvelles valeurs sont visibles immediatement cote client.</p>
          </div>
          <button type="button" class="ghost" data-action="close-modal">Fermer</button>
        </div>
        <input type="hidden" name="clientId" value="${client.id}" />
        <div class="grid">
          <label class="span-3">Calories <input name="calories" type="number" min="1000" max="6000" value="${client.nutrition.calories}" required /></label>
          <label class="span-3">Proteines <input name="protein" type="number" min="30" max="400" value="${client.nutrition.protein}" required /></label>
          <label class="span-3">Glucides <input name="carbs" type="number" min="30" max="800" value="${client.nutrition.carbs}" required /></label>
          <label class="span-3">Lipides <input name="fat" type="number" min="20" max="250" value="${client.nutrition.fat}" required /></label>
          <label class="span-6">Hydratation L <input name="waterLiters" type="number" min="1" max="6" step="0.1" value="${client.nutrition.waterLiters}" required /></label>
        </div>
        <button class="primary" type="submit">Enregistrer les macros</button>
      </form>
    </div>
  `;
}

function renderWorkoutModal(client) {
  return `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Attribuer une seance">
      <form class="modal-card stack" id="workout-form">
        <div class="row between">
          <div>
            <h2>Nouvelle seance</h2>
            <p class="muted">La seance est attribuee a ${client.firstName} et visible dans son programme.</p>
          </div>
          <button type="button" class="ghost" data-action="close-modal">Fermer</button>
        </div>
        <input type="hidden" name="clientId" value="${client.id}" />
        <label>Titre <input name="title" required value="Seance adaptee ${escapeAttr(client.goal)}" /></label>
        <div class="grid">
          <label class="span-4">Date <input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required /></label>
          <label class="span-4">Duree min <input name="durationMinutes" type="number" min="10" max="180" value="45" required /></label>
          <label class="span-4">Focus <input name="focus" value="${client.pain.length ? "adaptation douleur" : "progression"}" /></label>
        </div>
        <label>Exercices <textarea name="exercises" required>${client.pain.length ? "Mobilite ciblee, Presse controlee, Tirage assis, Gainage respiration" : "Squat, Developpe couche, Rowing, Gainage"}</textarea></label>
        <label>Consignes <textarea name="notes">${client.pain.length ? "Adapter l'amplitude et stopper si douleur superieure a 3/10." : "Conserver deux repetitions en reserve sur chaque serie."}</textarea></label>
        <button class="primary" type="submit">Attribuer la seance</button>
      </form>
    </div>
  `;
}

function kpi(label, value, hint) {
  return `<article class="kpi span-3"><span class="muted small">${label}</span><strong>${value}</strong><span class="muted small">${hint}</span></article>`;
}

const ACTIONS = {
  "switch-role": (button) => persist({ ...state, currentRole: button.dataset.role }),
  "set-coach-section": (button) => { ui.coachSection = button.dataset.section; render(); },
  "set-client-section": (button) => { ui.clientSection = button.dataset.section; render(); },
  "set-client-tab": (button) => { ui.clientTab = button.dataset.tab; render(); },
  "toggle-theme": () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; render(); },
  "reset-demo": () => { state = resetState(); ui = { coachSection: "home", clientSection: "home", clientTab: "resume", selectedClientId: state.currentClientId, recipeQuery: "", recipeFilter: "all", recipeSort: "recommended", selectedRecipeId: null, modal: null, toast: "Demo reinitialisee" }; persist(state); },
  "open-create": (button) => { ui.modal = { kind: "create", type: button.dataset.type }; render(); },
  "open-assessment-editor": (button) => { ui.selectedClientId = button.dataset.clientId; ui.modal = { kind: "assessment" }; render(); },
  "open-nutrition-editor": (button) => { ui.selectedClientId = button.dataset.clientId; ui.modal = { kind: "nutrition" }; render(); },
  "open-workout-editor": (button) => { ui.selectedClientId = button.dataset.clientId; ui.modal = { kind: "workout" }; render(); },
  "close-modal": () => { ui.modal = null; render(); },
  "publish-content": (button) => persistToast(updateContentStatus(state, button.dataset.contentId, "published"), "Contenu publie"),
  "schedule-content": (button) => persistToast(updateContentStatus(state, button.dataset.contentId, "scheduled"), "Contenu programme"),
  "archive-content": (button) => persistToast(updateContentStatus(state, button.dataset.contentId, "archived"), "Contenu archive"),
  "duplicate-content": (button) => persistToast(duplicateContent(state, button.dataset.contentId), "Contenu duplique"),
  "save-template": (button) => persistToast(createTemplate(state, button.dataset.contentId), "Modele cree"),
  "apply-template": (button) => persistToast(applyTemplateToClients(state, button.dataset.templateId, state.clients.map((client) => client.id)), "Modele applique aux clients"),
  "analyze-client": (button) => { ui.coachSection = "ai"; ui.selectedClientId = button.dataset.clientId; render(); },
  "analyze-all": () => {
    const next = state.clients.reduce((acc, client) => createAiApproval(acc, client.id, "nutrition"), state);
    persistToast(next, "Analyses IA preparees");
  },
  "prepare-nutrition": (button) => persistToast(createAiApproval(state, button.dataset.clientId, "nutrition"), "Modification nutritionnelle preparee"),
  "prepare-training": (button) => persistToast(createAiApproval(state, button.dataset.clientId, "training"), "Modification entrainement preparee"),
  "approve-ai": (button) => persistToast(resolveApproval(state, button.dataset.approvalId, "approved"), "Proposition IA validee"),
  "reject-ai": (button) => persistToast(resolveApproval(state, button.dataset.approvalId, "rejected"), "Proposition IA refusee"),
  "mark-notification": (button) => persistToast(updateNotification(state, button.dataset.notificationId, "handled"), "Notification traitee"),
  "archive-notification": (button) => persistToast(updateNotification(state, button.dataset.notificationId, "archived"), "Notification archivee"),
  "open-client": (button) => { ui.selectedClientId = button.dataset.clientId; ui.clientTab = "resume"; render(); },
  "complete-workout": (button) => persistToast(completeAssignedWorkout(state, button.dataset.clientId, button.dataset.workoutId), "Seance terminee"),
  "set-recipe-query": (input) => { ui.recipeQuery = input.value; render(); },
  "set-recipe-filter": (select) => { ui.recipeFilter = select.value; render(); },
  "set-recipe-sort": (select) => { ui.recipeSort = select.value; render(); },
  "toggle-recipe-favorite": (button) => persistToast(toggleRecipeFavorite(state, button.dataset.clientId, button.dataset.recipeId), "Favoris mis a jour"),
  "open-recipe-detail": (button) => { ui.selectedRecipeId = button.dataset.recipeId; ui.modal = { kind: "recipe-detail" }; render(); },
  "assign-recipe": (button) => persistToast(assignRecipeToClient(state, button.dataset.recipeId, button.dataset.clientId, state.currentRole), "Recette envoyee au client"),
  "set-client": (select) => { ui.selectedClientId = select.value; state.currentClientId = select.value; persist(state); }
};

export { ACTIONS };

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (!ACTIONS[action]) throw new Error(`Action non implementee: ${action}`);
  ACTIONS[action](target);
});

document.addEventListener("change", (event) => {
  if (event.target.dataset.action === "set-client") ACTIONS["set-client"](event.target);
  if (event.target.dataset.action === "set-recipe-filter") ACTIONS["set-recipe-filter"](event.target);
  if (event.target.dataset.action === "set-recipe-sort") ACTIONS["set-recipe-sort"](event.target);
});

document.addEventListener("input", (event) => {
  if (event.target.dataset.action === "set-recipe-query") ACTIONS["set-recipe-query"](event.target);
});

document.addEventListener("submit", (event) => {
  if (!["create-content-form", "assessment-form", "nutrition-form", "workout-form"].includes(event.target.id)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  if (event.target.id === "assessment-form") {
    ui.modal = null;
    persistToast(updateClientAssessment(state, data.clientId, data, state.currentRole), "Bilan mis a jour et macros recalculees");
    return;
  }
  if (event.target.id === "nutrition-form") {
    ui.modal = null;
    persistToast(updateClientNutrition(state, data.clientId, data, state.currentRole), "Macros mises a jour");
    return;
  }
  if (event.target.id === "workout-form") {
    ui.modal = null;
    persistToast(assignWorkoutToClient(state, data.clientId, data, state.currentRole), "Seance attribuee");
    return;
  }
  const payload = {
    description: data.description,
    summary: data.description,
    calories: Number(data.calories || 0),
    protein: Number(data.protein || 0),
    carbs: Number(data.carbs || 0),
    fat: Number(data.fat || 0),
    prepMinutes: Number(data.prepMinutes || 0),
    cookMinutes: Number(data.cookMinutes || 0),
    ingredients: [],
    steps: [],
    coachTip: data.description
  };
  const target = buildTarget(data);
  ui.modal = null;
  persistToast(createContent(state, { type: data.type, title: data.title, status: data.status, target, payload }), "Element enregistre");
});

function buildTarget(data) {
  if (data.targetMode === "manual") return { mode: "manual", clientIds: [data.clientId] };
  if (data.targetMode === "profile") return { mode: "profile", formulas: data.formula ? [data.formula] : [] };
  return { mode: "all" };
}

function persistToast(nextState, message) {
  ui.toast = message;
  persist(nextState);
  setTimeout(() => {
    ui.toast = "";
    render();
  }, 2200);
}

function daysSince(dateString) {
  const ms = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function describeTarget(target) {
  if (!target || target.mode === "all") return "Tous";
  if (target.mode === "manual") return "Manuel";
  if (target.formulas?.length) return `Formule ${target.formulas.join(", ")}`;
  return "Profil";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

const missingActions = ACTION_NAMES.filter((name) => !ACTIONS[name]);
if (missingActions.length) throw new Error(`Actions declarees mais absentes: ${missingActions.join(", ")}`);

render();
