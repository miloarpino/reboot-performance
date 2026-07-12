"use client";

import { useEffect, useMemo, useState } from "react";
import { initialState } from "../src/seed.mjs";
import {
  ageBand,
  analyzeClient,
  assignRecipeToClient,
  clone,
  completeAssignedWorkout,
  createAiApproval,
  getRecipeById,
  resolveApproval,
  toggleRecipeFavorite,
  updateNotification,
  visibleContentsForClient,
  visibleRecipesForClient
} from "../src/domain.mjs";

const STORAGE_KEY = "reboot-performance-next-demo";

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
  ["badges", "Badges et defis"],
  ["messages", "Messages"]
];

function usePersistentState() {
  const [state, setState] = useState(() => clone(initialState));

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setState(JSON.parse(stored));
  }, []);

  const persist = (nextState: any) => {
    setState(nextState);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  };

  const reset = () => {
    const nextState = clone(initialState);
    setState(nextState);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  };

  return { state, persist, reset };
}

export default function RebootPerformanceApp() {
  const { state, persist, reset } = usePersistentState();
  const [role, setRole] = useState<"coach" | "client">("coach");
  const [coachSection, setCoachSection] = useState("home");
  const [clientSection, setClientSection] = useState("home");
  const [selectedClientId, setSelectedClientId] = useState(state.currentClientId || "client-lucas");
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("all");
  const [recipeSort, setRecipeSort] = useState("recommended");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const client = useMemo(
    () => state.clients.find((item: any) => item.id === selectedClientId) || state.clients[0],
    [selectedClientId, state.clients]
  );

  const flash = (message: string, nextState?: any) => {
    if (nextState) persist(nextState);
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const isCoach = role === "coach";
  const nav = isCoach ? coachSections : clientSections;
  const active = isCoach ? coachSection : clientSection;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Reboot Performance</strong>
          <span className="muted small">Next.js - application principale</span>
        </div>
        <div className="row">
          <button className="ghost" onClick={() => setRole("coach")} aria-pressed={isCoach}>Coach</button>
          <button className="ghost" onClick={() => setRole("client")} aria-pressed={!isCoach}>Client</button>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => isCoach ? setCoachSection(id) : setClientSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="stack">
          <button className="ghost" onClick={() => {
            document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
          }}>Changer le theme</button>
          <button className="ghost" onClick={() => {
            reset();
            setSelectedClientId(initialState.currentClientId);
            flash("Demo Next reinitialisee");
          }}>Reinitialiser la demo</button>
        </div>
      </aside>

      <section className="content">
        {isCoach ? (
          <CoachApp
            state={state}
            persist={persist}
            flash={flash}
            section={coachSection}
            setSection={setCoachSection}
            client={client}
            setClient={setSelectedClientId}
            openRecipe={setSelectedRecipeId}
          />
        ) : (
          <ClientApp
            state={state}
            persist={persist}
            flash={flash}
            section={clientSection}
            client={client}
            setClient={setSelectedClientId}
            recipeQuery={recipeQuery}
            setRecipeQuery={setRecipeQuery}
            recipeFilter={recipeFilter}
            setRecipeFilter={setRecipeFilter}
            recipeSort={recipeSort}
            setRecipeSort={setRecipeSort}
            openRecipe={setSelectedRecipeId}
          />
        )}
      </section>

      {selectedRecipeId ? (
        <RecipeModal recipe={getRecipeById(state, selectedRecipeId)} onClose={() => setSelectedRecipeId(null)} />
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function CoachApp({ state, persist, flash, section, setSection, client, setClient, openRecipe }: any) {
  const urgent = state.notifications.filter((item: any) => item.level === "urgent" && item.status !== "archived").length;
  const pending = state.approvals.filter((item: any) => item.status === "pending").length;
  const inactive = state.clients.filter((item: any) => daysSince(item.lastSeenAt) > 7).length;

  return (
    <>
      <header className="hero">
        <div className="stack">
          <span className="pill gold">Interface coach</span>
          <h1>{coachSections.find(([id]) => id === section)?.[1]}</h1>
          <p className="muted">La vraie interface est maintenant rendue par Next.js, avec donnees locales de demonstration.</p>
        </div>
      </header>

      {section === "home" ? (
        <div className="grid">
          {kpi("Actions urgentes", urgent, "a traiter")}
          {kpi("Actions IA", pending, "validations")}
          {kpi("Clients inactifs", inactive, "relances")}
          {kpi("Recettes", state.recipes.length, "Corner Cuisine")}
          <section className="panel span-12 stack">
            <h2>Centre de commandement</h2>
            <div className="list">{state.notifications.slice(0, 4).map((item: any) => notificationCard(item, state, persist, flash))}</div>
          </section>
        </div>
      ) : null}

      {section === "clients" ? (
        <div className="grid">
          <section className="panel span-4 stack">
            <h2>Clients</h2>
            {state.clients.map((item: any) => (
              <button key={item.id} className="list-item" onClick={() => setClient(item.id)}>
                <strong>{item.firstName} {item.lastName}</strong>
                <span className="muted small">{item.age} ans - {item.formula} - {item.goal}</span>
              </button>
            ))}
          </section>
          <section className="panel span-8 stack">
            <div className="row between">
              <div>
                <h2>{client.firstName} {client.lastName}</h2>
                <p className="muted">{ageBand(client.age)} - {client.level} - {client.sport}</p>
              </div>
              <button className="primary" onClick={() => setSection("ai")}>Analyser ce client</button>
            </div>
            <div className="grid">
              {kpi("Calories", client.nutrition.calories, "cible")}
              {kpi("Proteines", `${client.nutrition.protein} g`, "jour")}
              {kpi("Seances", client.assignedWorkouts?.length || 0, "attribuees")}
              {kpi("Badges", client.badges.length, "debloques")}
            </div>
            <div className="list-item">
              <strong>Bilan</strong>
              <p className="muted">Objectif {client.goal}. Blessures : {client.injuries.join(", ") || "aucune"}. Restrictions : {client.restrictions.join(", ") || "aucune"}.</p>
            </div>
          </section>
        </div>
      ) : null}

      {section === "ai" ? <AiPanel state={state} persist={persist} flash={flash} client={client} /> : null}

      {section === "contents" ? (
        <section className="panel stack">
          <div className="row between">
            <div>
              <h2>Corner Cuisine coach</h2>
              <p className="muted">Envoyer une recette au client selectionne : {client.firstName}.</p>
            </div>
            <span className="pill">{state.recipes.length} recettes</span>
          </div>
          <div className="recipe-grid compact">
            {state.recipes.slice(0, 12).map((recipe: any) => (
              <article className="recipe-card" key={recipe.id}>
                <img src={recipe.imageUrl} alt={recipe.imageAlt} />
                <div className="stack">
                  <strong>{recipe.name}</strong>
                  <p className="muted small">{recipe.calories} kcal - {recipe.formulas.join(", ")}</p>
                  <div className="row">
                    <button className="ghost" onClick={() => openRecipe(recipe.id)}>Details</button>
                    <button className="primary" onClick={() => flash("Recette envoyee", assignRecipeToClient(state, recipe.id, client.id, "coach"))}>Envoyer</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {section === "notifications" ? (
        <section className="panel stack">
          <h2>Notifications</h2>
          <div className="list">{state.notifications.map((item: any) => notificationCard(item, state, persist, flash))}</div>
        </section>
      ) : null}
    </>
  );
}

function ClientApp({ state, persist, flash, section, client, setClient, recipeQuery, setRecipeQuery, recipeFilter, setRecipeFilter, recipeSort, setRecipeSort, openRecipe }: any) {
  const recipes = visibleRecipesForClient(state, client.id, { query: recipeQuery, filter: recipeFilter, sort: recipeSort });
  const libraryItems = visibleContentsForClient(state, client.id).filter((content: any) => ["revision", "dossier"].includes(content.type));

  return (
    <>
      <header className="hero">
        <div className="stack">
          <span className="pill gold">Espace client</span>
          <h1>Bonjour {client.firstName}</h1>
          <p className="muted">Objectif : {client.goal}. Les contenus incompatibles restent invisibles.</p>
        </div>
        <select value={client.id} onChange={(event) => setClient(event.target.value)} aria-label="Client de demo">
          {state.clients.map((item: any) => <option key={item.id} value={item.id}>{item.firstName}</option>)}
        </select>
      </header>

      {section === "home" ? (
        <div className="grid">
          {kpi("Objectif", client.goal, "priorite")}
          {kpi("Calories", client.nutrition.calories, "cible")}
          {kpi("Hydratation", `${client.nutrition.waterLiters} L`, "jour")}
          {kpi("Badges", client.badges.length, "debloques")}
        </div>
      ) : null}

      {section === "program" ? (
        <section className="panel stack">
          <h2>Mon programme</h2>
          <div className="list">
            {(client.assignedWorkouts || []).map((workout: any) => (
              <article className="list-item" key={workout.id}>
                <div className="row between">
                  <strong>{workout.title}</strong>
                  <span className={`pill ${workout.status === "completed" ? "ok" : "gold"}`}>{workout.status === "completed" ? "terminee" : "prevue"}</span>
                </div>
                <p className="muted">{workout.exercises.join(", ")}</p>
                {workout.status !== "completed" ? (
                  <button className="primary" onClick={() => flash("Seance terminee", completeAssignedWorkout(state, client.id, workout.id))}>Terminer la seance</button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {section === "nutrition" ? (
        <section className="panel stack">
          <div className="row between">
            <div>
              <h2>Corner Cuisine</h2>
              <p className="muted">Personnalise selon formule, macros, allergies, restrictions et sport.</p>
            </div>
            <span className="pill gold">{recipes.length} recette(s)</span>
          </div>
          <div className="grid">
            {kpi("Calories", client.nutrition.calories, "cible")}
            {kpi("Proteines", `${client.nutrition.protein} g`, "cible")}
            {kpi("Glucides", `${client.nutrition.carbs} g`, "cible")}
            {kpi("Lipides", `${client.nutrition.fat} g`, "cible")}
          </div>
          <div className="recipe-toolbar">
            <label>Recherche <input value={recipeQuery} onChange={(event) => setRecipeQuery(event.target.value)} placeholder="Plat, ingredient..." /></label>
            <label>Filtre
              <select value={recipeFilter} onChange={(event) => setRecipeFilter(event.target.value)}>
                <option value="all">Toutes</option>
                <option value="favorites">Favoris</option>
                <option value="perte">Perte</option>
                <option value="masse">Masse</option>
                <option value="maintien">Maintien</option>
                <option value="performance">Performance</option>
                <option value="vegetarien">Vegetarien</option>
                <option value="sans gluten">Sans gluten</option>
              </select>
            </label>
            <label>Tri
              <select value={recipeSort} onChange={(event) => setRecipeSort(event.target.value)}>
                <option value="recommended">Recommande</option>
                <option value="calories">Calories</option>
                <option value="protein">Proteines</option>
                <option value="duration">Duree</option>
                <option value="difficulty">Difficulte</option>
              </select>
            </label>
          </div>
          <div className="recipe-grid">
            {recipes.map((recipe: any) => (
              <article className="recipe-card" key={recipe.id}>
                <img src={recipe.imageUrl} alt={recipe.imageAlt} />
                <div className="stack">
                  <div className="row between">
                    <strong>{recipe.name}</strong>
                    <span className="pill">{recipe.compatibility.score}%</span>
                  </div>
                  <p className="muted">{recipe.description}</p>
                  <div className="row">
                    <span className="pill ok">{recipe.compatibility.planBadge}</span>
                    <span className="pill gold">{recipe.isAssignedByCoach ? "Envoye par votre coach" : recipe.compatibility.goalBadge}</span>
                  </div>
                  <div className="recipe-macros">
                    <span>{recipe.calories} kcal</span>
                    <span>{recipe.protein} g P</span>
                    <span>{recipe.carbs} g G</span>
                    <span>{recipe.fat} g L</span>
                  </div>
                  <div className="row">
                    <button className="primary" onClick={() => openRecipe(recipe.id)}>Voir la recette</button>
                    <button className="ghost" onClick={() => flash("Favoris mis a jour", toggleRecipeFavorite(state, client.id, recipe.id))}>
                      {recipe.isFavorite ? "Retirer favori" : "Ajouter favori"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {section === "progress" ? (
        <section className="panel">
          <div className="grid">
            {kpi("Poids", `${client.checkins.at(-1)?.weight || client.weightKg} kg`, "dernier bilan")}
            {kpi("Seances", client.workouts.length, "terminees")}
            {kpi("Sommeil", `${client.checkins.at(-1)?.sleepHours || "-"} h`, "dernier bilan")}
            {kpi("Adherence", `${client.checkins.at(-1)?.adherence || "-"}%`, "semaine")}
          </div>
        </section>
      ) : null}

      {section === "assessment" ? (
        <section className="panel stack">
          <h2>Mon bilan</h2>
          <p className="muted">{client.age} ans, {client.sex}, {client.heightCm} cm, {client.weightKg} kg, formule {client.formula}.</p>
          <p className="muted">Blessures : {client.injuries.join(", ") || "aucune"}. Restrictions : {client.restrictions.join(", ") || "aucune"}.</p>
        </section>
      ) : null}

      {section === "library" ? (
        <section className="panel stack">
          <h2>Bibliotheque</h2>
          <div className="list">{libraryItems.map((content: any) => <article className="list-item" key={content.id}><strong>{content.title}</strong><p className="muted">{content.payload.summary}</p></article>)}</div>
        </section>
      ) : null}

      {["badges", "messages"].includes(section) ? (
        <section className="panel stack">
          <h2>{clientSections.find(([id]) => id === section)?.[1]}</h2>
          <p className="muted">Vue connectee aux donnees locales disponibles, sans action decorative.</p>
        </section>
      ) : null}
    </>
  );
}

function AiPanel({ state, persist, flash, client }: any) {
  const analysis = analyzeClient(client);
  return (
    <div className="grid">
      <section className="panel span-8 stack">
        <div className="row between">
          <h2>Agent IA Coach</h2>
          <span className="pill gold">Confiance {analysis.confidence}%</span>
        </div>
        <div className="row">
          <button className="primary" onClick={() => {
            const next = state.clients.reduce((acc: any, item: any) => createAiApproval(acc, item.id, "nutrition"), state);
            flash("Analyses IA preparees", next);
          }}>Analyser tous les clients</button>
          <button className="ghost" onClick={() => flash("Nutrition preparee", createAiApproval(state, client.id, "nutrition"))}>Preparer nutrition</button>
        </div>
        <div className="list">
          {analysis.detections.map((item: any) => <article className="list-item" key={item.label}><strong>{item.label}</strong><p className="muted">{item.reason}</p></article>)}
        </div>
      </section>
      <section className="panel span-4 stack">
        <h2>Validations</h2>
        {state.approvals.filter((item: any) => item.status === "pending").map((approval: any) => (
          <article className="list-item" key={approval.id}>
            <strong>{approval.kind}</strong>
            <p className="muted">{approval.analysis.recommendations.join(" ")}</p>
            <button className="primary" onClick={() => flash("Proposition validee", resolveApproval(state, approval.id, "approved"))}>Valider</button>
            <button className="danger" onClick={() => flash("Proposition refusee", resolveApproval(state, approval.id, "rejected"))}>Refuser</button>
          </article>
        ))}
      </section>
    </div>
  );
}

function RecipeModal({ recipe, onClose }: any) {
  if (!recipe) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Detail recette">
      <article className="modal-card stack">
        <div className="row between">
          <div>
            <h2>{recipe.name}</h2>
            <p className="muted">{recipe.objective} - {recipe.portions} portion(s)</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>Fermer</button>
        </div>
        <img className="recipe-hero-image" src={recipe.imageUrl} alt={recipe.imageAlt} />
        <div className="grid">
          {kpi("Calories", recipe.calories, "kcal")}
          {kpi("Proteines", `${recipe.protein} g`, "portion")}
          {kpi("Glucides", `${recipe.carbs} g`, "portion")}
          {kpi("Lipides", `${recipe.fat} g`, "portion")}
        </div>
        <div className="list-item">
          <strong>Ingredients</strong>
          <p className="muted">{recipe.ingredients.map((item: any) => `${item.quantity} ${item.name}`).join(", ")}</p>
        </div>
        <div className="list-item">
          <strong>Etapes</strong>
          <ol>{recipe.steps.map((step: string) => <li key={step}>{step}</li>)}</ol>
        </div>
        <p className="muted"><strong>Conseil coach :</strong> {recipe.coachTip}</p>
      </article>
    </div>
  );
}

function notificationCard(item: any, state: any, persist: (state: any) => void, flash: (message: string) => void) {
  return (
    <article className="list-item" key={item.id}>
      <div className="row between">
        <strong>{item.title}</strong>
        <span className={`pill ${item.level === "urgent" ? "urgent" : ""}`}>{item.level}</span>
      </div>
      <p className="muted small">{item.status}</p>
      <div className="row">
        <button className="ghost" onClick={() => {
          persist(updateNotification(state, item.id, "handled"));
          flash("Notification traitee");
        }}>Marquer traitee</button>
        <button className="danger" onClick={() => {
          persist(updateNotification(state, item.id, "archived"));
          flash("Notification archivee");
        }}>Archiver</button>
      </div>
    </article>
  );
}

function kpi(label: string, value: any, hint: string) {
  return (
    <article className="kpi span-3">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      <span className="muted small">{hint}</span>
    </article>
  );
}

function daysSince(dateString: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000));
}
