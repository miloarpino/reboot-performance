"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import {
  archivePublicationAction,
  analyzeAllClientsWithAiAction,
  analyzeClientWithAiAction,
  applyAiRecommendationAction,
  assignWorkoutAction,
  createClientAction,
  createPublicationAction,
  deletePublicationAction,
  duplicatePublicationAction,
  decideAiRecommendationAction,
  restoreAiNutritionAction,
  restoreAiTrainingAction,
  sendMessageAction,
  signInAction,
  signOutAction,
  updateAssessmentAction,
  updateNutritionAction
} from "./actions";

type ThemeChoice = "light" | "dark" | "system";
type CoachSection = "home" | "clients" | "ai" | "contents" | "notifications";
type ClientSection = "home" | "contents" | "nutrition" | "program" | "messages";
type ClientTab = "summary" | "assessment" | "nutrition" | "training" | "progress" | "messages" | "history";
type LiveStatus = "connecting" | "online" | "offline";

const coachNav: Array<{ id: CoachSection; label: string; title: string; subtitle: string }> = [
  { id: "home", label: "Accueil", title: "Centre de pilotage", subtitle: "Les priorites utiles maintenant, rien de plus." },
  { id: "clients", label: "Clients", title: "Clients", subtitle: "Une fiche claire, un onglet a la fois." },
  { id: "ai", label: "Agent IA", title: "Agent IA Coach", subtitle: "Propositions expliquees, validation obligatoire." },
  { id: "contents", label: "Contenus", title: "Contenus", subtitle: "Creer, cibler, publier, programmer et archiver." },
  { id: "notifications", label: "Notifications", title: "Notifications", subtitle: "Alertes simples, actionnables et lisibles." }
];

const clientNav: Array<{ id: ClientSection; label: string; title: string; subtitle: string }> = [
  { id: "home", label: "Accueil", title: "Aujourd'hui", subtitle: "Votre objectif, votre prochaine action, votre progression." },
  { id: "contents", label: "Contenus", title: "Contenus coach", subtitle: "Uniquement ce qui correspond a votre profil." },
  { id: "nutrition", label: "Corner Cuisine", title: "Corner Cuisine", subtitle: "Recettes adaptees a votre formule et a vos restrictions." },
  { id: "program", label: "Programme", title: "Programme", subtitle: "Vos seances a faire, terminees ou a reprendre." },
  { id: "messages", label: "Messages", title: "Messages", subtitle: "Vos echanges avec Milo." }
];

const clientTabs: Array<{ id: ClientTab; label: string }> = [
  { id: "summary", label: "Resume" },
  { id: "assessment", label: "Bilan" },
  { id: "nutrition", label: "Nutrition" },
  { id: "training", label: "Entrainement" },
  { id: "progress", label: "Progres" },
  { id: "messages", label: "Messages" },
  { id: "history", label: "Historique" }
];

export function LoginScreen({ error }: { error?: string }) {
  return (
    <main className="auth-shell">
      <section className="panel auth-panel stack">
        <div>
          <span className="pill gold">Reboot Performance</span>
          <h1>Connexion</h1>
          <p className="muted">Connectez-vous avec votre compte coach ou client Supabase.</p>
        </div>
        {error ? (
          <p className="notice danger-notice" role="alert">Email ou mot de passe incorrect. Verifiez vos identifiants puis reessayez.</p>
        ) : null}
        <form className="stack" action={signInAction}>
          <label>Email <input name="email" type="email" required placeholder="coach@milo.reboot" /></label>
          <label>Mot de passe <input name="password" type="password" required placeholder="••••••••" /></label>
          <button className="primary">Se connecter</button>
        </form>
        <p className="muted small">Le mode demonstration reste separe sur <a href="/demo">/demo</a>.</p>
      </section>
    </main>
  );
}

export function MissingProfileScreen() {
  return (
    <main className="app-shell">
      <section className="panel stack">
        <h1>Profil introuvable</h1>
        <p className="muted">Votre compte Auth existe, mais aucun profil applicatif Supabase n'est associe.</p>
        <form action={signOutAction}><button className="primary">Se deconnecter</button></form>
      </section>
    </main>
  );
}

export function CoachSupabaseApp({ profile, data }: { profile: any; data: any }) {
  const [active, setActive] = useState<CoachSection>("home");
  const [clientTab, setClientTab] = useState<ClientTab>("summary");
  const [selectedClientId, setSelectedClientId] = useState(data.clients[0]?.id || "");
  useThemePersistence();

  const selectedClient = data.clients.find((client: any) => client.id === selectedClientId) || data.clients[0];
  const selectedAssessment = selectedClient ? data.assessments.find((item: any) => item.client_id === selectedClient.id) : null;
  const selectedNutrition = selectedClient ? data.nutritionTargets.find((item: any) => item.client_id === selectedClient.id) : null;
  const selectedWorkouts = selectedClient ? data.workouts.filter((item: any) => item.client_id === selectedClient.id) : [];
  const selectedMessages = selectedClient ? data.messages.filter((item: any) => item.sender_id === selectedClient.id || item.recipient_id === selectedClient.id) : [];
  const selectedAudit = selectedClient ? data.auditLogs.filter((item: any) => item.client_id === selectedClient.id || item.actor_id === selectedClient.id) : [];
  const pendingAi = data.aiRecommendations.filter((item: any) => ["pending", "approved", "modified", "postponed"].includes(item.status));
  const urgentAi = data.aiRecommendations.filter((item: any) => ["high", "urgent"].includes(item.priority) && ["pending", "approved", "modified"].includes(item.status));
  const scheduledContents = data.contents.filter((item: any) => item.status === "scheduled");
  const recentAssessments = data.assessments.filter((item: any) => daysSince(item.updated_at || item.created_at) <= 7);
  const painAssessments = data.assessments.filter((item: any) => (item.pain || []).length || (item.injuries || []).length);
  const unreadNotifications = data.notifications.filter((item: any) => !item.read_at && item.status !== "read");
  const activeMeta = coachNav.find((item) => item.id === active) || coachNav[0];
  const demoMode = data.aiAnalyses[0]?.mode === "demo" || !data.aiAnalyses.length;

  return (
    <main className="app-shell">
      <LiveUpdateBridge profile={profile} data={data} />
      <aside className="sidebar">
        <div className="brand">
          <strong>Reboot Performance</strong>
          <span className="muted small">Espace coach</span>
        </div>
        <nav className="nav" aria-label="Navigation coach">
          {coachNav.map((item) => (
            <button key={item.id} className={active === item.id ? "active" : ""} type="button" onClick={() => setActive(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <ThemeSwitcher />
        <form action={signOutAction}><button className="ghost">Se deconnecter</button></form>
      </aside>

      <section className="content">
        <PageHeader eyebrow="Coach connecte" title={activeMeta.title} subtitle={activeMeta.subtitle} />

        {active === "home" ? (
          <section className="page-panel command-center" aria-label="Accueil coach">
            <article className="command-hero panel stack">
              <span className="pill gold">Club prive</span>
              <div>
                <h2>Bonjour {profile.first_name}</h2>
                <p className="muted">Voici les priorites de la journee. Les actions visibles ci-dessous ouvrent directement la bonne rubrique.</p>
              </div>
              <div className="quick-actions" aria-label="Raccourcis coach">
                <button className="primary" type="button" onClick={() => setActive("ai")}>Valider l'IA</button>
                <button className="ghost" type="button" onClick={() => setActive("clients")}>Ouvrir les clients</button>
                <button className="ghost" type="button" onClick={() => setActive("contents")}>Creer un contenu</button>
                <button className="ghost" type="button" onClick={() => setActive("notifications")}>Voir les alertes</button>
              </div>
            </article>
            <section className="priority-strip" aria-label="Resume de la journee">
            {kpi("Actions urgentes", urgentAi.length + painAssessments.length, "clients a surveiller")}
            {kpi("Nouveaux bilans", recentAssessments.length, "7 derniers jours")}
            {kpi("Actions IA", pendingAi.length, "en attente")}
            {kpi("Programmes", scheduledContents.length, "contenus programmes")}
            </section>
            <section className="priority-grid">
              <article className="priority-card panel">
                <span className="pill gold">Alertes clients</span>
                <strong>{painAssessments.length} dossier(s) a verifier</strong>
                <p className="muted">Douleurs, blessures ou baisse de recuperation.</p>
              </article>
              <article className="priority-card panel">
                <span className="pill gold">Notifications</span>
                <strong>{unreadNotifications.length} non lue(s)</strong>
                <p className="muted">Les alertes restent separees pour eviter le bruit.</p>
              </article>
            </section>
          </section>
        ) : null}

        {active === "clients" ? (
          <section className="page-panel stack">
            <div className="client-workspace">
              <aside className="client-rail panel stack">
                <div>
                  <h2>Mes clients</h2>
                  <p className="muted small">{data.clients.length} profil(s) rattache(s)</p>
                </div>
                <div className="client-list">
                  {data.clients.map((client: any) => {
                    const assessment = data.assessments.find((item: any) => item.client_id === client.id);
                    return (
                      <button
                        key={client.id}
                        className={`client-row ${selectedClient?.id === client.id ? "active" : ""}`}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientTab("summary");
                        }}
                      >
                        <strong>{client.first_name} {client.last_name}</strong>
                        <span>{assessment?.goal || client.objective || "Objectif a definir"}</span>
                      </button>
                    );
                  })}
                </div>
                <details className="subtle-details">
                  <summary>Ajouter un client</summary>
                  <form className="grid" action={createClientAction}>
                    <label className="span-6">Prenom <input name="firstName" required /></label>
                    <label className="span-6">Nom <input name="lastName" required /></label>
                    <label className="span-12">Email <input name="email" type="email" required /></label>
                    <label className="span-12">Mot de passe <input name="password" type="password" required minLength={8} /></label>
                    <button className="primary span-12">Creer le client</button>
                  </form>
                </details>
              </aside>

              {selectedClient ? (
                <section className="panel stack client-dossier">
                  <div className="client-profile-header">
                    <div className="client-avatar" aria-hidden="true">{initials(selectedClient)}</div>
                    <div className="client-profile-main">
                      <div className="row">
                        <span className="pill gold">{selectedAssessment?.formula || "profil"}</span>
                        <span className="pill">{painAssessments.some((item: any) => item.client_id === selectedClient.id) ? "Alerte" : "Stable"}</span>
                      </div>
                      <h2>{selectedClient.first_name} {selectedClient.last_name}</h2>
                      <p className="muted">{selectedAssessment?.goal || selectedClient.objective || "Objectif non renseigne"}</p>
                    </div>
                    <div className="client-progress-card">
                      <span className="muted small">Progression</span>
                      <strong>{selectedWorkouts.filter((workout: any) => workout.status === "completed").length}/{selectedWorkouts.length || 0}</strong>
                      <span className="muted small">seances terminees</span>
                    </div>
                  </div>
                  <div className="tabs" role="tablist" aria-label="Fiche client">
                    {clientTabs.map((tab) => (
                      <button key={tab.id} className={clientTab === tab.id ? "active" : ""} type="button" onClick={() => setClientTab(tab.id)}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <ClientDetailTab
                    tab={clientTab}
                    client={selectedClient}
                    assessment={selectedAssessment}
                    nutrition={selectedNutrition}
                    workouts={selectedWorkouts}
                    messages={selectedMessages}
                    auditLogs={selectedAudit}
                  />
                </section>
              ) : (
                <section className="panel stack"><h2>Aucun client</h2><p className="muted">Creez un client pour ouvrir sa fiche.</p></section>
              )}
            </div>
          </section>
        ) : null}

        {active === "ai" ? (
          <section className="page-panel stack">
            <div className="panel stack">
              <div className="row between">
                <div>
                  <h2>Agent IA Coach</h2>
                  <p className="muted">Chaque proposition affiche les donnees, l'ancienne valeur, la nouvelle valeur et les actions possibles.</p>
                </div>
                <span className={`pill ${demoMode ? "gold" : ""}`}>{demoMode ? "Mode demonstration IA" : "Mode API serveur"}</span>
              </div>
              <div className="grid">
                {kpi("Clients a surveiller", urgentAi.length, "priorite haute")}
                {kpi("Analyses", data.aiAnalyses.length, "en base")}
                {kpi("A valider", pendingAi.length, "propositions")}
                {kpi("Appliquees", data.aiActions.filter((item: any) => item.status === "applied").length, "auditees")}
              </div>
              <div className="row">
                <form action={analyzeAllClientsWithAiAction}><button className="primary">Analyser tous les clients</button></form>
                {selectedClient ? (
                  <form action={analyzeClientWithAiAction}>
                    <input type="hidden" name="clientId" value={selectedClient.id} />
                    <button className="primary">Analyser ce client</button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="list">
              {data.aiRecommendations.map((recommendation: any) => (
                <AiRecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
              {!data.aiRecommendations.length ? <EmptyState title="Aucune proposition IA" text="Lancez une analyse pour generer des propositions structurees." /> : null}
            </div>

            <section className="panel stack">
              <h2>Restaurations et audit IA</h2>
              <div className="list">
                {data.aiActions.map((action: any) => (
                  <article className="list-item stack" key={action.id}>
                    <div>
                      <strong>{action.action_type} - {action.status}</strong>
                      <p className="muted small">{formatDate(action.created_at)}</p>
                    </div>
                    <DiffPreview before={action.before_data} after={action.after_data} />
                    {action.status === "applied" && action.action_type === "nutrition.update" ? (
                      <form action={restoreAiNutritionAction}>
                        <input type="hidden" name="actionId" value={action.id} />
                        <button className="ghost">Restaurer les anciennes macros</button>
                      </form>
                    ) : null}
                    {action.status === "applied" && action.action_type === "training.update" ? (
                      <form action={restoreAiTrainingAction}>
                        <input type="hidden" name="actionId" value={action.id} />
                        <button className="ghost">Restaurer l'ancienne seance</button>
                      </form>
                    ) : null}
                  </article>
                ))}
                {!data.aiActions.length ? <EmptyState title="Aucune action appliquee" text="Les restaurations apparaitront ici apres validation et application." /> : null}
              </div>
            </section>
          </section>
        ) : null}

        {active === "contents" ? (
          <section className="page-panel stack">
            <PublicationCreator clients={data.clients} />
            <section className="panel stack">
              <h2>Bibliotheque publiee</h2>
              <div className="list">
                {data.contents.map((content: any) => {
                  const targets = data.publicationTargets.filter((target: any) => target.content_id === content.id);
                  return (
                    <article className="list-item" key={content.id}>
                      <div className="row between">
                        <div>
                          <strong>{content.title}</strong>
                          <p className="muted small">{content.type} - {content.status} - {formatDate(content.publish_at || content.created_at)}</p>
                          <p className="muted">{content.payload?.body}</p>
                          <span className="pill gold">{targetSummary(targets)}</span>
                        </div>
                        <div className="row">
                          <form action={duplicatePublicationAction}><input type="hidden" name="contentId" value={content.id} /><button className="ghost">Dupliquer</button></form>
                          <form action={archivePublicationAction}><input type="hidden" name="contentId" value={content.id} /><button className="ghost">Archiver</button></form>
                          <form action={deletePublicationAction}><input type="hidden" name="contentId" value={content.id} /><button className="danger">Supprimer</button></form>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!data.contents.length ? <EmptyState title="Aucun contenu" text="Creez un contenu pour alimenter les espaces clients." /> : null}
              </div>
            </section>
          </section>
        ) : null}

        {active === "notifications" ? (
          <section className="page-panel panel stack">
            <h2>Notifications</h2>
            <div className="list">
              {data.notifications.slice(0, 20).map((notification: any) => (
                <article className="list-item" key={notification.id}>
                  <strong>{notification.title || notification.type || "Notification"}</strong>
                  <p className="muted small">{notification.status || "active"} - {formatDate(notification.created_at)}</p>
                  <p>{notification.body || notification.message || "Aucun detail disponible."}</p>
                </article>
              ))}
              {!data.notifications.length ? <EmptyState title="Aucune notification" text="Les alertes coach apparaitront ici." /> : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function ClientDetailTab({ tab, client, assessment, nutrition, workouts, messages, auditLogs }: any) {
  if (tab === "summary") {
    const completed = workouts.filter((workout: any) => workout.status === "completed").length;
    return (
      <section className="grid">
        {kpi("Objectif", assessment?.goal || client.objective || "-", assessment?.formula || "formule")}
        {kpi("Poids", assessment?.weight_kg ? `${assessment.weight_kg} kg` : "-", "dernier bilan")}
        {kpi("Calories", nutrition?.calories || assessment?.calories || "-", "cible")}
        {kpi("Seances", `${completed}/${workouts.length}`, "terminees")}
      </section>
    );
  }

  if (tab === "assessment") {
    return (
      <form className="grid" action={updateAssessmentAction}>
        <input type="hidden" name="clientId" value={client.id} />
        <label className="span-3">Age <input name="age" type="number" defaultValue={assessment?.age || 30} required /></label>
        <label className="span-3">Sexe <select name="sex" defaultValue={assessment?.sex || "homme"}><option value="homme">Homme</option><option value="femme">Femme</option></select></label>
        <label className="span-3">Taille <input name="heightCm" type="number" defaultValue={assessment?.height_cm || 175} required /></label>
        <label className="span-3">Poids <input name="weightKg" type="number" step="0.1" defaultValue={assessment?.weight_kg || 75} required /></label>
        <label className="span-3">Masse grasse <input name="bodyFatPercent" type="number" step="0.1" defaultValue={assessment?.body_fat_percent || 0} /></label>
        <label className="span-3">Formule <select name="formula" defaultValue={assessment?.formula || "maintien"}><option value="perte">Perte</option><option value="masse">Masse</option><option value="maintien">Maintien</option></select></label>
        <label className="span-3">Niveau <input name="level" defaultValue={assessment?.level || "debutant"} /></label>
        <label className="span-3">Sport <input name="sport" defaultValue={assessment?.sport || "general"} /></label>
        <label className="span-6">Objectif <input name="goal" defaultValue={assessment?.goal || ""} /></label>
        <label className="span-6">Blessures <input name="injuries" defaultValue={(assessment?.injuries || []).join(", ")} /></label>
        <label className="span-6">Douleurs <input name="pain" defaultValue={(assessment?.pain || []).join(", ")} /></label>
        <label className="span-6">Preferences <input name="foodPreferences" defaultValue={(assessment?.food_preferences || []).join(", ")} /></label>
        <label className="span-6">Allergies <input name="allergies" defaultValue={(assessment?.allergies || []).join(", ")} /></label>
        <label className="span-6">Restrictions <input name="restrictions" defaultValue={(assessment?.restrictions || []).join(", ")} /></label>
        <label className="span-3">Activite h/sem <input name="activityHours" type="number" defaultValue={assessment?.activity_hours || 3} /></label>
        <button className="primary span-12">Enregistrer le bilan</button>
      </form>
    );
  }

  if (tab === "nutrition") {
    return (
      <form className="grid" action={updateNutritionAction}>
        <input type="hidden" name="clientId" value={client.id} />
        <label className="span-3">Calories <input name="calories" type="number" defaultValue={nutrition?.calories || assessment?.calories || 2200} /></label>
        <label className="span-3">Proteines <input name="protein" type="number" defaultValue={nutrition?.protein || assessment?.protein || 150} /></label>
        <label className="span-3">Glucides <input name="carbs" type="number" defaultValue={nutrition?.carbs || assessment?.carbs || 220} /></label>
        <label className="span-3">Lipides <input name="fat" type="number" defaultValue={nutrition?.fat || assessment?.fat || 70} /></label>
        <label className="span-3">Hydratation <input name="waterLiters" type="number" step="0.1" defaultValue={nutrition?.water_liters || 2.4} /></label>
        <button className="primary span-12">Modifier la nutrition</button>
      </form>
    );
  }

  if (tab === "training") {
    return (
      <section className="stack">
        <form className="grid" action={assignWorkoutAction}>
          <input type="hidden" name="clientId" value={client.id} />
          <label className="span-4">Titre <input name="title" required defaultValue="Seance personnalisee" /></label>
          <label className="span-4">Date <input name="scheduledFor" type="date" required /></label>
          <label className="span-4">Duree <input name="durationMinutes" type="number" defaultValue={45} /></label>
          <label className="span-6">Focus <input name="focus" defaultValue="progression" /></label>
          <label className="span-6">Exercices <input name="exercises" defaultValue="Squat, Developpe, Rowing" /></label>
          <label className="span-12">Notes <input name="notes" /></label>
          <button className="primary span-12">Attribuer la seance</button>
        </form>
        <div className="list">
          {workouts.map((workout: any) => <article className="list-item" key={workout.id}><strong>{workout.title}</strong><p className="muted">{workout.status} - {workout.scheduled_for}</p></article>)}
          {!workouts.length ? <EmptyState title="Aucune seance" text="Attribuez une seance pour construire le programme." /> : null}
        </div>
      </section>
    );
  }

  if (tab === "progress") {
    return (
      <section className="grid">
        <article className="panel span-6 stack"><h3>Progression physique</h3><p className="muted">Poids, mensurations et photos fictives sont audites dans l'historique Supabase.</p></article>
        <article className="panel span-6 stack"><h3>Regularite</h3><p className="muted">{workouts.filter((workout: any) => workout.status === "completed").length} seance(s) terminee(s).</p></article>
      </section>
    );
  }

  if (tab === "messages") {
    return (
      <section className="stack">
        <form className="row" action={sendMessageAction}>
          <input type="hidden" name="recipientId" value={client.id} />
          <input name="body" required placeholder="Message au client" />
          <button className="primary">Envoyer</button>
        </form>
        <div className="list">
          {messages.map((message: any) => <article className="list-item" key={message.id}><p>{message.body}</p></article>)}
          {!messages.length ? <EmptyState title="Aucun message" text="Envoyez le premier message depuis ce formulaire." /> : null}
        </div>
      </section>
    );
  }

  return (
    <div className="list">
      {auditLogs.map((log: any) => <article className="list-item" key={log.id}><strong>{log.action}</strong><p className="muted small">{formatDate(log.created_at)}</p><p>{log.summary}</p></article>)}
      {!auditLogs.length ? <EmptyState title="Aucun historique" text="Les actions auditees apparaitront ici." /> : null}
    </div>
  );
}

function AiRecommendationCard({ recommendation }: { recommendation: any }) {
  return (
    <article className="list-item stack ai-card">
      <div className="row between ai-card-top">
        <div>
          <span className="pill gold">{recommendation.priority}</span>
          <h3>{recommendation.type} - {recommendation.problem}</h3>
          <p className="muted small">{recommendation.status} - confiance {Math.round(Number(recommendation.confidence) * 100)}%</p>
        </div>
      </div>
      <div className="ai-explain-grid">
        <InfoBlock title="Pourquoi" value={recommendation.justification} />
        <InfoBlock title="Donnees utilisees" value={JSON.stringify(recommendation.current_state, null, 2)} code />
        <InfoBlock title="Ce qui change" value={recommendation.expected_benefit} />
      </div>
      <DiffPreview before={recommendation.current_state} after={recommendation.coach_edit || recommendation.proposed_change} />
      <form className="grid" action={decideAiRecommendationAction}>
        <input type="hidden" name="recommendationId" value={recommendation.id} />
        <label className="span-8">Modifier avant validation (JSON)
          <textarea name="coachEdit" rows={3} placeholder='{"calories": 1900, "protein": 135}' />
        </label>
        <label className="span-4">Note coach <input name="note" placeholder="Decision Milo" /></label>
        <button className="ghost span-3" name="decision" value="approve">Modifier</button>
        <button className="primary span-3" name="decision" value="approve">Valider</button>
        <button className="ghost span-3" name="decision" value="postpone">Reporter</button>
        <button className="danger span-3" name="decision" value="reject">Refuser</button>
      </form>
      {["approved", "modified"].includes(recommendation.status) && ["nutrition", "training"].includes(recommendation.type) ? (
        <form action={applyAiRecommendationAction}>
          <input type="hidden" name="recommendationId" value={recommendation.id} />
          <button className="primary">Appliquer la modification {recommendation.type === "nutrition" ? "nutrition" : "entrainement"}</button>
        </form>
      ) : null}
    </article>
  );
}

function PublicationCreator({ clients }: { clients: any[] }) {
  return (
    <section className="panel stack">
      <div>
        <h2>Nouveau contenu</h2>
        <p className="muted">Un contenu peut rester brouillon, etre publie immediatement ou programme.</p>
      </div>
      <form className="grid" action={createPublicationAction}>
        <label className="span-3">Type
          <select name="type" defaultValue="announcement">
            <option value="announcement">Annonce</option>
            <option value="recipe">Recette</option>
            <option value="workout">Seance</option>
            <option value="program">Programme</option>
            <option value="revision_card">Fiche de revision</option>
            <option value="deep_dive">Dossier complet</option>
            <option value="badge">Badge</option>
            <option value="challenge">Defi</option>
            <option value="notification">Notification</option>
          </select>
        </label>
        <label className="span-5">Titre <input name="title" required placeholder="Ex: Semaine focus hydratation" /></label>
        <label className="span-4">Categorie <input name="category" defaultValue="general" /></label>
        <label className="span-12">Contenu <textarea name="body" required rows={4} placeholder="Message, consignes, fiche ou details du contenu" /></label>
        <label className="span-3">Ciblage
          <select name="targetMode" defaultValue="all">
            <option value="all">Tous mes clients</option>
            <option value="manual">Clients precis</option>
            <option value="profile">Profil intelligent</option>
          </select>
        </label>
        <label className="span-9">Clients precis <input name="clientIds" placeholder={clients.map((client: any) => client.id).join(", ")} /></label>
        <label className="span-3">Formules <input name="formulas" placeholder="perte, masse, maintien" /></label>
        <label className="span-3">Objectifs <input name="goals" placeholder="perte de poids" /></label>
        <label className="span-3">Sexes <input name="sexes" placeholder="femme, homme" /></label>
        <label className="span-3">Niveaux <input name="levels" placeholder="debutant, avance" /></label>
        <label className="span-3">Sports <input name="sports" placeholder="musculation" /></label>
        <label className="span-3">Age min <input name="minAge" type="number" min={1} /></label>
        <label className="span-3">Age max <input name="maxAge" type="number" min={1} /></label>
        <label className="span-3">Publication <input name="publishAt" type="datetime-local" /></label>
        <label className="span-3">Fin visible <input name="endsAt" type="datetime-local" /></label>
        <button className="ghost span-4" name="intent" value="draft">Enregistrer brouillon</button>
        <button className="primary span-4" name="intent" value="publish">Publier maintenant</button>
        <button className="primary span-4" name="intent" value="schedule">Programmer</button>
      </form>
    </section>
  );
}

export function ClientSupabaseApp({ profile, data }: { profile: any; data: any }) {
  const [active, setActive] = useState<ClientSection>("home");
  const [query, setQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  useThemePersistence();

  useEffect(() => {
    const stored = window.localStorage.getItem("reboot.recipe.favorites");
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  const assessment = data.assessments[0];
  const nutrition = data.nutritionTargets[0];
  const assignments = new Set(data.recipeAssignments.map((item: any) => item.recipe_id));
  const visibleRecipes = useMemo(() => data.recipes.filter((recipe: any) => {
    if (assignments.has(recipe.id)) return true;
    if (!assessment) return false;
    const formulaOk = recipe.formulas?.includes(assessment.formula);
    const allergyOk = !(assessment.allergies || []).some((allergy: string) => recipe.allergens?.includes(allergy));
    const restrictionOk = !(assessment.restrictions || []).length || (assessment.restrictions || []).some((tag: string) => recipe.diet_tags?.includes(tag));
    return formulaOk && allergyOk && restrictionOk;
  }), [data.recipes, data.recipeAssignments, assessment]);
  const filteredRecipes = visibleRecipes.filter((recipe: any) => {
    const matchesSearch = `${recipe.name} ${recipe.description} ${recipe.objective}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = recipeFilter === "all" || (recipeFilter === "assigned" && assignments.has(recipe.id)) || recipe.formulas?.includes(recipeFilter);
    return matchesSearch && matchesFilter;
  });
  const nextWorkout = data.workouts
    .filter((workout: any) => workout.status !== "completed")
    .sort((a: any, b: any) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)))[0];
  const completedThisWeek = data.workouts.filter((workout: any) => workout.status === "completed" && daysSince(workout.updated_at || workout.scheduled_for) <= 7).length;
  const recommendation = data.contents[0]?.title || visibleRecipes[0]?.name || "Gardez le rythme cette semaine";
  const priorityAction = nextWorkout ? "Realiser la prochaine seance" : visibleRecipes.length ? "Choisir une recette compatible" : "Lire la derniere publication";
  const activeMeta = clientNav.find((item) => item.id === active) || clientNav[0];

  function toggleFavorite(recipeId: string) {
    const next = favorites.includes(recipeId) ? favorites.filter((id) => id !== recipeId) : [...favorites, recipeId];
    setFavorites(next);
    window.localStorage.setItem("reboot.recipe.favorites", JSON.stringify(next));
  }

  return (
    <main className="app-shell">
      <LiveUpdateBridge profile={profile} data={data} />
      <aside className="sidebar">
        <div className="brand"><strong>Reboot Performance</strong><span className="muted small">Espace client</span></div>
        <nav className="nav" aria-label="Navigation client">
          {clientNav.map((item) => (
            <button key={item.id} className={active === item.id ? "active" : ""} type="button" onClick={() => setActive(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <ThemeSwitcher />
        <form action={signOutAction}><button className="ghost">Se deconnecter</button></form>
      </aside>
      <section className="content">
        <PageHeader eyebrow={assessment?.formula || "profil"} title={activeMeta.title} subtitle={activeMeta.subtitle} />

        {active === "home" ? (
          <section className="page-panel grid" aria-label="Accueil client">
            {kpi("Objectif", assessment?.goal || "-", assessment?.formula || "programme")}
            {kpi("Prochaine seance", nextWorkout?.title || "A planifier", nextWorkout?.scheduled_for || "coach")}
            {kpi("Nutrition", nutrition?.calories || assessment?.calories || "-", "kcal cible")}
            {kpi("Progres", completedThisWeek, "seance(s) cette semaine")}
            <article className="panel span-12 stack">
              <h2>Bonjour {profile.first_name}</h2>
              <p className="muted">{priorityAction}</p>
              <p>{recommendation}</p>
            </article>
          </section>
        ) : null}

        {active === "contents" ? (
          <section className="page-panel panel stack">
            <h2>Vos contenus personnalises</h2>
            <div className="list">
              {data.contents.map((content: any) => (
                <article className="list-item" key={content.id}>
                  <strong>{content.title}</strong>
                  <p className="muted small">{content.type} - {formatDate(content.publish_at || content.created_at)}</p>
                  <p>{content.payload?.body}</p>
                </article>
              ))}
              {!data.contents.length ? <EmptyState title="Aucun contenu" text="Milo publiera bientot des contenus adaptes a votre profil." /> : null}
            </div>
          </section>
        ) : null}

        {active === "nutrition" ? (
          <section className="page-panel stack">
            <div className="panel stack">
              <div className="row between">
                <div>
                  <h2>Corner Cuisine</h2>
                  <p className="muted">Recettes filtrees selon formule, allergies, restrictions et envois coach.</p>
                </div>
                <span className="pill gold">{filteredRecipes.length} recette(s)</span>
              </div>
              <div className="row">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une recette" aria-label="Rechercher une recette" />
                <select value={recipeFilter} onChange={(event) => setRecipeFilter(event.target.value)} aria-label="Filtrer les recettes">
                  <option value="all">Toutes adaptees</option>
                  <option value="assigned">Envoyees par le coach</option>
                  <option value="perte">Perte</option>
                  <option value="masse">Masse</option>
                  <option value="maintien">Maintien</option>
                </select>
              </div>
            </div>
            <div className="recipe-grid premium-recipes">
              {filteredRecipes.map((recipe: any) => (
                <article className="recipe-card premium-recipe" key={recipe.id}>
                  <div className="recipe-media" role="img" aria-label={recipe.image_alt || recipe.name}>
                    <span>{recipe.objective}</span>
                  </div>
                  <div className="stack">
                    <div className="row between">
                      <strong>{recipe.name}</strong>
                      <button className="ghost icon-action" type="button" onClick={() => toggleFavorite(recipe.id)} aria-pressed={favorites.includes(recipe.id)}>
                        {favorites.includes(recipe.id) ? "Favori" : "Ajouter"}
                      </button>
                    </div>
                    <p className="muted">{recipe.description}</p>
                    <div className="macro-row">
                      <span>{recipe.calories} kcal</span>
                      <span>{recipe.protein} P</span>
                      <span>{recipe.carbs} G</span>
                      <span>{recipe.fat} L</span>
                    </div>
                    <p className="muted small">{recipe.prep_minutes} min prep - {recipe.cook_minutes} min cuisson - {recipe.difficulty}</p>
                    <div className="recipe-detail">
                      <p>{recipe.coach_tip}</p>
                      <span className="pill gold">{assignments.has(recipe.id) ? "Envoyee par le coach" : "Adapte a votre objectif"}</span>
                    </div>
                  </div>
                </article>
              ))}
              {!filteredRecipes.length ? <EmptyState title="Aucune recette adaptee" text="Changez la recherche ou demandez une recette a Milo." /> : null}
            </div>
          </section>
        ) : null}

        {active === "program" ? (
          <section className="page-panel panel stack">
            <h2>Programme</h2>
            <div className="list">
              {data.workouts.map((workout: any) => <article className="list-item" key={workout.id}><strong>{workout.title}</strong><p className="muted">{workout.scheduled_for} - {workout.status}</p><p>{workout.focus}</p></article>)}
              {!data.workouts.length ? <EmptyState title="Aucune seance" text="Votre programme apparaitra ici." /> : null}
            </div>
          </section>
        ) : null}

        {active === "messages" ? (
          <section className="page-panel panel stack">
            <h2>Messages</h2>
            <div className="list">
              {data.messages.map((message: any) => <article className="list-item" key={message.id}><p>{message.body}</p></article>)}
              {!data.messages.length ? <EmptyState title="Aucun message" text="Les messages de Milo apparaitront ici." /> : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className="hero page-header">
      <span className="pill gold">{eyebrow}</span>
      <div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
    </header>
  );
}

function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = (window.localStorage.getItem("reboot.theme") as ThemeChoice | null) || "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function choose(next: ThemeChoice) {
    setTheme(next);
    window.localStorage.setItem("reboot.theme", next);
    applyTheme(next);
  }

  return (
    <div className="theme-switcher" aria-label="Theme">
      <button className={theme === "light" ? "active" : ""} type="button" onClick={() => choose("light")}>Clair</button>
      <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => choose("dark")}>Sombre</button>
      <button className={theme === "system" ? "active" : ""} type="button" onClick={() => choose("system")}>Systeme</button>
    </div>
  );
}

function LiveUpdateBridge({ profile, data }: { profile: any; data: any }) {
  const router = useRouter();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createSupabaseBrowserClient();
    const clientIds = profile.role === "coach"
      ? (data.clients || []).map((client: any) => client.id).filter(Boolean)
      : [profile.id];
    const channels: ReturnType<typeof supabase.channel>[] = [];
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshSoon = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 450);
    };

    const subscribe = (topic: string, handlers: Array<{ table: string; filter?: string }>) => {
      const channel = supabase.channel(topic);
      for (const handler of handlers) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: handler.table, filter: handler.filter },
          refreshSoon
        );
      }
      channel.subscribe((nextStatus) => {
        if (nextStatus === "SUBSCRIBED") setStatus("online");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(nextStatus)) setStatus("offline");
      });
      channels.push(channel);
    };

    const scopedTables = [
      "nutrition_targets",
      "workouts",
      "workout_assignments",
      "notifications",
      "recipe_assignments",
      "user_badges",
      "challenges",
      "ai_recommendations"
    ];

    if (profile.role === "coach") {
      for (const clientId of clientIds) {
        subscribe(`coach-${profile.id}-client-${clientId}`, scopedTables.map((table) => ({ table, filter: `client_id=eq.${clientId}` })));
      }
      subscribe(`coach-${profile.id}-direct`, [
        { table: "messages", filter: `recipient_id=eq.${profile.id}` },
        { table: "messages", filter: `sender_id=eq.${profile.id}` },
        { table: "contents", filter: `coach_id=eq.${profile.id}` },
        { table: "publication_targets" },
        { table: "ai_recommendations", filter: `coach_id=eq.${profile.id}` }
      ]);
    } else {
      subscribe(`client-${profile.id}-own`, scopedTables.map((table) => ({ table, filter: `client_id=eq.${profile.id}` })));
      subscribe(`client-${profile.id}-messages`, [
        { table: "messages", filter: `recipient_id=eq.${profile.id}` },
        { table: "messages", filter: `sender_id=eq.${profile.id}` },
        { table: "contents" },
        { table: "publication_targets" }
      ]);
    }

    const onOnline = () => {
      setStatus("connecting");
      router.refresh();
    };
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      for (const channel of channels) supabase.removeChannel(channel);
    };
  }, [data.clients, profile?.id, profile?.role, router]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkVersion() {
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled || !payload?.version) return;
        const storedVersion = window.localStorage.getItem("reboot.version");
        if (storedVersion && storedVersion !== payload.version) setHasNewVersion(true);
        window.localStorage.setItem("reboot.version", payload.version);
        setActiveVersion((current) => {
          if (current && current !== payload.version) setHasNewVersion(true);
          return current || payload.version;
        });
      } catch {
        // La detection de version reste silencieuse hors ligne.
      }
    }
    checkVersion();
    window.addEventListener("focus", checkVersion);
    window.addEventListener("reboot:check-version", checkVersion);
    const timer = window.setInterval(checkVersion, 60000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", checkVersion);
      window.removeEventListener("reboot:check-version", checkVersion);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <div className={`live-status ${status}`} role="status" aria-live="polite">
        {status === "online" ? "Synchronise" : status === "connecting" ? "Connexion temps reel" : "Hors ligne"}
      </div>
      {hasNewVersion ? (
        <div className="version-toast" role="status" aria-live="polite">
          <span>Une nouvelle version de Reboot Performance est disponible</span>
          <button className="primary" type="button" onClick={() => window.location.reload()}>Mettre a jour</button>
        </div>
      ) : null}
    </>
  );
}

function useThemePersistence() {
  useEffect(() => {
    const stored = (window.localStorage.getItem("reboot.theme") as ThemeChoice | null) || "system";
    applyTheme(stored);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if ((window.localStorage.getItem("reboot.theme") || "system") === "system") applyTheme("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
}

function applyTheme(theme: ThemeChoice) {
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.dataset.theme = resolved;
}

function InfoBlock({ title, value, code = false }: { title: string; value: string; code?: boolean }) {
  return (
    <div className="info-block">
      <strong>{title}</strong>
      {code ? <pre>{value}</pre> : <p>{value}</p>}
    </div>
  );
}

function DiffPreview({ before, after }: { before: any; after: any }) {
  return (
    <div className="diff-grid">
      <InfoBlock title="Ancienne valeur" value={JSON.stringify(before || {}, null, 2)} code />
      <InfoBlock title="Nouvelle valeur" value={JSON.stringify(after || {}, null, 2)} code />
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <article className="empty-state">
      <strong>{title}</strong>
      <p className="muted">{text}</p>
    </article>
  );
}

function kpi(label: string, value: any, hint: string) {
  return <article className="kpi span-3"><span className="muted small">{label}</span><strong>{value}</strong><span className="muted small">{hint}</span></article>;
}

function initials(client: any) {
  return `${client?.first_name?.[0] || ""}${client?.last_name?.[0] || ""}`.toUpperCase() || "RP";
}

function targetSummary(targets: any[]) {
  if (!targets.length) return "Aucun ciblage";
  return targets.map((target) => {
    if (target.mode === "all") return "Tous les clients";
    if (target.mode === "manual") return `${target.client_ids?.length || 0} client(s)`;
    const filters = [
      ...(target.formulas || []),
      ...(target.goals || []),
      ...(target.sexes || []),
      ...(target.levels || []),
      ...(target.sports || [])
    ];
    return filters.length ? `Profil: ${filters.join(", ")}` : "Profil intelligent";
  }).join(" | ");
}

function formatDate(value: string | null) {
  if (!value) return "non planifie";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / 86400000);
}
