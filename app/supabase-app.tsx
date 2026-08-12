"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import {
  archivePublicationAction,
  analyzeAllClientsWithAiStateAction,
  analyzeClientWithAiAction,
  analyzeClientWithAiStateAction,
  applyAiRecommendationStateAction,
  applyAiRecommendationAction,
  assignWorkoutStateAction,
  awardBadgeStateAction,
  createClientAction,
  createChallengeStateAction,
  createAiRecommendationStateAction,
  createPublicationStateAction,
  createRecipeStateAction,
  deletePublicationAction,
  duplicatePublicationAction,
  decideAiRecommendationAction,
  decideAiRecommendationStateAction,
  addHydrationEntryStateAction,
  addRecipeToMealsStateAction,
  completeWorkoutSetStateAction,
  completeWorkoutStateAction,
  deleteHydrationEntryStateAction,
  deleteMealEntryStateAction,
  estimateMealWithAiStateAction,
  createTribePostStateAction,
  lockWeeklyCheckinAction,
  markNotificationReadStateAction,
  markAllNotificationsReadStateAction,
  markClientMessagesReadStateAction,
  markWeeklyCheckinViewedAction,
  restoreAiNutritionAction,
  restoreAiTrainingAction,
  saveMealEntryStateAction,
  saveWeeklyCheckinStateAction,
  sendMessageStateAction,
  signInAction,
  signOutAction,
  submitWeeklyCheckinStateAction,
  updateAssessmentStateAction,
  updateWorkoutStateAction,
  updateWeeklyJournalSharingStateAction,
  updateNutritionStateAction
} from "./actions";

type ThemeChoice = "light" | "dark";
type CoachSection = "home" | "clients" | "content" | "alerts";
type CoachContentSection = "overview" | "programs" | "nutrition" | "library" | "tribe" | "badges" | "games";
type ClientSection = "home" | "active" | "nutrition" | "weekly" | "progress" | "tribe" | "games" | "contents";
type ClientTab = "summary" | "assessment" | "training" | "nutrition" | "progress" | "messages" | "media" | "history";
type LiveStatus = "connecting" | "online" | "offline";
type WorkoutSet = { reps: string; load: string; rpe: number };
type WorkoutExercise = { name: string; rest: number; rpe: number; sets: WorkoutSet[] };

const coachNav: Array<{ id: CoachSection; icon: string; label: string; title: string; subtitle: string }> = [
  { id: "home", icon: "⌂", label: "Tableau de bord", title: "Centre de pilotage", subtitle: "Les priorités utiles maintenant, rien de plus." },
  { id: "clients", icon: "◉", label: "Clients", title: "Clients", subtitle: "Retrouvez rapidement chaque athlète accompagné." },
  { id: "content", icon: "▤", label: "Contenu", title: "Contenu", subtitle: "Programmes, nutrition, bibliothèque et communauté." },
  { id: "alerts", icon: "●", label: "Alertes", title: "Alertes", subtitle: "Signaux importants et notifications à traiter." }
];

const coachContentSections: Array<{ id: CoachContentSection; label: string }> = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "programs", label: "Programmes" },
  { id: "nutrition", label: "Nutrition et recettes" },
  { id: "library", label: "Bibliothèque" },
  { id: "tribe", label: "Tribu" },
  { id: "badges", label: "Badges" },
  { id: "games", label: "Jeux et quiz" }
];

const coachGames = [
  {
    title: "Quiz évolutif",
    image: "/media/game-knowledge.webp",
    target: "Tous niveaux",
    objective: "Renforcer les repères sur la récupération, l’entraînement et la nutrition."
  },
  {
    title: "Juste Macro",
    image: "/media/game-coach.webp",
    target: "Débutant à avancé",
    objective: "Apprendre à estimer les calories et les macronutriments sans obsession du chiffre parfait."
  },
  {
    title: "Labo du Chef",
    image: "/media/game-training.webp",
    target: "Intermédiaire",
    objective: "Composer un repas cohérent selon un objectif sportif et obtenir un retour immédiat."
  }
] as const;

const clientNav: Array<{ id: ClientSection; icon: string; label: string; title: string; subtitle: string }> = [
  { id: "home", icon: "⌂", label: "Accueil", title: "Votre espace", subtitle: "L'essentiel de votre semaine, au même endroit." },
  { id: "active", icon: "▶", label: "Séance active", title: "Séance active", subtitle: "Votre prochaine séance, ses exercices et votre progression." },
  { id: "nutrition", icon: "◇", label: "Coin diététique", title: "Coin diététique", subtitle: "Hydratation, objectifs nutritionnels et recettes adaptées." },
  { id: "weekly", icon: "✓", label: "Bilan hebdo", title: "Bilan hebdo", subtitle: "Énergie, sommeil, récupération, douleurs et journal." },
  { id: "progress", icon: "↗", label: "Mes progrès", title: "Mes progrès", subtitle: "Poids, récupération, performances et historique." },
  { id: "tribe", icon: "★", label: "Tribu & Badges", title: "Tribu & Badges", subtitle: "Publications, dynamique de groupe et récompenses." },
  { id: "games", icon: "◆", label: "Jeux & Quiz", title: "Jeux & Quiz", subtitle: "Quiz évolutif, Juste Macro et Labo du Chef." },
  { id: "contents", icon: "▤", label: "Bibliothèque", title: "Bibliothèque", subtitle: "Contenus sélectionnés selon votre profil." }
];

const clientTabs: Array<{ id: ClientTab; label: string }> = [
  { id: "summary", label: "Vue d'ensemble" },
  { id: "assessment", label: "Bilan" },
  { id: "training", label: "Entraînement" },
  { id: "nutrition", label: "Nutrition" },
  { id: "progress", label: "Progrès" },
  { id: "messages", label: "Messages" },
  { id: "media", label: "Médias" },
  { id: "history", label: "Historique" }
];

export function LoginScreen({ error, passwordUpdated = false }: { error?: string; passwordUpdated?: boolean }) {
  return (
    <main className="auth-shell">
      <section className="panel auth-panel stack">
        <div>
          <span className="pill gold">Reboot Performance</span>
          <h1>Connexion</h1>
          <p className="muted">Connectez-vous avec votre compte coach ou client.</p>
        </div>
        {passwordUpdated ? <p className="notice" role="status">Mot de passe modifié. Vous pouvez vous connecter.</p> : null}
        {error ? <p className="notice danger-notice" role="alert">{error === "recovery_link_invalid" ? "Ce lien de récupération est invalide ou a expiré. Demandez un nouveau lien." : "Email ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez."}</p> : null}
        <form className="stack" action={signInAction}>
          <label>Email <input name="email" type="email" required placeholder="coach@milo.reboot" /></label>
          <label>Mot de passe <input name="password" type="password" required placeholder="••••••••" /></label>
          <button className="primary">Se connecter</button>
        </form>
        <p className="muted small"><Link href="/forgot-password">Mot de passe oublié ?</Link></p>
        <p className="muted small"><a href="/demo">Découvrir l'espace de démonstration</a></p>
      </section>
    </main>
  );
}

export function MissingProfileScreen() {
  return (
    <main className="app-shell">
      <section className="panel stack">
        <h1>Profil introuvable</h1>
        <p className="muted">Votre compte existe, mais aucun profil applicatif n'est encore associé.</p>
        <form action={signOutAction}><button className="primary">Se déconnecter</button></form>
      </section>
    </main>
  );
}

export function CoachSupabaseApp({ profile, data }: { profile: any; data: any }) {
  const [active, setActive] = useState<CoachSection>("home");
  const [clientTab, setClientTab] = useState<ClientTab>("summary");
  const [selectedClientId, setSelectedClientId] = useState(data.clients[0]?.id || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientView, setClientView] = useState<"directory" | "dossier">("directory");
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [clientSort, setClientSort] = useState("name");
  const [contentSection, setContentSection] = useState<CoachContentSection>("overview");
  useThemePersistence();

  const selectedClient = data.clients.find((client: any) => client.id === selectedClientId) || data.clients[0];
  const selectedAssessment = selectedClient ? data.assessments.find((item: any) => item.client_id === selectedClient.id) : null;
  const selectedNutrition = selectedClient ? data.nutritionTargets.find((item: any) => item.client_id === selectedClient.id) : null;
  const selectedWorkouts = selectedClient ? data.workouts.filter((item: any) => item.client_id === selectedClient.id) : [];
  const selectedMessages = selectedClient ? data.messages.filter((item: any) => item.sender_id === selectedClient.id || item.recipient_id === selectedClient.id) : [];
  const selectedAudit = selectedClient ? data.auditLogs.filter((item: any) => item.client_id === selectedClient.id || item.actor_id === selectedClient.id) : [];
  const selectedWeeklyCheckins = selectedClient ? (data.weeklyCheckins || []).filter((item: any) => item.client_id === selectedClient.id) : [];
  const pendingAi = data.aiRecommendations.filter((item: any) => ["pending", "approved", "modified", "postponed"].includes(item.status));
  const urgentAi = data.aiRecommendations.filter((item: any) => ["high", "urgent"].includes(item.priority) && ["pending", "approved", "modified"].includes(item.status));
  const painAssessments = data.assessments.filter((item: any) => (item.pain || []).length || (item.injuries || []).length);
  const checkinsToReview = (data.weeklyCheckins || []).filter((item: any) => item.status === "submitted" && !item.viewed_at);
  const unreadNotifications = data.notifications.filter((item: any) => !item.read_at && item.status !== "read");
  const activeMeta = coachNav.find((item) => item.id === active) || coachNav[0];
  const unreadMessages = data.messages.filter((message: any) => message.recipient_id === profile.id && !message.read_at);
  const completedRecently = data.workouts.filter((workout: any) => workout.status === "completed" && daysSince(workout.completed_at || workout.updated_at) <= 7);
  const inactiveClients = data.clients.filter((client: any) => daysSince(clientLastActivity(client.id, data)) > 14);
  const completedWorkouts = data.workouts.filter((workout: any) => workout.status === "completed").length;
  const adherence = data.workouts.length ? Math.round((completedWorkouts / data.workouts.length) * 100) : 0;
  const prioritizedAiRecommendations = [...data.aiRecommendations].sort((left: any, right: any) => {
    const rank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (rank[String(left.priority)] ?? 9) - (rank[String(right.priority)] ?? 9);
  });
  const filteredClients = [...data.clients]
    .filter((client: any) => {
      const assessment = data.assessments.find((item: any) => item.client_id === client.id);
      const text = `${client.first_name} ${client.last_name} ${assessment?.goal || client.objective || ""} ${assessment?.formula || ""}`.toLowerCase();
      const hasAlert = (assessment?.pain || []).length > 0 || (assessment?.injuries || []).length > 0;
      const inactive = inactiveClients.some((item: any) => item.id === client.id);
      const filterMatches = clientFilter === "all"
        || (clientFilter === "alert" && hasAlert)
        || (clientFilter === "inactive" && inactive)
        || assessment?.formula === clientFilter;
      return text.includes(clientSearch.toLowerCase()) && filterMatches;
    })
    .sort((left: any, right: any) => {
      if (clientSort === "recent") return String(clientLastActivity(right.id, data)).localeCompare(String(clientLastActivity(left.id, data)));
      if (clientSort === "alert") {
        const leftAlert = painAssessments.some((item: any) => item.client_id === left.id) ? 1 : 0;
        const rightAlert = painAssessments.some((item: any) => item.client_id === right.id) ? 1 : 0;
        return rightAlert - leftAlert;
      }
      return `${left.first_name} ${left.last_name}`.localeCompare(`${right.first_name} ${right.last_name}`, "fr");
    });

  function openClient(clientId: string, tab: ClientTab = "summary") {
    setSelectedClientId(clientId);
    setClientTab(tab);
    setClientView("dossier");
    setActive("clients");
    setMenuOpen(false);
  }

  return (
    <main className={`app-shell coach-app-shell ${menuOpen ? "menu-open" : ""}`} data-testid="coach-workspace" data-role="coach">
      <LiveUpdateBridge profile={profile} data={data} />
      <AppHeader roleLabel="Console Coach" navigationId="coach-navigation" menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} />
      <aside className="sidebar coach-sidebar" id="coach-navigation" aria-label="Navigation coach">
        <div className="brand">
          <span className="sidebar-brand-mark" aria-hidden="true">RP</span>
          <span className="brand-copy">
            <strong>Reboot Performance</strong>
            <span className="muted small">Console Coach</span>
          </span>
          <button className="drawer-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu coach">×</button>
        </div>
        <nav className="nav" aria-label="Navigation coach">
          {coachNav.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? "active" : ""}
              type="button"
              title={item.label}
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => {
                setActive(item.id);
                if (item.id === "clients") setClientView("directory");
                setMenuOpen(false);
              }}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="client-avatar compact" aria-hidden="true">{initials(profile)}</span>
          <span className="brand-copy"><strong>{profile.first_name} {profile.last_name}</strong><small>Coach</small></span>
        </div>
      </aside>
      <button className="drawer-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu coach" />

      <section className="content">
        <PageHeader
          eyebrow="Espace Coach"
          title={active === "clients" && clientView === "dossier" ? "Dossier client" : activeMeta.title}
          subtitle={active === "clients" && clientView === "dossier" ? "Le suivi complet du client sélectionné, un onglet à la fois." : activeMeta.subtitle}
        />

        {active === "home" ? (
          <section className="page-panel command-center coach-dashboard" aria-label="Accueil coach">
            <article className="command-hero panel stack">
              <span className="pill gold">Club privé</span>
              <div>
                <h2>Bonjour {profile.first_name}</h2>
                <p className="muted">Votre journée est organisée autour des clients qui ont réellement besoin de vous.</p>
              </div>
              <div className="quick-actions" aria-label="Raccourcis coach">
                <button className="primary" type="button" onClick={() => selectedClient && openClient(selectedClient.id)}>Examiner l'Agent IA</button>
                <button className="ghost" type="button" onClick={() => { setActive("clients"); setClientView("directory"); }}>Ouvrir les clients</button>
                <button className="ghost" type="button" onClick={() => setActive("content")}>Créer un contenu</button>
                <button className="ghost" type="button" onClick={() => setActive("alerts")}>Voir les alertes</button>
              </div>
            </article>
            <section className="priority-strip dashboard-kpis" aria-label="Résumé de la journée">
              {kpi("Clients actifs", data.clients.length - inactiveClients.length, `${data.clients.length} accompagnés`)}
              {kpi("Bilans reçus", checkinsToReview.length, "à consulter")}
              {kpi("Séances récentes", completedRecently.length, "terminées sur 7 jours")}
              {kpi("Messages non lus", unreadMessages.length, "conversations")}
              {kpi("Alertes prioritaires", unreadNotifications.filter((item: any) => item.level === "urgent").length, "à traiter")}
              {kpi("Clients inactifs", inactiveClients.length, "depuis plus de 14 jours")}
              {kpi("Adhérence moyenne", `${adherence}%`, "séances terminées")}
              {kpi("Validations IA", pendingAi.length, "en attente")}
            </section>
            <section className="panel intervention-list stack">
              <div className="row between">
                <div>
                  <span className="pill gold">À traiter</span>
                  <h2>Clients à accompagner aujourd'hui</h2>
                </div>
                <button className="ghost" type="button" onClick={() => { setActive("clients"); setClientView("directory"); }}>Voir tous les clients</button>
              </div>
              <div className="list compact-list">
                {data.clients.slice(0, 5).map((client: any) => {
                  const assessment = data.assessments.find((item: any) => item.client_id === client.id);
                  const hasAlert = (assessment?.pain || []).length > 0 || (assessment?.injuries || []).length > 0;
                  return (
                    <button
                      className="intervention-row"
                      type="button"
                      key={client.id}
                      onClick={() => openClient(client.id)}
                    >
                      <span className="client-avatar compact" aria-hidden="true">{initials(client)}</span>
                      <span><strong>{client.first_name} {client.last_name}</strong><small>{assessment?.goal || client.objective || "Objectif à définir"}</small></span>
                      <span className={`pill ${hasAlert ? "urgent" : "ok"}`}>{hasAlert ? "À vérifier" : "Suivi stable"}</span>
                    </button>
                  );
                })}
                {!data.clients.length ? <EmptyState title="Aucun client rattaché" text="Ajoutez votre premier client pour commencer son accompagnement." /> : null}
              </div>
            </section>
            <section className="panel stack ai-priority-preview">
              <div className="row between">
                <div><span className="pill gold">Agent IA</span><h2>Propositions importantes</h2></div>
                <span className="pill">{urgentAi.length} prioritaire(s)</span>
              </div>
              <div className="list compact-list">
                {prioritizedAiRecommendations.slice(0, 4).map((recommendation: any) => {
                  const client = data.clients.find((item: any) => item.id === recommendation.client_id);
                  return (
                    <button className="intervention-row" type="button" key={recommendation.id} onClick={() => client && openClient(client.id)}>
                      <span className="client-avatar compact" aria-hidden="true">{initials(client)}</span>
                      <span><strong>{recommendation.problem}</strong><small>{client ? `${client.first_name} ${client.last_name}` : "Client"} · {priorityLabel(recommendation.priority)}</small></span>
                      <span className="pill gold">{statusLabel(recommendation.status)}</span>
                    </button>
                  );
                })}
                {!prioritizedAiRecommendations.length ? <EmptyState title="Aucune proposition en attente" text="Les prochaines analyses apparaîtront ici." /> : null}
              </div>
            </section>
          </section>
        ) : null}

        {active === "clients" && clientView === "directory" ? (
          <section className="page-panel stack" data-testid="coach-client-directory">
            <section className="panel client-directory stack">
              <div className="row between">
                <div>
                  <h2>Mes clients</h2>
                  <p className="muted">{data.clients.length} profil(s) rattaché(s). Sélectionnez un client pour ouvrir son dossier.</p>
                </div>
                <span className="pill gold">{data.clients.length} actif(s)</span>
              </div>
              <div className="coach-directory-tools">
                <label>Rechercher
                  <input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Nom, objectif ou formule" />
                </label>
                <label>Filtrer
                  <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                    <option value="all">Tous les clients</option>
                    <option value="alert">Avec une alerte</option>
                    <option value="inactive">Inactifs</option>
                    <option value="perte">Perte de poids</option>
                    <option value="masse">Prise de masse</option>
                    <option value="maintien">Maintien</option>
                  </select>
                </label>
                <label>Trier
                  <select value={clientSort} onChange={(event) => setClientSort(event.target.value)}>
                    <option value="name">Nom</option>
                    <option value="recent">Activité récente</option>
                    <option value="alert">Alertes d'abord</option>
                  </select>
                </label>
              </div>
              <div className="client-directory-grid">
                  {filteredClients.map((client: any) => {
                    const assessment = data.assessments.find((item: any) => item.client_id === client.id);
                    const clientWorkouts = data.workouts.filter((item: any) => item.client_id === client.id);
                    const nextWorkout = clientWorkouts.find((workout: any) => workout.status === "planned" && workout.scheduled_for >= parisDateIso());
                    const checkin = (data.weeklyCheckins || []).find((item: any) => item.client_id === client.id);
                    const alert = painAssessments.some((item: any) => item.client_id === client.id);
                    const clientUnread = unreadMessages.filter((message: any) => message.sender_id === client.id).length;
                    return (
                      <button
                        key={client.id}
                        data-testid="coach-client-row"
                        className="client-directory-card"
                        type="button"
                        onClick={() => openClient(client.id)}
                      >
                        <span className="client-avatar" aria-hidden="true">{initials(client)}</span>
                        <span className="client-directory-copy">
                          <strong>{client.first_name} {client.last_name}</strong>
                          <small>{formulaLabel(assessment?.formula)} · {assessment?.goal || client.objective || "Objectif à définir"}</small>
                          <span>Dernière activité : {formatRelativeDate(clientLastActivity(client.id, data))}</span>
                          <span>{nextWorkout ? `Prochaine séance : ${formatDayDate(nextWorkout.scheduled_for)}` : "Aucune séance planifiée"}</span>
                          <span>{checkin ? `Bilan : ${weeklyCheckinStatusLabel(checkin)}` : "Bilan attendu"}</span>
                          <span>{alert ? "Alerte à vérifier" : "Suivi stable"}{clientUnread ? ` · ${clientUnread} message(s) non lu(s)` : ""}</span>
                        </span>
                        <span className="directory-arrow" aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                  {!filteredClients.length ? <EmptyState title="Aucun client trouvé" text="Modifiez la recherche ou les filtres." /> : null}
              </div>
              <details className="subtle-details">
                  <summary>Ajouter un client</summary>
                  <form className="grid" action={createClientAction}>
                    <label className="span-6">Prénom <input name="firstName" required /></label>
                    <label className="span-6">Nom <input name="lastName" required /></label>
                    <label className="span-12">Email <input name="email" type="email" required /></label>
                    <label className="span-12">Mot de passe <input name="password" type="password" required minLength={8} /></label>
                    <button className="primary span-12">Créer le client</button>
                  </form>
              </details>
            </section>
          </section>
        ) : null}

        {active === "clients" && clientView === "dossier" ? (
          <section className="page-panel stack" data-testid="coach-client-dossier">
            <div className="row between dossier-toolbar">
              <button className="ghost" type="button" onClick={() => setClientView("directory")}>Retour aux clients</button>
              <label>Changer de client
                <select value={selectedClient?.id || ""} onChange={(event) => openClient(event.target.value, clientTab)}>
                  {data.clients.map((client: any) => <option key={client.id} value={client.id}>{client.first_name} {client.last_name}</option>)}
                </select>
              </label>
            </div>
            <div className="client-workspace dossier-workspace">
              <aside className="client-rail panel stack">
                <div><h2>Client sélectionné</h2><p className="muted small">Changez de dossier sans quitter le suivi.</p></div>
                <div className="client-list">
                  {data.clients.map((client: any) => (
                    <button
                      key={client.id}
                      data-testid="coach-client-row"
                      className={`client-row ${selectedClient?.id === client.id ? "active" : ""}`}
                      type="button"
                      onClick={() => { setSelectedClientId(client.id); setClientTab("summary"); }}
                    >
                      <strong>{client.first_name} {client.last_name}</strong>
                      <span>{data.assessments.find((item: any) => item.client_id === client.id)?.goal || client.objective || "Objectif à définir"}</span>
                    </button>
                  ))}
                </div>
              </aside>
              {selectedClient ? (
                <section className="panel stack client-dossier">
                  <div className="client-profile-header">
                    <div className="client-avatar" aria-hidden="true">{initials(selectedClient)}</div>
                    <div className="client-profile-main">
                      <div className="row">
                        <span className="pill gold">{formulaLabel(selectedAssessment?.formula)}</span>
                        <span className="pill">{painAssessments.some((item: any) => item.client_id === selectedClient.id) ? "Alerte" : "Stable"}</span>
                      </div>
                      <h2>{selectedClient.first_name} {selectedClient.last_name}</h2>
                      <p className="muted">{selectedAssessment?.goal || selectedClient.objective || "Objectif non renseigné"}</p>
                    </div>
                    <div className="client-progress-card">
                      <span className="muted small">Progression</span>
                      <strong>{selectedWorkouts.filter((workout: any) => workout.status === "completed").length}/{selectedWorkouts.length || 0}</strong>
                      <span className="muted small">séances terminées</span>
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
                    weeklyCheckins={selectedWeeklyCheckins}
                    mealEntries={(data.mealEntries || []).filter((item: any) => item.client_id === selectedClient.id)}
                    hydrationEntries={(data.hydrationEntries || []).filter((item: any) => item.client_id === selectedClient.id)}
                    measurements={(data.measurements || []).filter((item: any) => item.client_id === selectedClient.id)}
                    aiRecommendations={data.aiRecommendations.filter((item: any) => item.client_id === selectedClient.id)}
                    aiActions={data.aiActions.filter((item: any) => item.client_id === selectedClient.id)}
                  />
                </section>
              ) : (
                <section className="panel stack"><h2>Aucun client</h2><p className="muted">Creez un client pour ouvrir sa fiche.</p></section>
              )}
              <CoachAiSidePanel
                client={selectedClient}
                recommendations={data.aiRecommendations}
                actions={data.aiActions}
                context={clientTabs.find((tab) => tab.id === clientTab)?.label}
              />
            </div>
          </section>
        ) : null}

        {active === "content" ? (
          <CoachContentHub
            section={contentSection}
            onSectionChange={setContentSection}
            clients={data.clients}
            selectedClient={selectedClient}
            contents={data.contents}
            targets={data.publicationTargets}
            recipes={data.recipes || []}
            tribePosts={data.tribePosts || []}
            badges={data.userBadges || []}
            challenges={data.challenges || []}
            recommendations={data.aiRecommendations || []}
            onOpenClient={(tab: ClientTab) => selectedClient && openClient(selectedClient.id, tab)}
          />
        ) : null}

        {active === "alerts" ? (
          <CoachAlertsHub
            notifications={data.notifications || []}
            clients={data.clients}
            onOpenClient={(clientId: string, tab: ClientTab = "summary") => openClient(clientId, tab)}
          />
        ) : null}
      </section>
    </main>
  );
}

function CoachContentHub({
  section,
  onSectionChange,
  clients,
  selectedClient,
  contents,
  targets,
  recipes,
  tribePosts,
  badges,
  challenges,
  recommendations,
  onOpenClient
}: {
  section: CoachContentSection;
  onSectionChange: (section: CoachContentSection) => void;
  clients: any[];
  selectedClient: any;
  contents: any[];
  targets: any[];
  recipes: any[];
  tribePosts: any[];
  badges: any[];
  challenges: any[];
  recommendations: any[];
  onOpenClient: (tab: ClientTab) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleContents = contents.filter((content: any) => {
    const searchable = `${content.title || ""} ${content.body || ""} ${content.type || ""} ${content.category || ""}`.toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (statusFilter === "all" || content.status === statusFilter);
  });
  const contentTargets = (contentId: string) => targets.filter((target: any) => target.content_id === contentId);

  return (
    <section className="page-panel stack coach-content-hub" data-testid="coach-content-hub">
      <div className="tabs coach-content-tabs" role="tablist" aria-label="Sections du contenu">
        {coachContentSections.map((item) => (
          <button
            key={item.id}
            className={section === item.id ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => onSectionChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === "overview" ? (
        <section className="stack">
          <div className="grid">
            {kpi("Contenus", contents.length, "brouillons et publications")}
            {kpi("Recettes", recipes.length, "dans le Corner Cuisine")}
            {kpi("Publications Tribu", tribePosts.length, "dans le fil communautaire")}
            {kpi("Idées à valider", recommendations.filter((item: any) => item.status === "pending").length, "propositions de l'Agent IA")}
          </div>
          <section className="panel stack">
            <div>
              <span className="pill gold">Centre éditorial</span>
              <h2>Créer et cibler un contenu</h2>
              <p className="muted">Préparez une ressource puis choisissez précisément qui pourra la consulter.</p>
            </div>
            <PublicationCreator clients={clients} />
          </section>
          <section className="panel stack">
            <div className="row between">
              <div><h2>Idées proposées</h2><p className="muted">Chaque proposition reste soumise à votre validation.</p></div>
              <span className="pill">{recommendations.length} proposition(s)</span>
            </div>
            <div className="list">
              {recommendations.slice(0, 4).map((recommendation: any) => (
                <article className="list-item" key={recommendation.id}>
                  <div className="row between">
                    <strong>{recommendation.problem}</strong>
                    <span className="pill gold">{priorityLabel(recommendation.priority)}</span>
                  </div>
                  <p className="muted">{recommendation.expected_benefit || recommendation.justification}</p>
                  <span className="muted small">{statusLabel(recommendation.status)}</span>
                </article>
              ))}
              {!recommendations.length ? <EmptyState title="Aucune idée en attente" text="Les analyses validées alimenteront ce centre." /> : null}
            </div>
          </section>
        </section>
      ) : null}

      {section === "programs" ? (
        <section className="grid">
          <article className="panel span-7 stack">
            <span className="pill gold">Programmes</span>
            <h2>Programmes du client sélectionné</h2>
            <p className="muted">{selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "Sélectionnez d'abord un client."}</p>
            <p>Créez, ajustez et consultez les séances directement dans son dossier pour conserver un historique clair.</p>
            <button className="primary" type="button" disabled={!selectedClient} onClick={() => onOpenClient("training")}>Ouvrir les entraînements</button>
          </article>
          <article className="panel span-5 stack">
            <h3>Principes de publication</h3>
            <p className="muted">Les séances sont visibles par le client après attribution réelle. Les suggestions automatiques ne le sont jamais avant votre validation.</p>
          </article>
        </section>
      ) : null}

      {section === "nutrition" ? (
        <section className="grid">
          <article className="panel span-7 stack">
            <span className="pill gold">Nutrition</span>
            <h2>Objectifs et recettes</h2>
            <p className="muted">{recipes.length} recette(s) disponibles. Les objectifs restent propres au dossier de chaque client.</p>
            <button className="primary" type="button" disabled={!selectedClient} onClick={() => onOpenClient("nutrition")}>Ouvrir le suivi nutritionnel</button>
          </article>
          <article className="panel span-5 stack">
            <h3>Recettes disponibles</h3>
            <div className="list compact-list">
              {recipes.slice(0, 4).map((recipe: any) => (
                <div className="list-item" key={recipe.id}><strong>{recipe.name}</strong><span className="muted small">{recipe.calories || 0} kcal · {recipe.protein || 0} g protéines</span></div>
              ))}
              {!recipes.length ? <EmptyState title="Aucune recette" text="Créez un contenu de type recette depuis la vue d'ensemble." /> : null}
            </div>
          </article>
          <div className="span-12"><RecipeCreator /></div>
        </section>
      ) : null}

      {section === "library" ? (
        <section className="stack">
          <section className="panel coach-library-toolbar">
            <label>Rechercher
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, catégorie ou contenu" />
            </label>
            <label>État
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Tous</option>
                <option value="draft">Brouillons</option>
                <option value="scheduled">Programmés</option>
                <option value="published">Publiés</option>
                <option value="archived">Archivés</option>
              </select>
            </label>
          </section>
          <div className="list">
            {visibleContents.map((content: any) => (
              <article className="list-item stack" key={content.id}>
                <div className="row between">
                  <div><strong>{displayContentTitle(content.title)}</strong><p className="muted small">{content.category || "Général"} · {statusLabel(content.status)}</p></div>
                  <span className="pill">{targetSummary(contentTargets(content.id))}</span>
                </div>
                <p>{content.body}</p>
                <div className="row wrap">
                  <form action={duplicatePublicationAction}>
                    <input type="hidden" name="contentId" value={content.id} />
                    <button className="ghost">Dupliquer</button>
                  </form>
                  {content.status !== "archived" ? (
                    <form action={archivePublicationAction} onSubmit={(event) => { if (!window.confirm("Archiver ce contenu ?")) event.preventDefault(); }}>
                      <input type="hidden" name="contentId" value={content.id} />
                      <button className="ghost">Archiver</button>
                    </form>
                  ) : null}
                  <form action={deletePublicationAction} onSubmit={(event) => { if (!window.confirm("Supprimer définitivement ce contenu ?")) event.preventDefault(); }}>
                    <input type="hidden" name="contentId" value={content.id} />
                    <button className="danger">Supprimer</button>
                  </form>
                </div>
              </article>
            ))}
            {!visibleContents.length ? <EmptyState title="Aucun contenu trouvé" text="Modifiez les filtres ou créez une nouvelle ressource." /> : null}
          </div>
        </section>
      ) : null}

      {section === "tribe" ? (
        <section className="grid">
          <article className="panel span-5 stack">
            <span className="pill gold">Tribu</span>
            <h2>Publications communautaires</h2>
            <p className="muted">Consultez les publications visibles par votre communauté. La modération sensible reste confirmée par le coach.</p>
          </article>
          <div className="span-7 list">
            {tribePosts.slice(0, 8).map((post: any) => (
              <article className="list-item" key={post.id}>
                <div className="row between"><strong>{tribeKindLabel(post.kind)}</strong><span className="muted small">{formatDate(post.created_at)}</span></div>
                <p>{displayCommunityBody(post.body)}</p>
                <span className="muted small">{post.archived_at ? "Archivée" : "Visible"}</span>
              </article>
            ))}
            {!tribePosts.length ? <EmptyState title="Aucune publication réelle" text="Les publications de vos clients apparaîtront ici." /> : null}
          </div>
        </section>
      ) : null}

      {section === "badges" ? (
        <section className="grid">
          <article className="panel span-6 stack">
            <span className="pill gold">Badges</span>
            <h2>Récompenses attribuées</h2>
            <p className="muted">{badges.length} récompense(s) actuellement attribuée(s) à vos clients.</p>
            <div className="list compact-list">
              {badges.slice(0, 6).map((badge: any) => <div className="list-item" key={badge.id}><strong>{badge.title || badge.badge_name || badge.name || "Badge"}</strong><span className="muted small">{formatDate(badge.unlocked_at || badge.awarded_at || badge.created_at)}</span></div>)}
              {!badges.length ? <EmptyState title="Aucun badge attribué" text="Les premières récompenses apparaîtront après progression." /> : null}
            </div>
            <BadgeAwardForm clients={clients} />
          </article>
          <article className="panel span-6 stack">
            <span className="pill gold">Défis</span>
            <h2>Défis actifs</h2>
            <div className="list compact-list">
              {challenges.slice(0, 6).map((challenge: any) => <div className="list-item" key={challenge.id}><strong>{challenge.title || challenge.name}</strong><span className="muted small">{statusLabel(challenge.status || "active")}</span></div>)}
              {!challenges.length ? <EmptyState title="Aucun défi actif" text="Créez un défi depuis la vue d'ensemble pour préparer sa publication." /> : null}
            </div>
            <ChallengeCreator clients={clients} />
          </article>
        </section>
      ) : null}

      {section === "games" ? (
        <section className="stack">
          <section className="panel stack">
            <div className="row between">
              <div>
                <span className="pill gold">Expériences ludiques</span>
                <h2>Jeux et quiz du club</h2>
                <p className="muted">Prévisualisez les trois expériences proposées aux athlètes. Toute nouvelle version reste un brouillon jusqu’à votre validation.</p>
              </div>
              <span className="pill">3 expériences actives</span>
            </div>
          </section>
          <div className="games-menu-grid coach-games-preview">
            {coachGames.map((game) => (
              <article className="game-menu-card" key={game.title}>
                <div className="game-menu-media">
                  <Image src={game.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" />
                </div>
                <div className="stack">
                  <div className="row between"><span className="pill gold">{game.target}</span><span className="pill">Publié</span></div>
                  <h3>{game.title}</h3>
                  <p className="muted">{game.objective}</p>
                  <button className="ghost" type="button" onClick={() => onSectionChange("library")}>Préparer un contenu associé</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function CoachAlertsHub({
  notifications,
  clients,
  onOpenClient
}: {
  notifications: any[];
  clients: any[];
  onOpenClient: (clientId: string, tab?: ClientTab) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("unread");
  const [state, action, pending] = useActionState(markAllNotificationsReadStateAction, { status: "idle", message: "" });
  const normalizedQuery = query.trim().toLowerCase();
  const visible = notifications
    .filter((notification: any) => {
      const client = clients.find((item: any) => item.id === notification.client_id);
      const text = `${notification.title || ""} ${notification.body || notification.message || ""} ${client?.first_name || ""} ${client?.last_name || ""}`.toLowerCase();
      const treated = Boolean(notification.read_at) || notification.status === "read";
      return (!normalizedQuery || text.includes(normalizedQuery))
        && (filter === "all" || (filter === "unread" && !treated) || (filter === "urgent" && notification.level === "urgent") || (filter === "read" && treated));
    })
    .sort((left: any, right: any) => String(right.created_at).localeCompare(String(left.created_at)));

  return (
    <section className="page-panel stack" data-testid="coach-alerts-hub">
      <section className="panel coach-alert-toolbar">
        <label>Rechercher
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client, douleur, bilan ou message" />
        </label>
        <label>Afficher
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="unread">À traiter</option>
            <option value="urgent">Priorité haute</option>
            <option value="read">Traitées</option>
            <option value="all">Toutes</option>
          </select>
        </label>
        <form action={action}>
          <button className="ghost" disabled={pending}>{pending ? "Traitement..." : "Tout marquer comme traité"}</button>
        </form>
      </section>
      <ActionStatus state={pending ? { status: "idle", message: "Mise à jour des alertes..." } : state} />
      <div className="list">
        {visible.map((notification: any) => {
          const client = clients.find((item: any) => item.id === notification.client_id);
          const isMessage = String(notification.type || notification.title || "").toLowerCase().includes("message");
          return (
            <CoachAlertItem
              key={notification.id}
              notification={notification}
              client={client}
              onOpen={() => client && onOpenClient(client.id)}
              onOpenMessages={isMessage && client ? () => onOpenClient(client.id, "messages") : undefined}
            />
          );
        })}
        {!visible.length ? <EmptyState title="Aucune alerte dans cette vue" text="Les nouveaux signaux apparaîtront automatiquement ici." /> : null}
      </div>
    </section>
  );
}

function CoachAlertItem({
  notification,
  client,
  onOpen,
  onOpenMessages
}: {
  notification: any;
  client: any;
  onOpen: () => void;
  onOpenMessages?: () => void;
}) {
  const [state, action, pending] = useActionState(markNotificationReadStateAction, { status: "idle", message: "" });
  const treated = Boolean(notification.read_at) || notification.status === "read";
  return (
    <article className="list-item alert-row">
      <div className="row between">
        <div>
          <span className={`pill ${notification.level === "urgent" ? "urgent" : ""}`}>{notification.level === "urgent" ? "Priorité haute" : "Suivi"}</span>
          <strong>{notification.title || notification.type || "Notification"}</strong>
        </div>
        <span className="muted small">{formatDate(notification.created_at)}</span>
      </div>
      <p className="muted small">{client ? `${client.first_name} ${client.last_name}` : "Information générale"} · {treated ? "Traitée" : "Non traitée"}</p>
      <p>{displayUserText(notification.body || notification.message || "Consultez le dossier pour vérifier la situation.")}</p>
      <div className="row wrap">
        {client ? <button className="ghost" type="button" onClick={onOpen}>Ouvrir le dossier</button> : null}
        {onOpenMessages ? <button className="ghost" type="button" onClick={onOpenMessages}>Ouvrir la messagerie</button> : null}
        {!treated ? (
          <form action={action}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <button className="primary" disabled={pending}>{pending ? "Traitement..." : "Marquer comme traitée"}</button>
          </form>
        ) : <span className="pill ok">Traitée</span>}
      </div>
      <ActionStatus state={state} />
    </article>
  );
}

function CoachClientFocusHeader({ client, clients, onSelect }: { client: any; clients: any[]; onSelect: (id: string) => void }) {
  return (
    <section className="panel coach-client-focus">
      <div className="row">
        <span className="client-avatar compact" aria-hidden="true">{initials(client)}</span>
        <div><strong>{client ? `${client.first_name} ${client.last_name}` : "Sélectionnez un client"}</strong><p className="muted small">Les modifications restent rattachées à ce dossier.</p></div>
      </div>
      <label>Client
        <select value={client?.id || ""} onChange={(event) => onSelect(event.target.value)} aria-label="Sélectionner un client">
          {clients.map((item: any) => <option key={item.id} value={item.id}>{item.first_name} {item.last_name}</option>)}
        </select>
      </label>
    </section>
  );
}

function ClientDetailTab({
  tab,
  client,
  assessment,
  nutrition,
  workouts,
  messages,
  auditLogs,
  weeklyCheckins = [],
  mealEntries = [],
  hydrationEntries = [],
  measurements = [],
  aiRecommendations = [],
  aiActions = []
}: any) {
  const today = parisDateIso();
  const todayMeals = mealEntries.filter((item: any) => item.meal_date === today);
  const todayHydration = hydrationEntries.filter((item: any) => item.entry_date === today);
  const mealTotals = sumMeals(todayMeals);
  const hydrationTotal = todayHydration.reduce((sum: number, item: any) => sum + Number(item.liters || 0), 0);
  const completed = workouts.filter((workout: any) => workout.status === "completed").length;
  const nextWorkout = workouts
    .filter((workout: any) => workout.status === "planned" && workout.scheduled_for >= today)
    .sort((left: any, right: any) => String(left.scheduled_for).localeCompare(String(right.scheduled_for)))[0];

  if (tab === "summary") {
    return (
      <section className="stack">
        <section className="grid">
          {kpi("Objectif", assessment?.goal || client.objective || "-", formulaLabel(assessment?.formula))}
          {kpi("Poids", assessment?.weight_kg ? `${assessment.weight_kg} kg` : "-", "dernier bilan")}
          {kpi("Adhérence", workouts.length ? `${Math.round((completed / workouts.length) * 100)}%` : "-", `${completed}/${workouts.length} séances`)}
          {kpi("Hydratation", `${hydrationTotal.toFixed(1)} L`, `objectif ${Number(nutrition?.water_liters || 0).toFixed(1)} L`)}
        </section>
        <section className="grid dossier-summary-grid">
          <article className="panel span-6 stack">
            <div className="row between"><h3>Prochaine séance</h3><span className="pill">{nextWorkout ? statusLabel(nextWorkout.status) : "À planifier"}</span></div>
            {nextWorkout ? (
              <>
                <strong>{nextWorkout.title}</strong>
                <p className="muted">{formatDayDate(nextWorkout.scheduled_for)} · {nextWorkout.duration_minutes || 45} min</p>
              </>
            ) : <EmptyState title="Aucune séance future" text="Planifiez la prochaine étape depuis l'onglet Entraînement." />}
          </article>
          <article className="panel span-6 stack">
            <div className="row between"><h3>Nutrition du jour</h3><span className="pill gold">{todayMeals.length} repas</span></div>
            <strong>{Math.round(mealTotals.calories)} / {nutrition?.calories || assessment?.calories || 0} kcal</strong>
            <p className="muted">{Math.round(mealTotals.protein)} g protéines · {Math.round(mealTotals.carbs)} g glucides · {Math.round(mealTotals.fat)} g lipides</p>
          </article>
          <article className="panel span-6 stack">
            <h3>Dernières interactions</h3>
            {messages.slice(0, 3).map((message: any) => (
              <div className="list-item" key={message.id}><strong>{message.sender_id === client.id ? client.first_name : "Coach"}</strong><p>{displayUserText(message.body)}</p><span className="muted small">{formatDate(message.created_at)}</span></div>
            ))}
            {!messages.length ? <EmptyState title="Aucun échange" text="La conversation peut être ouverte depuis l'onglet Messages." /> : null}
          </article>
          <article className="panel span-6 stack">
            <h3>Actions prioritaires</h3>
            {(assessment?.pain || []).length ? <p className="notice danger-notice">Douleur déclarée : {(assessment.pain || []).join(", ")}</p> : null}
            {aiRecommendations.filter((item: any) => item.status === "pending").slice(0, 2).map((item: any) => (
              <div className="list-item stack" key={item.id}><strong>{item.problem}</strong><span className="muted small">{priorityLabel(item.priority)}</span></div>
            ))}
            {!(assessment?.pain || []).length && !aiRecommendations.some((item: any) => item.status === "pending") ? <p className="muted">Aucune action urgente détectée.</p> : null}
          </article>
        </section>
      </section>
    );
  }

  if (tab === "assessment") {
    return (
      <section className="stack">
        <AssessmentEditor client={client} assessment={assessment} />
        <section className="panel stack">
          <h3>Bilans hebdomadaires transmis</h3>
          {weeklyCheckins.map((checkin: any, index: number) => {
            const previous = weeklyCheckins[index + 1];
            return (
            <article className="list-item" key={checkin.id}>
              <strong>Semaine du {checkin.week_start} - {weeklyCheckinStatusLabel(checkin)}</strong>
              <div className="checkin-score-grid">
                <span>Énergie <strong>{checkin.energy}/10</strong>{previous ? <small>{trendText(checkin.energy, previous.energy)}</small> : null}</span>
                <span>Stress <strong>{checkin.stress}/10</strong>{previous ? <small>{trendText(previous.stress, checkin.stress)}</small> : null}</span>
                <span>Sommeil <strong>{checkin.sleep_hours} h</strong>{previous ? <small>{trendText(checkin.sleep_hours, previous.sleep_hours)}</small> : null}</span>
                <span>Hydratation <strong>{checkin.average_hydration || 0} L</strong>{previous ? <small>{trendText(checkin.average_hydration, previous.average_hydration)}</small> : null}</span>
                <span>RPE <strong>{checkin.training_rpe}/10</strong></span>
                <span>Nutrition <strong>{checkin.nutrition_adherence}/10</strong></span>
              </div>
              <p>{checkin.weekly_win || "Aucune réussite renseignée."}</p>
              {checkin.pain ? <p className="notice danger-notice">Douleur : {checkin.pain}{checkin.pain_location ? ` · ${checkin.pain_location}` : ""}</p> : null}
              {checkin.journal?.body ? (
                <p className="note-block">Note privée partagée : {checkin.journal.body}</p>
              ) : (
                <p className="muted small">Journal privé non partagé avec le coach.</p>
              )}
              {Array.isArray(checkin.photos) && checkin.photos.length ? (
                <div className="row wrap">
                  {checkin.photos.map((photo: any, index: number) => photo.signed_url ? (
                    <a className="pill" href={photo.signed_url} target="_blank" rel="noreferrer" key={photo.path || index}>Photo {index + 1}</a>
                  ) : (
                    <span className="pill" key={photo.path || index}>Photo sécurisée</span>
                  ))}
                </div>
              ) : null}
              <div className="row">
                {checkin.status === "submitted" && !checkin.viewed_at ? (
                  <form action={markWeeklyCheckinViewedAction}>
                    <input type="hidden" name="checkinId" value={checkin.id} />
                    <button className="ghost">Marquer consulté</button>
                  </form>
                ) : null}
                {checkin.status === "submitted" ? (
                  <form action={lockWeeklyCheckinAction}>
                    <input type="hidden" name="checkinId" value={checkin.id} />
                    <button className="ghost">Verrouiller</button>
                  </form>
                ) : null}
              </div>
            </article>
          );})}
          {!weeklyCheckins.length ? <EmptyState title="Aucun bilan hebdo transmis" text="Les bilans envoyés par le client apparaîtront ici." /> : null}
        </section>
        <CoachMessagesPanel client={client} messages={messages} compact prompt="Demander une précision sur ce bilan" />
      </section>
    );
  }

  if (tab === "nutrition") {
    return (
      <section className="stack">
        <section className="grid">
          {kpi("Calories aujourd'hui", Math.round(mealTotals.calories), `objectif ${nutrition?.calories || assessment?.calories || 0}`)}
          {kpi("Protéines", `${Math.round(mealTotals.protein)} g`, `objectif ${nutrition?.protein || assessment?.protein || 0} g`)}
          {kpi("Hydratation", `${hydrationTotal.toFixed(1)} L`, `objectif ${nutrition?.water_liters || 0} L`)}
          {kpi("Repas", todayMeals.length, "enregistrés aujourd'hui")}
        </section>
        <NutritionEditor client={client} assessment={assessment} nutrition={nutrition} />
        <section className="grid">
          <article className="panel span-7 stack"><h3>Repas récents</h3>{mealEntries.slice(0, 8).map((meal: any) => <div className="list-item" key={meal.id}><div className="row between"><strong>{meal.meal_name}</strong><span>{meal.calories} kcal</span></div><p className="muted small">{meal.description} · {meal.meal_date}</p></div>)}{!mealEntries.length ? <EmptyState title="Aucun repas enregistré" text="Les saisies du client apparaîtront ici." /> : null}</article>
          <article className="panel span-5 stack"><h3>Hydratation récente</h3>{hydrationEntries.slice(0, 8).map((entry: any) => <div className="list-item" key={entry.id}><strong>{Number(entry.liters).toFixed(2)} L</strong><span className="muted small">{entry.entry_date}</span></div>)}{!hydrationEntries.length ? <EmptyState title="Aucune saisie" text="L'historique hydrique apparaîtra ici." /> : null}</article>
        </section>
      </section>
    );
  }

  if (tab === "training") {
    return (
      <section className="stack">
        <section className="grid">
          {kpi("Planifiées", workouts.filter((item: any) => item.status === "planned").length, "séances à venir")}
          {kpi("Terminées", completed, "séances réalisées")}
          {kpi("Manquées", workouts.filter((item: any) => item.status === "missed").length, "à reprogrammer")}
          {kpi("Dernier RPE", weeklyCheckins[0]?.training_rpe || "-", "dernier bilan")}
        </section>
        <TrainingEditor client={client} workouts={workouts} />
      </section>
    );
  }

  if (tab === "progress") {
    const weightPoints = measurements.map((item: any) => ({ label: formatDayDate(String(item.measured_at).slice(0, 10)), value: Number(item.weight_kg || 0) })).filter((item: any) => item.value > 0);
    const energyPoints = weeklyCheckins.map((item: any) => ({ label: formatDayDate(item.week_start), value: Number(item.energy || 0) })).filter((item: any) => item.value > 0).reverse();
    const sleepPoints = weeklyCheckins.map((item: any) => ({ label: formatDayDate(item.week_start), value: Number(item.sleep_hours || 0) })).filter((item: any) => item.value > 0).reverse();
    const rpePoints = weeklyCheckins.map((item: any) => ({ label: formatDayDate(item.week_start), value: Number(item.training_rpe || 0) })).filter((item: any) => item.value > 0).reverse();
    return (
      <section className="stack">
        <section className="progress-grid">
          <ChartCard title="Poids" unit="kg" points={weightPoints} />
          <ChartCard title="Énergie" unit="/10" points={energyPoints} />
          <ChartCard title="Sommeil" unit="h" points={sleepPoints} />
          <ChartCard title="RPE" unit="/10" points={rpePoints} />
        </section>
        <section className="grid">
          {kpi("Assiduité", workouts.length ? `${Math.round((completed / workouts.length) * 100)}%` : "-", `${completed}/${workouts.length} séances`)}
          {kpi("Bilans", weeklyCheckins.length, "dans l'historique")}
          {kpi("Repas suivis", mealEntries.length, "saisies disponibles")}
          {kpi("Hydratation", hydrationEntries.length, "saisies disponibles")}
        </section>
      </section>
    );
  }

  if (tab === "messages") {
    return <CoachMessagesPanel client={client} messages={messages} />;
  }

  if (tab === "media") {
    const photos = weeklyCheckins.flatMap((checkin: any) => (checkin.photos || []).map((photo: any) => ({ ...photo, weekStart: checkin.week_start })));
    return (
      <section className="stack">
        <article className="panel stack">
          <h3>Photos de progression</h3>
          <p className="muted">Seuls les médias autorisés et rattachés à ce client sont affichés avec un accès temporaire.</p>
          <div className="media-gallery">
            {photos.map((photo: any, index: number) => photo.signed_url ? (
              <a href={photo.signed_url} target="_blank" rel="noreferrer" className="media-tile" key={photo.path || index}>
                <img src={photo.signed_url} alt={`Progression du ${photo.weekStart}`} />
                <span>Semaine du {photo.weekStart}</span>
              </a>
            ) : null)}
          </div>
          {!photos.some((photo: any) => photo.signed_url) ? <EmptyState title="Aucun média partagé" text="Les photos autorisées par le client apparaîtront ici." /> : null}
        </article>
      </section>
    );
  }

  const timeline = [
    ...auditLogs.map((item: any) => ({ id: `audit-${item.id}`, date: item.created_at, title: auditActionLabel(item.action), text: item.summary || "Action enregistrée" })),
    ...aiRecommendations.map((item: any) => ({ id: `ai-${item.id}`, date: item.created_at, title: `Proposition · ${recommendationTypeLabel(item.type)}`, text: `${item.problem} · ${statusLabel(item.status)}` })),
    ...aiActions.map((item: any) => ({ id: `action-${item.id}`, date: item.created_at, title: aiActionTypeLabel(item.action_type), text: statusLabel(item.status) })),
    ...messages.map((item: any) => ({ id: `message-${item.id}`, date: item.created_at, title: item.sender_id === client.id ? "Message du client" : "Message du coach", text: item.body }))
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  return (
    <div className="list timeline-list">
      {timeline.map((item) => <article className="list-item" key={item.id}><strong>{item.title}</strong><p className="muted small">{formatDate(item.date)}</p><p>{item.text}</p></article>)}
      {!timeline.length ? <EmptyState title="Aucun historique" text="Les actions enregistrées apparaîtront ici." /> : null}
    </div>
  );
}

function AssessmentEditor({ client, assessment }: { client: any; assessment: any }) {
  const [state, action, pending] = useActionState(updateAssessmentStateAction, { status: "idle", message: "" });
  return (
    <form className="grid" action={action}>
      <input type="hidden" name="clientId" value={client.id} />
      <label className="span-3">Âge <input name="age" type="number" min="12" max="100" defaultValue={assessment?.age || 30} required /></label>
      <label className="span-3">Sexe <select name="sex" defaultValue={assessment?.sex || "homme"}><option value="homme">Homme</option><option value="femme">Femme</option></select></label>
      <label className="span-3">Taille (cm) <input name="heightCm" type="number" min="120" max="230" defaultValue={assessment?.height_cm || 175} required /></label>
      <label className="span-3">Poids (kg) <input name="weightKg" type="number" min="30" max="300" step="0.1" defaultValue={assessment?.weight_kg || 75} required /></label>
      <label className="span-3">Masse grasse (%) <input name="bodyFatPercent" type="number" min="0" max="70" step="0.1" defaultValue={assessment?.body_fat_percent || 0} /></label>
      <label className="span-3">Formule <select name="formula" defaultValue={assessment?.formula || "maintien"}><option value="perte">Perte de poids</option><option value="masse">Prise de masse</option><option value="maintien">Maintien</option></select></label>
      <label className="span-3">Niveau <input name="level" defaultValue={assessment?.level || "debutant"} /></label>
      <label className="span-3">Sport <input name="sport" defaultValue={assessment?.sport || "general"} /></label>
      <label className="span-6">Objectif <input name="goal" defaultValue={assessment?.goal || ""} /></label>
      <label className="span-6">Blessures <input name="injuries" defaultValue={(assessment?.injuries || []).join(", ")} /></label>
      <label className="span-6">Douleurs <input name="pain" defaultValue={(assessment?.pain || []).join(", ")} /></label>
      <label className="span-6">Préférences alimentaires <input name="foodPreferences" defaultValue={(assessment?.food_preferences || []).join(", ")} /></label>
      <label className="span-6">Allergies <input name="allergies" defaultValue={(assessment?.allergies || []).join(", ")} /></label>
      <label className="span-6">Restrictions <input name="restrictions" defaultValue={(assessment?.restrictions || []).join(", ")} /></label>
      <label className="span-3">Activité h/semaine <input name="activityHours" type="number" min="0" max="40" defaultValue={assessment?.activity_hours || 3} /></label>
      <button className="primary span-12" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer le bilan"}</button>
      <div className="span-12"><ActionStatus state={pending ? { status: "idle", message: "Recalcul des objectifs..." } : state} /></div>
    </form>
  );
}

function NutritionEditor({ client, assessment, nutrition }: { client: any; assessment: any; nutrition: any }) {
  const [state, action, pending] = useActionState(updateNutritionStateAction, { status: "idle", message: "" });
  return (
    <form className="grid" action={action}>
      <input type="hidden" name="clientId" value={client.id} />
      <label className="span-3">Calories <input name="calories" type="number" min="800" max="8000" defaultValue={nutrition?.calories || assessment?.calories || 2200} required /></label>
      <label className="span-3">Protéines (g) <input name="protein" type="number" min="0" max="500" defaultValue={nutrition?.protein || assessment?.protein || 150} required /></label>
      <label className="span-3">Glucides (g) <input name="carbs" type="number" min="0" max="1000" defaultValue={nutrition?.carbs || assessment?.carbs || 220} required /></label>
      <label className="span-3">Lipides (g) <input name="fat" type="number" min="0" max="400" defaultValue={nutrition?.fat || assessment?.fat || 70} required /></label>
      <label className="span-3">Hydratation (L) <input name="waterLiters" type="number" min="0.5" max="10" step="0.1" defaultValue={nutrition?.water_liters || 2.4} required /></label>
      <button className="primary span-12" disabled={pending}>{pending ? "Enregistrement..." : "Valider les objectifs nutritionnels"}</button>
      <div className="span-12"><ActionStatus state={pending ? { status: "idle", message: "Mise à jour du dossier..." } : state} /></div>
    </form>
  );
}

function TrainingEditor({ client, workouts }: { client: any; workouts: any[] }) {
  const [state, action, pending] = useActionState(assignWorkoutStateAction, { status: "idle", message: "" });
  return (
    <section className="stack">
      <form className="grid" action={action}>
        <input type="hidden" name="clientId" value={client.id} />
        <label className="span-4">Titre <input name="title" required placeholder="Ex : Force bas du corps" /></label>
        <label className="span-4">Date <input name="scheduledFor" type="date" required /></label>
        <label className="span-4">Durée (min) <input name="durationMinutes" type="number" min="10" max="240" defaultValue={45} required /></label>
        <label className="span-6">Objectif <input name="focus" placeholder="Ex : technique et progression" /></label>
        <label className="span-6">Exercices <input name="exercises" placeholder="Squat, développé couché, rowing" required /></label>
        <label className="span-12">Consignes <textarea name="notes" rows={3} placeholder="Tempo, adaptation douleur, niveau d'effort..." /></label>
        <button className="primary span-12" disabled={pending}>{pending ? "Attribution..." : "Attribuer cette séance"}</button>
        <div className="span-12"><ActionStatus state={pending ? { status: "idle", message: "Ajout au planning du client..." } : state} /></div>
      </form>
      <div className="list">
        {workouts.map((workout: any) => <WorkoutEditorItem key={workout.id} workout={workout} />)}
        {!workouts.length ? <EmptyState title="Aucune séance" text="Attribuez une séance pour construire le programme." /> : null}
      </div>
    </section>
  );
}

function WorkoutEditorItem({ workout }: { workout: any }) {
  const [state, action, pending] = useActionState(updateWorkoutStateAction, { status: "idle", message: "" });
  const exercises = Array.isArray(workout.exercises)
    ? workout.exercises.map((exercise: any) => typeof exercise === "string" ? exercise : exercise.name).filter(Boolean).join(", ")
    : "";
  return (
    <article className="list-item stack">
      <div className="row between">
        <div><strong>{workout.title}</strong><p className="muted">{statusLabel(workout.status)} · {formatDayDate(workout.scheduled_for)}</p></div>
        <span className="pill">{workout.duration_minutes || 45} min</span>
      </div>
      <details className="subtle-details">
        <summary>Modifier la séance</summary>
        <form className="grid" action={action}>
          <input type="hidden" name="workoutId" value={workout.id} />
          <label className="span-4">Titre <input name="title" defaultValue={workout.title} required /></label>
          <label className="span-4">Date <input name="scheduledFor" type="date" defaultValue={workout.scheduled_for} required /></label>
          <label className="span-4">Durée <input name="durationMinutes" type="number" min="10" max="240" defaultValue={workout.duration_minutes || 45} required /></label>
          <label className="span-6">Objectif <input name="focus" defaultValue={workout.focus || ""} /></label>
          <label className="span-6">Exercices <input name="exercises" defaultValue={exercises} required /></label>
          <label className="span-12">Consignes <textarea name="notes" rows={3} defaultValue={workout.notes || ""} /></label>
          <button className="primary span-12" disabled={pending}>{pending ? "Modification..." : "Enregistrer les modifications"}</button>
        </form>
        <ActionStatus state={pending ? { status: "idle", message: "Mise à jour de la séance..." } : state} />
      </details>
    </article>
  );
}

function CoachMessagesPanel({
  client,
  messages,
  compact = false,
  prompt
}: {
  client: any;
  messages: any[];
  compact?: boolean;
  prompt?: string;
}) {
  const [state, action, pending] = useActionState(sendMessageStateAction, { status: "idle", message: "" });
  const [readState, readAction, readPending] = useActionState(markClientMessagesReadStateAction, { status: "idle", message: "" });
  const unread = messages.filter((message: any) => message.sender_id === client.id && !message.read_at);
  const chronological = [...messages].sort((left: any, right: any) => String(left.created_at).localeCompare(String(right.created_at)));
  return (
    <section className={`stack ${compact ? "compact-messages" : "coach-messages-panel"}`}>
      <div className="row between">
        <div><h3>{prompt || `Conversation avec ${client.first_name}`}</h3><p className="muted small">{unread.length} message(s) non lu(s)</p></div>
        {unread.length ? (
          <form action={readAction}>
            <input type="hidden" name="clientId" value={client.id} />
            <button className="ghost" disabled={readPending}>{readPending ? "Mise à jour..." : "Marquer comme lus"}</button>
          </form>
        ) : null}
      </div>
      <ActionStatus state={readState} />
      <form className="row message-composer" action={action}>
        <input type="hidden" name="recipientId" value={client.id} />
        <label className="sr-only" htmlFor={`message-${client.id}`}>Message au client</label>
        <input id={`message-${client.id}`} name="body" required placeholder={`Écrire à ${client.first_name}`} />
        <button className="primary" disabled={pending}>{pending ? "Envoi..." : "Envoyer"}</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Envoi du message..." } : state} />
      <div className="list">
        {chronological.map((message: any) => (
          <article className={`list-item message-bubble ${message.sender_id === client.id ? "from-client" : "from-coach"}`} key={message.id}>
            <strong>{message.sender_id === client.id ? client.first_name : "Vous"}</strong>
            <p>{displayUserText(message.body)}</p>
            <span className="muted small">{formatDate(message.created_at)}{message.read_at ? " · Lu" : ""}</span>
          </article>
        ))}
        {!messages.length ? <EmptyState title="Aucun message" text="Envoyez le premier message depuis ce formulaire." /> : null}
      </div>
    </section>
  );
}

function CoachAiSidePanel({ client, recommendations, actions, context }: any) {
  const clientRecommendations = client
    ? recommendations.filter((item: any) => item.client_id === client.id)
    : recommendations;
  return (
    <aside className="coach-ai-panel panel stack">
      <div>
        <span className="pill gold">Analyse sécurisée</span>
        <h2>Agent IA Coach</h2>
        <p className="muted small">Contexte actuel : {context || "Vue d'ensemble"}. Rien de visible côté client sans votre validation puis votre confirmation d'application.</p>
      </div>
      {client ? (
        <AnalyzeClientForm client={client} label={`Analyser ${client.first_name}`} compact />
      ) : null}
      {client ? (
        <PrepareAiRequestForm client={client} compact />
      ) : null}
      <div className="list">
        {clientRecommendations.slice(0, 3).map((recommendation: any) => (
          <AiRecommendationCard recommendation={recommendation} key={recommendation.id} />
        ))}
        {!clientRecommendations.length ? <EmptyState title="Aucune action IA" text="Lancez une analyse pour obtenir une proposition." /> : null}
      </div>
      <details className="subtle-details">
        <summary>Historique IA</summary>
        <div className="list">
          {actions.slice(0, 4).map((action: any) => (
            <article className="list-item" key={action.id}>
              <strong>{aiActionTypeLabel(action.action_type)}</strong>
              <p className="muted small">{statusLabel(action.status)} - {formatDate(action.created_at)}</p>
            </article>
          ))}
          {!actions.length ? <p className="muted small">Aucune action appliquée.</p> : null}
        </div>
      </details>
    </aside>
  );
}

function AnalyzeClientForm({ client, label, compact = false }: { client: any; label: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(analyzeClientWithAiStateAction, { status: "idle", message: "" });
  return (
    <form className={compact ? "stack compact-action-form" : "stack"} action={action}>
      <input type="hidden" name="clientId" value={client.id} />
      <button className="primary" disabled={pending}>{pending ? "Analyse en cours..." : label}</button>
      <ActionStatus state={pending ? { status: "idle", message: "Lecture des données client et préparation des propositions..." } : state} />
    </form>
  );
}

function PrepareAiRequestForm({ client, compact = false }: { client: any; compact?: boolean }) {
  const [state, action, pending] = useActionState(createAiRecommendationStateAction, { status: "idle", message: "" });
  return (
    <form className={compact ? "stack compact-action-form" : "ai-request-form"} action={action}>
      <input type="hidden" name="clientId" value={client.id} />
      <label>Demander une action pour {client.first_name}
        <input name="proposal" required placeholder="Ex : préparer un ajustement nutritionnel prudent" />
      </label>
      <button className="ghost" disabled={pending}>{pending ? "Préparation..." : "Préparer la demande"}</button>
      <ActionStatus state={pending ? { status: "idle", message: "Préparation d'une proposition sans application automatique..." } : state} />
    </form>
  );
}

function AnalyzeAllClientsForm() {
  const [state, action, pending] = useActionState(analyzeAllClientsWithAiStateAction, { status: "idle", message: "" });
  return (
    <div className="stack compact-action-form">
      <form action={action}>
        <button className="primary" disabled={pending}>{pending ? "Analyse globale en cours..." : "Analyser tous les clients"}</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Analyse des dossiers rattachés..." } : state} />
    </div>
  );
}

function ActionStatus({ state }: { state: { status: string; message: string } }) {
  if (!state.message) return null;
  return (
    <p className={`form-status ${state.status === "error" ? "error" : state.status === "success" ? "success" : ""}`} role="status">
      {state.message}
    </p>
  );
}

function AiRecommendationCard({ recommendation }: { recommendation: any }) {
  const [decisionState, decisionAction, decisionPending] = useActionState(decideAiRecommendationStateAction, { status: "idle", message: "" });
  const [applyState, applyAction, applyPending] = useActionState(applyAiRecommendationStateAction, { status: "idle", message: "" });
  return (
    <article className="list-item stack ai-card">
      <div className="row between ai-card-top">
        <div>
          <span className="pill gold">{priorityLabel(recommendation.priority)}</span>
          <h3>{recommendationTypeLabel(recommendation.type)} - {recommendation.problem}</h3>
          <p className="muted small">{statusLabel(recommendation.status)} · créée le {formatDate(recommendation.created_at)} · confiance {Math.round(Number(recommendation.confidence) * 100)}%</p>
        </div>
      </div>
      <div className="ai-explain-grid">
        <InfoBlock title="Pourquoi" value={recommendation.justification} />
        <InfoBlock title="Éléments pris en compte" value={formatJsonForDisplay(recommendation.current_state)} code />
        <InfoBlock title="Ce qui change" value={recommendation.expected_benefit} />
      </div>
      <DiffPreview before={recommendation.current_state} after={recommendation.coach_edit || recommendation.proposed_change} />
      <form className="grid" action={decisionAction}>
        <input type="hidden" name="recommendationId" value={recommendation.id} />
        <label className="span-8">Ajustement structuré avant validation
          <textarea name="coachEdit" rows={3} placeholder='{"calories": 1900, "protein": 135}' />
        </label>
        <label className="span-4">Note coach <input name="note" placeholder="Décision de Milo" /></label>
        <button className="ghost span-3" name="decision" value="approve" disabled={decisionPending}>Modifier et valider</button>
        <button className="primary span-3" name="decision" value="approve" disabled={decisionPending}>Valider</button>
        <button className="ghost span-3" name="decision" value="postpone" disabled={decisionPending}>Reporter</button>
        <button className="danger span-3" name="decision" value="reject" disabled={decisionPending}>Refuser</button>
      </form>
      <ActionStatus state={decisionPending ? { status: "idle", message: "Traitement de la décision..." } : decisionState} />
      {["approved", "modified"].includes(recommendation.status) && ["nutrition", "training"].includes(recommendation.type) ? (
        <form
          action={applyAction}
          onSubmit={(event) => {
            const change = recommendation.coach_edit || recommendation.proposed_change;
            if (!window.confirm(`Appliquer cette modification au dossier client ?\n\n${formatJsonForDisplay(change)}`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="recommendationId" value={recommendation.id} />
          <button className="primary" disabled={applyPending}>Appliquer la modification {recommendation.type === "nutrition" ? "nutrition" : "entraînement"}</button>
        </form>
      ) : null}
      <ActionStatus state={applyPending ? { status: "idle", message: "Application transactionnelle..." } : applyState} />
    </article>
  );
}

function RecipeCreator() {
  const [state, action, pending] = useActionState(createRecipeStateAction, { status: "idle", message: "" });
  return (
    <details className="panel subtle-details recipe-creator">
      <summary>Créer une nouvelle recette</summary>
      <form className="grid" action={action}>
        <label className="span-4">Nom <input name="name" required minLength={3} placeholder="Bowl poulet, riz et légumes" /></label>
        <label className="span-4">Objectif <input name="objective" required placeholder="Déjeuner post-entraînement" /></label>
        <label className="span-4">Formules <input name="formulas" required placeholder="masse, maintien" /></label>
        <label className="span-12">Description <textarea name="description" rows={3} required minLength={10} placeholder="Une description claire et appétissante." /></label>
        <label className="span-3">Calories <input name="calories" type="number" min="1" max="5000" required /></label>
        <label className="span-3">Protéines (g) <input name="protein" type="number" min="0" max="500" required /></label>
        <label className="span-3">Glucides (g) <input name="carbs" type="number" min="0" max="1000" required /></label>
        <label className="span-3">Lipides (g) <input name="fat" type="number" min="0" max="500" required /></label>
        <label className="span-3">Portions <input name="portions" type="number" min="1" max="20" defaultValue="1" required /></label>
        <label className="span-3">Préparation (min) <input name="prepMinutes" type="number" min="0" max="600" defaultValue="10" required /></label>
        <label className="span-3">Cuisson (min) <input name="cookMinutes" type="number" min="0" max="600" defaultValue="20" required /></label>
        <label className="span-3">Difficulté
          <select name="difficulty" defaultValue="facile"><option value="facile">Facile</option><option value="intermediaire">Intermédiaire</option><option value="avance">Avancée</option></select>
        </label>
        <label className="span-6">Ingrédients, un par ligne <textarea name="ingredients" rows={6} required placeholder={"150 g de poulet\n120 g de riz\nLégumes de saison"} /></label>
        <label className="span-6">Étapes, une par ligne <textarea name="steps" rows={6} required placeholder={"Cuire le riz.\nSaisir le poulet.\nAssembler et assaisonner."} /></label>
        <label className="span-4">Objectifs ciblés <input name="goals" placeholder="prise de masse" /></label>
        <label className="span-4">Allergènes <input name="allergens" placeholder="gluten, lait" /></label>
        <label className="span-4">Préférences <input name="dietTags" placeholder="végétarien, sans lactose" /></label>
        <label className="span-6">Conseil du coach <input name="coachTip" placeholder="Variante ou moment conseillé" /></label>
        <label className="span-6">Description de l'image <input name="imageAlt" placeholder="Bowl de poulet et légumes" /></label>
        <button className="primary span-12" disabled={pending}>{pending ? "Création..." : "Créer la recette"}</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Création de la recette et de ses étapes..." } : state} />
    </details>
  );
}

function BadgeAwardForm({ clients }: { clients: any[] }) {
  const [state, action, pending] = useActionState(awardBadgeStateAction, { status: "idle", message: "" });
  return (
    <details className="subtle-details">
      <summary>Attribuer un badge</summary>
      <form className="grid" action={action}>
        <label className="span-6">Client
          <select name="clientId" required defaultValue="">
            <option value="" disabled>Choisir un client</option>
            {clients.map((client: any) => <option key={client.id} value={client.id}>{client.first_name} {client.last_name}</option>)}
          </select>
        </label>
        <label className="span-6">Badge
          <select name="title" required defaultValue="Source claire">
            {badgeCatalog.map((badge) => <option key={badge.code} value={badge.name}>{badge.name} · {badge.category}</option>)}
          </select>
        </label>
        <button className="primary span-12" disabled={pending}>{pending ? "Attribution..." : "Attribuer le badge"}</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Attribution au dossier client..." } : state} />
    </details>
  );
}

function ChallengeCreator({ clients }: { clients: any[] }) {
  const [state, action, pending] = useActionState(createChallengeStateAction, { status: "idle", message: "" });
  return (
    <details className="subtle-details">
      <summary>Créer un défi</summary>
      <form className="grid" action={action}>
        <label className="span-6">Client
          <select name="clientId" required defaultValue="">
            <option value="" disabled>Choisir un client</option>
            {clients.map((client: any) => <option key={client.id} value={client.id}>{client.first_name} {client.last_name}</option>)}
          </select>
        </label>
        <label className="span-6">Titre <input name="title" required minLength={3} maxLength={140} placeholder="7 jours d'hydratation régulière" /></label>
        <label className="span-12">Date de fin <input name="endsAt" type="datetime-local" /></label>
        <button className="primary span-12" disabled={pending}>{pending ? "Création..." : "Créer et attribuer"}</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Création du défi..." } : state} />
    </details>
  );
}

function PublicationCreator({ clients }: { clients: any[] }) {
  const [targetMode, setTargetMode] = useState("all");
  const [state, action, pending] = useActionState(createPublicationStateAction, { status: "idle", message: "" });
  return (
    <section className="panel stack">
      <div>
        <h2>Nouveau contenu</h2>
        <p className="muted">Un contenu peut rester brouillon, être publié immédiatement ou programmé.</p>
      </div>
      <form className="grid" action={action}>
        <label className="span-3">Type
          <select name="type" defaultValue="announcement">
            <option value="announcement">Annonce</option>
            <option value="workout">Séance</option>
            <option value="program">Programme</option>
            <option value="revision_card">Fiche de révision</option>
            <option value="deep_dive">Dossier complet</option>
            <option value="badge">Badge</option>
            <option value="challenge">Défi</option>
            <option value="notification">Notification</option>
          </select>
        </label>
        <label className="span-5">Titre <input name="title" required placeholder="Ex: Semaine focus hydratation" /></label>
        <label className="span-4">Catégorie <input name="category" defaultValue="general" /></label>
        <label className="span-12">Contenu <textarea name="body" required rows={4} placeholder="Message, consignes, fiche ou details du contenu" /></label>
        <label className="span-3">Ciblage
          <select name="targetMode" value={targetMode} onChange={(event) => setTargetMode(event.target.value)}>
            <option value="all">Tous mes clients</option>
            <option value="manual">Clients precis</option>
            <option value="profile">Profil intelligent</option>
          </select>
        </label>
        <fieldset className="span-9 client-target-fieldset" disabled={targetMode !== "manual"}>
          <legend>Clients précis</legend>
          <div className="client-target-grid">
            {clients.map((client: any) => (
              <label className="checkbox-line" key={client.id}>
                <input name="clientIds" type="checkbox" value={client.id} />
                <span className="client-avatar compact" aria-hidden="true">{initials(client)}</span>
                {client.first_name} {client.last_name}
              </label>
            ))}
            {!clients.length ? <span className="muted small">Aucun client rattaché.</span> : null}
          </div>
        </fieldset>
        <label className="span-3">Formules <input name="formulas" placeholder="perte, masse, maintien" /></label>
        <label className="span-3">Objectifs <input name="goals" placeholder="perte de poids" /></label>
        <label className="span-3">Sexes <input name="sexes" placeholder="femme, homme" /></label>
        <label className="span-3">Niveaux <input name="levels" placeholder="débutant, avancé" /></label>
        <label className="span-3">Sports <input name="sports" placeholder="musculation" /></label>
        <label className="span-3">Age min <input name="minAge" type="number" min={1} /></label>
        <label className="span-3">Age max <input name="maxAge" type="number" min={1} /></label>
        <label className="span-3">Publication <input name="publishAt" type="datetime-local" /></label>
        <label className="span-3">Fin visible <input name="endsAt" type="datetime-local" /></label>
        <button className="ghost span-4" name="intent" value="draft" disabled={pending}>Enregistrer brouillon</button>
        <button className="primary span-4" name="intent" value="publish" disabled={pending}>Publier maintenant</button>
        <button className="primary span-4" name="intent" value="schedule" disabled={pending}>Programmer</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Enregistrement du contenu..." } : state} />
    </section>
  );
}

export function ClientSupabaseApp({ profile, data }: { profile: any; data: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const active = clientNav.some((item) => item.id === requestedSection) ? requestedSection as ClientSection : "home";
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<{ recipe: any; index: number } | null>(null);
  useThemePersistence();

  useEffect(() => {
    const stored = window.localStorage.getItem("reboot.recipe.favorites");
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [active]);

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
  const today = parisDateIso();
  const nextWorkout = data.workouts
    .filter((workout: any) => workout.status !== "completed" && workout.scheduled_for >= today)
    .sort((a: any, b: any) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)))[0];
  const completedThisWeek = data.workouts.filter((workout: any) => workout.status === "completed" && daysSince(workout.updated_at || workout.scheduled_for) <= 7).length;
  const plannedThisWeek = data.workouts.filter((workout: any) => daysSince(workout.scheduled_for) <= 7 && daysSince(workout.scheduled_for) >= 0).length;
  const weeklyProgress = progressPercent(completedThisWeek, Math.max(plannedThisWeek, 1));
  const recommendation = displayContentTitle(data.contents[0]?.title || "Gardez le rythme cette semaine").replace(/^Démonstration\s*·\s*/i, "");
  const priorityAction = nextWorkout ? "Réaliser la prochaine séance" : "Consulter le plan de la semaine";
  const activeMeta = clientNav.find((item) => item.id === active) || clientNav[0];
  const todayMeals = (data.mealEntries || []).filter((meal: any) => meal.meal_date === today);
  const todayHydration = (data.hydrationEntries || []).filter((entry: any) => entry.entry_date === today);
  const mealTotals = sumMeals(todayMeals);
  const hydrationTotal = todayHydration.reduce((sum: number, entry: any) => sum + Number(entry.liters || 0), 0);
  const weeklyDraft = (data.weeklyCheckins || [])[0];
  const weeklySchedule = currentWeekSchedule(data.workouts || []);
  const nutritionTarget = Number(nutrition?.calories || assessment?.calories || 0);
  const hydrationTarget = Number(nutrition?.water_liters || 2.4);
  const coachNote = (data.messages || []).find((message: any) => message.sender_id !== profile.id)?.body;
  const recoveryScore = weeklyDraft ? Math.round((Number(weeklyDraft.energy || 0) + (11 - Number(weeklyDraft.stress || 5))) / 2) : 0;

  function toggleFavorite(recipeId: string) {
    const next = favorites.includes(recipeId) ? favorites.filter((id) => id !== recipeId) : [...favorites, recipeId];
    setFavorites(next);
    window.localStorage.setItem("reboot.recipe.favorites", JSON.stringify(next));
  }

  function navigateTo(section: ClientSection) {
    const target = (section === "home" ? "/client" : `${pathname}?section=${section}`) as Route;
    router.push(target, { scroll: false });
  }

  return (
    <main className={`app-shell client-app-shell ${menuOpen ? "menu-open" : ""}`} data-testid="client-workspace" data-role="client">
      <LiveUpdateBridge profile={profile} data={data} />
      <AppHeader roleLabel="Espace Athlète" navigationId="client-navigation" menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} />
      <aside className="sidebar client-sidebar" id="client-navigation" aria-label="Menu Athlète">
        <div className="brand">
          <span className="sidebar-brand-mark" aria-hidden="true">RP</span>
          <span className="brand-copy">
            <strong>Reboot Performance</strong>
            <span className="muted small">Menu Athlète</span>
          </span>
          <button className="drawer-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu athlète">×</button>
        </div>
        <nav className="nav" aria-label="Navigation client">
          {clientNav.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? "active" : ""}
              type="button"
              title={item.label}
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => { navigateTo(item.id); setMenuOpen(false); }}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="client-avatar compact" aria-hidden="true">{initials(profile)}</span>
          <span className="brand-copy"><strong>{profile.first_name} {profile.last_name}</strong><small>Athlète</small></span>
        </div>
      </aside>
      <button className="drawer-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu athlète" />
      <section className="content">
        <PageHeader eyebrow={formulaLabel(assessment?.formula)} title={activeMeta.title} subtitle={activeMeta.subtitle} />

        {active === "home" ? (
          <section className="page-panel client-home" aria-label="Accueil client">
            <article className="panel client-welcome-card">
              <div className="client-welcome-copy">
                <span className="pill gold">{formulaLabel(assessment?.formula)}</span>
                <p className="welcome-kicker">Bonjour {profile.first_name}</p>
                <h2>{assessment?.goal || "Votre objectif se construit avec votre coach"}</h2>
                <p className="muted">Une semaine structurée, des repères simples et un suivi adapté à votre rythme.</p>
                <div className="quick-actions">
                  <button className="primary" type="button" onClick={() => navigateTo(nextWorkout ? "active" : "weekly")}>{priorityAction}</button>
                  <button className="ghost" type="button" onClick={() => navigateTo("progress")}>Voir mes progrès</button>
                </div>
              </div>
              <div className="weekly-score" aria-label={`Progression hebdomadaire ${weeklyProgress}%`}>
                <span className="weekly-score-ring" style={{ "--score": `${weeklyProgress}%` } as CSSProperties}><strong>{weeklyProgress}%</strong></span>
                <span><strong>{completedThisWeek} séance(s)</strong><small>terminée(s) cette semaine</small></span>
              </div>
            </article>

            <section className="client-signal-grid" aria-label="Indicateurs du jour">
              <DashboardMetric label="Hydratation" value={`${hydrationTotal.toFixed(1)} L`} hint={`sur ${hydrationTarget.toFixed(1)} L`} progress={progressPercent(hydrationTotal, hydrationTarget)} tone="water" />
              <DashboardMetric label="Nutrition" value={`${Math.round(mealTotals.calories)} kcal`} hint={nutritionTarget ? `sur ${nutritionTarget} kcal` : "Cible à définir"} progress={progressPercent(mealTotals.calories, nutritionTarget)} tone="nutrition" />
              <DashboardMetric label="Sommeil" value={weeklyDraft?.sleep_hours ? `${weeklyDraft.sleep_hours} h` : "Non renseigné"} hint={weeklyDraft?.sleep_quality || "Dernier bilan"} progress={weeklyDraft?.sleep_hours ? progressPercent(Number(weeklyDraft.sleep_hours), 8) : 0} tone="sleep" />
              <DashboardMetric label="Récupération" value={weeklyDraft ? `${recoveryScore}/10` : "À renseigner"} hint="Énergie et stress du dernier bilan" progress={recoveryScore * 10} tone="recovery" />
              <DashboardMetric label="Bilan hebdomadaire" value={weeklyDraft ? weeklyCheckinStatusLabel(weeklyDraft) : "À commencer"} hint="Votre suivi de la semaine" progress={weeklyDraft?.status === "locked" ? 100 : weeklyDraft?.status === "submitted" ? 75 : weeklyDraft ? 35 : 0} tone="checkin" />
            </section>

            <section className="panel week-overview stack" aria-label="Aperçu de la semaine">
              <div className="row between">
                <div><span className="pill gold">Cette semaine</span><h2>Votre planning</h2></div>
                <button className="ghost" type="button" onClick={() => navigateTo("active")}>Ouvrir la séance</button>
              </div>
              <div className="week-calendar">
                {weeklySchedule.map(({ day, date, workout, isToday }) => (
                  <article className={`day-card ${isToday ? "today" : ""} ${workout ? "has-workout" : ""}`} key={date}>
                    <span>{day}<small>{new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</small></span>
                    <strong>{workout ? shortWorkoutTitle(workout.title) : "Récupération"}</strong>
                    <small>{workout ? statusLabel(workout.status) : "Libre"}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="client-home-bottom">
              <article className="panel next-session-card stack">
                <span className="pill gold">Prochaine étape</span>
                <h2>{nextWorkout ? shortWorkoutTitle(nextWorkout.title) : "Votre coach prépare la suite"}</h2>
                <p className="muted">{nextWorkout ? `${formatDayDate(nextWorkout.scheduled_for)} · ${nextWorkout.duration_minutes || 45} min` : "Aucune séance future n'est encore planifiée. Profitez de ce temps pour compléter votre bilan."}</p>
                <button className="primary" type="button" onClick={() => navigateTo(nextWorkout ? "active" : "weekly")}>{nextWorkout ? "Commencer la séance" : "Compléter mon bilan"}</button>
              </article>
              <article className="panel coach-note-card stack">
                <span className="pill">Note du coach</span>
                <blockquote>{coachNote || "Votre coach n'a pas encore ajouté de note cette semaine."}</blockquote>
                <p className="muted small">{recommendation}</p>
              </article>
            </section>
          </section>
        ) : null}

        {active === "active" ? (
          <WorkoutSessionPanel workout={nextWorkout} onNavigate={navigateTo} />
        ) : null}

        {active === "nutrition" ? (
          <section className="page-panel stack">
            <section className="nutrition-dashboard panel stack">
              <div className="row between">
                <div><span className="pill gold">Aujourd'hui</span><h2>Votre équilibre quotidien</h2><p className="muted">Les indicateurs se mettent à jour après chaque saisie enregistrée.</p></div>
                <span className="muted small">{new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full" }).format(new Date())}</span>
              </div>
              <DailyNutritionRings
                hydration={{ value: hydrationTotal, target: hydrationTarget }}
                totals={mealTotals}
                targets={{
                  calories: Number(nutrition?.calories || assessment?.calories || 0),
                  protein: Number(nutrition?.protein || assessment?.protein || 0),
                  carbs: Number(nutrition?.carbs || assessment?.carbs || 0),
                  fat: Number(nutrition?.fat || assessment?.fat || 0)
                }}
              />
              <HydrationPanel target={Number(nutrition?.water_liters || 2.4)} total={hydrationTotal} entries={todayHydration} />
            </section>
            <MealTrackingPanel
              meals={todayMeals}
              totals={mealTotals}
              targets={{
                calories: Number(nutrition?.calories || assessment?.calories || 0),
                protein: Number(nutrition?.protein || assessment?.protein || 0),
                carbs: Number(nutrition?.carbs || assessment?.carbs || 0),
                fat: Number(nutrition?.fat || assessment?.fat || 0)
              }}
            />
            <div className="panel stack">
              <div className="row between">
                <div>
                  <h2>Corner Cuisine Premium</h2>
                  <p className="muted">Recettes filtrées selon la formule, les allergies, les restrictions et les envois du coach.</p>
                </div>
                <span className="pill gold">{filteredRecipes.length} recette(s)</span>
              </div>
              <div className="row">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une recette" aria-label="Rechercher une recette" />
                <select value={recipeFilter} onChange={(event) => setRecipeFilter(event.target.value)} aria-label="Filtrer les recettes">
                  <option value="all">Toutes adaptées</option>
                  <option value="assigned">Envoyées par le coach</option>
                  <option value="perte">Perte</option>
                  <option value="masse">Masse</option>
                  <option value="maintien">Maintien</option>
                </select>
              </div>
            </div>
            <div className="recipe-grid premium-recipes">
              {filteredRecipes.map((recipe: any, recipeIndex: number) => (
                <article className="recipe-card premium-recipe" key={recipe.id}>
                  <div className="recipe-media">
                    <Image src={recipeImage(recipe, recipeIndex)} alt={recipe.image_alt || `Plat ${recipe.name}`} fill sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 33vw" />
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
                    <p className="muted small">{recipe.prep_minutes} min de préparation · {recipe.cook_minutes} min de cuisson · {difficultyLabel(recipe.difficulty)}</p>
                    <div className="recipe-detail">
                      <p>{recipe.coach_tip}</p>
                      <span className="pill gold">{assignments.has(recipe.id) ? "Envoyée par le coach" : "Adaptée à votre objectif"}</span>
                    </div>
                    <button className="primary" type="button" onClick={() => setSelectedRecipe({ recipe, index: recipeIndex })}>Voir la recette</button>
                  </div>
                </article>
              ))}
              {!filteredRecipes.length ? <EmptyState title="Aucune recette adaptée" text="Changez la recherche ou demandez une recette à Milo." /> : null}
            </div>
            {selectedRecipe ? (
              <RecipeDetailModal
                recipe={selectedRecipe.recipe}
                recipeIndex={selectedRecipe.index}
                assigned={assignments.has(selectedRecipe.recipe.id)}
                onClose={() => setSelectedRecipe(null)}
              />
            ) : null}
          </section>
        ) : null}

        {active === "weekly" ? (
          <WeeklyCheckinPanel checkin={weeklyDraft} assessment={assessment} hydrationTarget={Number(nutrition?.water_liters || 2.4)} />
        ) : null}

        {active === "progress" ? (
          <ProgressPanel
            assessment={assessment}
            measurements={data.measurements || []}
            checkins={data.weeklyCheckins || []}
            workouts={data.workouts || []}
            auditLogs={data.auditLogs || []}
            meals={data.mealEntries || []}
            hydration={data.hydrationEntries || []}
            nutrition={nutrition}
            onNavigate={navigateTo}
          />
        ) : null}

        {active === "tribe" ? (
          <TribePanel
            posts={data.tribePosts || []}
            contents={data.contents || []}
            badges={data.userBadges || []}
            challenges={data.challenges || []}
            hydrationTotal={hydrationTotal}
            hydrationTarget={hydrationTarget}
            workouts={data.workouts || []}
            checkins={data.weeklyCheckins || []}
            mealTotals={mealTotals}
            nutrition={nutrition}
          />
        ) : null}

        {active === "games" ? (
          <GamesPanel assessment={assessment} nutrition={nutrition} />
        ) : null}

        {active === "contents" ? (
          <LibraryPanel contents={data.contents || []} assessment={assessment} />
        ) : null}
      </section>
    </main>
  );
}

const demoTribePosts = [
  { id: "demo-1", author: "Nina P.", initials: "NP", kind: "victory", body: "Première semaine complète avec trois séances. Je sens déjà la différence dans mon énergie.", created_at: "2026-07-25T18:20:00Z" },
  { id: "demo-2", author: "Lucas M.", initials: "LM", kind: "training_feedback", body: "Nouveau record personnel au squat, propre et sans douleur.", created_at: "2026-07-25T12:10:00Z" },
  { id: "demo-3", author: "Sarah D.", initials: "SD", kind: "client_post", body: "Mon bowl saumon et légumes du Corner Cuisine était parfait après la séance.", created_at: "2026-07-24T19:35:00Z" },
  { id: "demo-4", author: "Amine R.", initials: "AR", kind: "victory", body: "Badge Hydratation débloqué après sept jours réguliers.", created_at: "2026-07-24T08:15:00Z" },
  { id: "demo-5", author: "Camille B.", initials: "CB", kind: "question", body: "Vous préférez placer la mobilité avant ou après une séance légère ?", created_at: "2026-07-23T17:40:00Z" },
  { id: "demo-6", author: "Hugo V.", initials: "HV", kind: "training_feedback", body: "Séance combat terminée avec un RPE mieux maîtrisé que la semaine dernière.", created_at: "2026-07-23T11:25:00Z" },
  { id: "demo-7", author: "Emma L.", initials: "EL", kind: "victory", body: "Un mois de régularité, sans chercher la perfection. Le rythme devient naturel.", created_at: "2026-07-22T20:05:00Z" },
  { id: "demo-8", author: "Thomas G.", initials: "TG", kind: "client_post", body: "Petit-déjeuner protéiné validé : simple, rapide et vraiment rassasiant.", created_at: "2026-07-22T07:50:00Z" },
  { id: "demo-9", author: "Julie C.", initials: "JC", kind: "victory", body: "Mon bilan montre un meilleur sommeil et moins de stress cette semaine.", created_at: "2026-07-21T18:45:00Z" },
  { id: "demo-10", author: "Mehdi A.", initials: "MA", kind: "training_feedback", body: "Retour progressif après blessure : toutes les répétitions sont passées sans gêne.", created_at: "2026-07-21T13:30:00Z" }
];

const demoLibraryCards = [
  {
    id: "demo-library-protein",
    type: "revision_card",
    title: "Protéines : construire ses repères",
    category: "Nutrition",
    summary: "Des repères simples pour répartir les protéines au fil de la journée.",
    body: "La régularité compte davantage qu'un repas parfait. Répartissez vos sources de protéines sur les principaux repas et adaptez les portions à vos objectifs.\n\nCommencez par identifier une source principale à chaque repas, puis complétez avec des aliments que vous appréciez.",
    keyPoints: ["Privilégier la régularité", "Varier les sources", "Respecter les objectifs définis avec le coach"],
    practicalTips: ["Préparer deux sources à l'avance", "Utiliser le suivi quotidien comme repère, pas comme jugement"],
    source: "Démonstration Reboot Performance",
    date: "2026-07-01T08:00:00Z",
    audience: [],
    demo: true
  },
  {
    id: "demo-library-recovery",
    type: "deep_dive",
    title: "Récupération : lire les signaux utiles",
    category: "Récupération",
    summary: "Sommeil, énergie et ressenti : trois signaux à observer sans surinterpréter une seule journée.",
    body: "Une récupération durable se lit sur plusieurs jours. Le sommeil, l'énergie au réveil et les sensations pendant l'échauffement donnent des indications complémentaires.\n\nUne baisse ponctuelle n'est pas toujours inquiétante. Une tendance répétée mérite en revanche d'être signalée dans le bilan hebdomadaire.",
    keyPoints: ["Observer les tendances", "Adapter sans culpabiliser", "Signaler toute douleur inhabituelle"],
    practicalTips: ["Conserver une heure de coucher régulière", "Noter son énergie dans le bilan"],
    source: "Démonstration Reboot Performance",
    date: "2026-07-02T08:00:00Z",
    audience: [],
    demo: true
  },
  {
    id: "demo-library-training",
    type: "revision_card",
    title: "RPE : ajuster l'effort avec précision",
    category: "Entraînement",
    summary: "Comprendre l'échelle RPE pour décrire l'intensité réelle d'une série.",
    body: "Le RPE traduit l'effort ressenti en fin de série. Un RPE 7 signifie généralement qu'il restait environ trois répétitions possibles avec une technique propre.\n\nUtilisez cette échelle avec constance. Elle aide le coach à ajuster les charges et le volume selon votre forme du jour.",
    keyPoints: ["RPE 10 correspond à un effort maximal", "La technique reste prioritaire", "Le ressenti peut varier selon la récupération"],
    practicalTips: ["Évaluer le RPE juste après la série", "Ajouter un commentaire en cas de douleur"],
    source: "Démonstration Reboot Performance",
    date: "2026-07-03T08:00:00Z",
    audience: [],
    demo: true
  }
];

const badgeCatalog = [
  { code: "hydration", icon: "◇", name: "Source claire", category: "Hydratation", description: "Atteindre son objectif hydrique quotidien.", target: 100 },
  { code: "attendance", icon: "✓", name: "Présence solide", category: "Assiduité", description: "Terminer trois séances planifiées.", target: 3 },
  { code: "training", icon: "↗", name: "Série après série", category: "Entraînement", description: "Terminer cinq séances.", target: 5 },
  { code: "progress", icon: "◎", name: "Cap franchi", category: "Progression", description: "Enregistrer deux mesures de progression.", target: 2 },
  { code: "nutrition", icon: "◌", name: "Équilibre quotidien", category: "Nutrition", description: "Atteindre 80 % de sa cible nutritionnelle.", target: 80 },
  { code: "checkin", icon: "▤", name: "Bilan fidèle", category: "Bilans", description: "Transmettre quatre bilans hebdomadaires.", target: 4 },
  { code: "community", icon: "★", name: "Esprit de club", category: "Communauté", description: "Publier un encouragement dans la Tribu.", target: 1 },
  { code: "consistency", icon: "◆", name: "Régularité", category: "Régularité", description: "Maintenir une semaine complète de suivi.", target: 7 }
];

function clientCommunityBody(body: unknown) {
  return displayCommunityBody(typeof body === "string" ? body : undefined).replace(/^Démonstration\s*·\s*/i, "");
}

function TribePanel({
  posts,
  contents,
  badges,
  challenges,
  hydrationTotal,
  hydrationTarget,
  workouts,
  checkins,
  mealTotals,
  nutrition
}: {
  posts: any[];
  contents: any[];
  badges: any[];
  challenges: any[];
  hydrationTotal: number;
  hydrationTarget: number;
  workouts: any[];
  checkins: any[];
  mealTotals: any;
  nutrition: any;
}) {
  const [state, action, pending] = useActionState(createTribePostStateAction, { status: "idle", message: "" });
  const feed = posts.length ? posts : contents.filter((content: any) => content.type === "announcement").slice(0, 5).map((content: any) => ({
    id: content.id,
    body: content.payload?.body || content.title,
    created_at: content.publish_at || content.created_at,
    source: "coach"
  }));
  const completedWorkouts = workouts.filter((item: any) => item.status === "completed").length;
  const nutritionProgress = progressPercent(mealTotals.calories, Number(nutrition?.calories || 0));
  const badgeProgress: Record<string, number> = {
    hydration: progressPercent(hydrationTotal, hydrationTarget),
    attendance: Math.min(3, completedWorkouts),
    training: Math.min(5, completedWorkouts),
    progress: Math.min(2, checkins.filter((item: any) => item.weight_kg || item.measurements).length),
    nutrition: nutritionProgress,
    checkin: Math.min(4, checkins.filter((item: any) => ["submitted", "locked"].includes(item.status)).length),
    community: Math.min(1, posts.length),
    consistency: Math.min(7, completedWorkouts + checkins.length + (hydrationTotal > 0 ? 1 : 0))
  };
  const badgeStates = badgeCatalog.map((badge) => {
    const unlocked = badges.some((item: any) => String(item.badge_code || item.badge_name || item.title || "").toLowerCase().includes(badge.code) || String(item.badge_name || item.title || "").toLowerCase() === badge.name.toLowerCase());
    const current = badgeProgress[badge.code] || 0;
    return { badge, unlocked, percent: unlocked ? 100 : progressPercent(current, badge.target) };
  });
  const nextBadge = badgeStates.filter((item) => !item.unlocked).sort((a, b) => b.percent - a.percent)[0];
  return (
    <section className="page-panel grid">
      <article className="panel span-8 stack">
        <div>
          <span className="pill gold">Tribu</span>
          <h2>Fil de groupe</h2>
          <p className="muted">Partagez une victoire, une question ou un retour d'entraînement.</p>
        </div>
        <form className="tribe-compose" action={action}>
          <label>Type de publication
            <select name="kind" defaultValue="client_post">
              <option value="client_post">Publication</option>
              <option value="victory">Victoire</option>
              <option value="question">Question</option>
              <option value="training_feedback">Retour d'entraînement</option>
            </select>
          </label>
          <label>Votre message<textarea name="body" rows={3} placeholder="Ex : séance terminée, bonnes sensations sur les squats." required /></label>
          <label>Lien média optionnel<input name="mediaUrl" type="url" placeholder="https://..." /></label>
          <button className="primary" disabled={pending}>Publier dans la Tribu</button>
        </form>
        <ActionStatus state={pending ? { status: "idle", message: "Publication en cours..." } : state} />
        <div className="list">
          {feed.map((post: any) => (
            <article className="list-item tribe-post" key={post.id}>
              <div className="row between">
                <strong>{tribeAuthorLabel(post)}</strong>
                <span className="muted small">{formatDate(post.created_at)}</span>
              </div>
              <span className="pill">{tribeKindLabel(post.kind)}</span>
              <p>{clientCommunityBody(post.body)}</p>
              {post.media_url ? <a className="button-link ghost" href={post.media_url}>Voir le média</a> : null}
            </article>
          ))}
          {!feed.length ? <EmptyState title="Aucune publication réelle" text="Publiez le premier message de votre communauté." /> : null}
          <div className="demo-community-header">
            <div><span className="pill gold">Exemples Reboot</span><h3>Repères de la communauté</h3></div>
            <p className="muted small">Ces publications sont des exemples Reboot et ne correspondent pas à de vrais clients.</p>
          </div>
          {demoTribePosts.map((post) => (
            <article className="list-item tribe-post demo-post" key={post.id}>
              <div className="row between">
                <div className="row"><span className="client-avatar compact" aria-hidden="true">{post.initials}</span><strong>{post.author}</strong></div>
                <span className="pill">Exemple</span>
              </div>
              <span className="pill">{tribeKindLabel(post.kind)}</span>
              <p>{post.body}</p>
            </article>
          ))}
        </div>
      </article>
      <aside className="panel span-4 stack badge-catalog">
        <div>
          <span className="pill gold">Badges</span>
          <h2>Votre catalogue</h2>
        </div>
        {nextBadge ? <article className="next-badge"><span className="muted small">Prochain badge</span><strong>{nextBadge.badge.name}</strong><div className="progress-track"><span style={{ width: `${nextBadge.percent}%` }} /></div><small>{nextBadge.percent}% atteint</small></article> : <p className="notice success-notice">Tous les badges disponibles sont débloqués.</p>}
        {badgeStates.map(({ badge, unlocked, percent }) => {
          return (
            <article className={`badge-catalog-item ${unlocked ? "unlocked" : "locked"}`} key={badge.code}>
              <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
              <div><span className="muted small">{badge.category}</span><strong>{badge.name}</strong><p className="muted small">{badge.description}</p><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><small>{unlocked ? "Débloqué" : `${percent}%`}</small></div>
            </article>
          );
        })}
        <div className="challenge-list">
          <h3>Défis actifs</h3>
          {challenges.slice(0, 3).map((challenge: any) => (
            <article className="badge-row" key={challenge.id}>
              <strong>{challenge.title}</strong>
              <span className="muted small">{statusLabel(challenge.status || "active")}</span>
            </article>
          ))}
          {!challenges.length ? <p className="muted small">Aucun défi actif pour le moment.</p> : null}
        </div>
      </aside>
    </section>
  );
}

const quizQuestions = [
  {
    question: "Quel signal indique souvent une récupération insuffisante ?",
    choices: ["Sommeil court et performances en baisse", "Une bonne hydratation", "Une progression reguliere"],
    answer: 0,
    explanation: "Le duo sommeil faible + baisse de performance mérite une adaptation de charge."
  },
  {
    question: "Pour une séance intense, quel nutriment soutient le mieux l'effort ?",
    choices: ["Glucides", "Lipides uniquement", "Aucun apport"],
    answer: 0,
    explanation: "Les glucides aident à alimenter les efforts soutenus et répétés."
  }
];

function GamesPanel({ assessment, nutrition }: { assessment: any; nutrition: any }) {
  const [selectedGame, setSelectedGame] = useState<"quiz" | "macro" | "chef" | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizValidated, setQuizValidated] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [macroGuess, setMacroGuess] = useState("");
  const [macroResult, setMacroResult] = useState("");
  const [chefProteinFood, setChefProteinFood] = useState(160);
  const [chefCarbFood, setChefCarbFood] = useState(220);
  const question = quizQuestions[quizIndex % quizQuestions.length];
  const macroAnswer = assessment?.formula === "masse" ? 640 : assessment?.formula === "perte" ? 430 : 520;
  const proteinTarget = Number(nutrition?.protein || assessment?.protein || 130);
  const carbsTarget = Number(nutrition?.carbs || assessment?.carbs || 180);
  const estimatedProtein = Math.round(chefProteinFood * 0.24);
  const estimatedCarbs = Math.round(chefCarbFood * 0.28);
  const chefScore = Math.max(0, 100 - Math.round(Math.abs(estimatedProtein - proteinTarget) * 0.6 + Math.abs(estimatedCarbs - carbsTarget) * 0.25));

  function validateMacro() {
    const value = Number(macroGuess);
    if (!Number.isFinite(value)) {
      setMacroResult("Entrez une estimation numérique.");
      return;
    }
    const gap = Math.abs(value - macroAnswer);
    setMacroResult(gap <= 70 ? `Très proche : référence ${macroAnswer} kcal.` : `Écart de ${gap} kcal. Référence : ${macroAnswer} kcal.`);
  }

  if (!selectedGame) {
    const games = [
      { id: "quiz" as const, image: "/media/game-knowledge.webp", title: "Quiz évolutif", description: "Affinez vos connaissances sur la récupération, l'entraînement et la nutrition.", difficulty: "Intermédiaire", progress: Math.min(100, Math.round((quizIndex / quizQuestions.length) * 100)), score: quizScore },
      { id: "macro" as const, image: "/media/game-training.webp", title: "Juste Macro", description: "Estimez les apports d'une assiette pensée pour votre objectif.", difficulty: "Accessible", progress: macroResult ? 100 : 0, score: macroResult ? 1 : 0 },
      { id: "chef" as const, image: "/media/game-coach.webp", title: "Labo du Chef", description: "Composez une assiette et rapprochez-vous de vos cibles du jour.", difficulty: "Progressif", progress: chefScore, score: chefScore }
    ];
    return (
      <section className="page-panel stack game-library">
        <div className="row between">
          <div><span className="pill gold">Espace ludique</span><h2>Choisissez votre défi</h2><p className="muted">Trois expériences courtes pour apprendre en pratiquant.</p></div>
        </div>
        <div className="games-menu-grid">
          {games.map((game) => (
            <article className="game-menu-card" key={game.id}>
              <div className="game-menu-media"><Image src={game.image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /></div>
              <div className="stack">
                <div className="row between"><span className="pill">{game.difficulty}</span><span className="muted small">Meilleur score : {game.score}</span></div>
                <h3>{game.title}</h3>
                <p className="muted">{game.description}</p>
                <div className="progress-track" aria-label={`Progression ${game.progress}%`}><span style={{ width: `${game.progress}%` }} /></div>
                <button className="primary" type="button" onClick={() => setSelectedGame(game.id)}>{game.progress ? "Reprendre" : "Commencer"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="page-panel stack games-grid">
      <button className="ghost game-back" type="button" onClick={() => setSelectedGame(null)}>Retour aux jeux</button>
      {selectedGame === "quiz" ? <article className="panel stack game-card game-focus-card">
        <div className="game-focus-banner"><Image src="/media/game-knowledge.webp" alt="" fill sizes="100vw" /></div>
        <span className="pill gold">Quiz évolutif</span>
        <h2>{question.question}</h2>
        <div className="choice-list">
          {question.choices.map((choice, index) => (
            <button className={quizChoice === index ? "active-choice" : "ghost"} key={choice} type="button" disabled={quizValidated} onClick={() => setQuizChoice(index)}>
              {choice}
            </button>
          ))}
        </div>
        <p className="muted small">Score : {quizScore}/{quizIndex + (quizValidated ? 1 : 0)}</p>
        {!quizValidated ? (
          <button
            className="primary"
            type="button"
            disabled={quizChoice === null}
            onClick={() => {
              setQuizValidated(true);
              if (quizChoice === question.answer) setQuizScore((score) => score + 1);
            }}
          >
            Valider ma réponse
          </button>
        ) : (
          <>
            <p className={quizChoice === question.answer ? "notice success-notice" : "notice danger-notice"}>
              {quizChoice === question.answer ? "Bonne réponse. " : "Réponse à revoir. "}{question.explanation}
            </p>
            <button className="primary" type="button" onClick={() => { setQuizIndex((current) => current + 1); setQuizChoice(null); setQuizValidated(false); }}>Question suivante</button>
          </>
        )}
        <button className="ghost" type="button" onClick={() => { setQuizIndex(0); setQuizChoice(null); setQuizValidated(false); setQuizScore(0); }}>Recommencer le quiz</button>
      </article> : null}
      {selectedGame === "macro" ? <article className="panel stack game-card game-focus-card">
        <div className="game-focus-banner"><Image src="/media/game-training.webp" alt="" fill sizes="100vw" /></div>
        <span className="pill gold">Juste Macro</span>
        <h2>Estimez les calories d'une assiette adaptée à votre objectif.</h2>
        <label>Votre estimation<input value={macroGuess} onChange={(event) => setMacroGuess(event.target.value)} inputMode="numeric" placeholder="Ex: 520" /></label>
        <button className="primary" type="button" onClick={validateMacro}>Vérifier</button>
        {macroResult ? <p className="notice">{macroResult}</p> : null}
        <button className="ghost" type="button" onClick={() => { setMacroGuess(""); setMacroResult(""); }}>Recommencer</button>
      </article> : null}
      {selectedGame === "chef" ? <article className="panel stack game-card game-focus-card">
        <div className="game-focus-banner"><Image src="/media/game-coach.webp" alt="" fill sizes="100vw" /></div>
        <span className="pill gold">Labo du Chef</span>
        <h2>Approchez vos cibles du jour.</h2>
        <label>Aliment protéiné : {chefProteinFood} g<input type="range" min="60" max="400" value={chefProteinFood} onChange={(event) => setChefProteinFood(Number(event.target.value))} /></label>
        <label>Accompagnement glucidique : {chefCarbFood} g<input type="range" min="60" max="500" value={chefCarbFood} onChange={(event) => setChefCarbFood(Number(event.target.value))} /></label>
        <div className="macro-row"><span>{estimatedProtein} g P</span><span>{estimatedCarbs} g G</span><span>Score {chefScore}/100</span></div>
        <p className="muted small">Cible du jour : {Math.round(proteinTarget)} g de protéines et {Math.round(carbsTarget)} g de glucides.</p>
        <button className="ghost" type="button" onClick={() => { setChefProteinFood(160); setChefCarbFood(220); }}>Réinitialiser</button>
      </article> : null}
    </section>
  );
}

function LibraryPanel({ contents, assessment }: { contents: any[]; assessment: any }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [librarySection, setLibrarySection] = useState<"express" | "deep">("express");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const published = contents
    .filter((content: any) => ["revision_card", "deep_dive", "article", "guide"].includes(content.type))
    .map((content: any) => ({
      id: content.id,
      type: content.type,
      title: content.title,
      category: content.payload?.category || content.type,
      body: content.payload?.body || content.payload?.summary || "",
      summary: content.payload?.summary || content.payload?.body || "",
      keyPoints: Array.isArray(content.payload?.key_points) ? content.payload.key_points : [],
      practicalTips: Array.isArray(content.payload?.practical_tips) ? content.payload.practical_tips : [],
      source: content.payload?.source || "Coach Reboot",
      date: content.publish_at || content.created_at,
      audience: [assessment?.formula, assessment?.goal, assessment?.level].filter(Boolean),
      demo: false
    }));
  const cards = published.length ? published : demoLibraryCards;
  const categories = ["all", ...Array.from(new Set(cards.map((card) => card.category)))];
  const normalized = `${assessment?.formula || ""} ${assessment?.goal || ""} ${assessment?.level || ""}`.toLowerCase();
  const filtered = cards.filter((card) => {
    const text = `${card.title} ${card.body} ${card.category}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesCategory = category === "all" || card.category === category;
    const compatible = !card.audience?.length || card.audience.some((tag: string) => normalized.includes(String(tag).toLowerCase())) || published.some((item) => item.id === card.id);
    return matchesSearch && matchesCategory && compatible;
  });
  const sectionCards = filtered.filter((card) => librarySection === "express" ? card.type === "revision_card" : card.type !== "revision_card");
  const selected = cards.find((card) => card.id === selectedId);

  if (selected) {
    const paragraphs = String(selected.body || "").split(/\n{2,}/).filter(Boolean);
    const related = cards.filter((card) => card.id !== selected.id && card.category === selected.category).slice(0, 3);
    return (
      <section className="page-panel library-reader stack">
        <button className="ghost library-back" type="button" onClick={() => setSelectedId(null)}>Retour à la bibliothèque</button>
        <article className="library-reader-hero">
          <Image src={libraryImage(selected, cards.indexOf(selected))} alt="" fill sizes="100vw" />
          <div><span className="pill gold">{selected.demo ? "Exemple Reboot" : selected.type === "deep_dive" ? "Dossier approfondi" : "Fiche express"}</span><h2>{selected.title}</h2><p>{selected.category} · {readingTime(selected.body)} min de lecture</p></div>
        </article>
        <article className="panel library-article stack">
          <p className="library-introduction">{selected.summary}</p>
          {paragraphs.map((paragraph, index) => <section key={index}><h3>{index === 0 ? "À retenir" : `Repère ${index + 1}`}</h3><p>{paragraph}</p></section>)}
          {selected.keyPoints.length ? <section><h3>Points clés</h3><ul>{selected.keyPoints.map((point: string) => <li key={point}>{point}</li>)}</ul></section> : null}
          {selected.practicalTips.length ? <section><h3>Conseils pratiques</h3><ul>{selected.practicalTips.map((tip: string) => <li key={tip}>{tip}</li>)}</ul></section> : null}
          <p className="muted small">Source : {selected.demo ? "Reboot Performance" : selected.source || "Reboot Performance"} · {formatDate(selected.date)}</p>
        </article>
        {related.length ? (
          <section className="stack"><h3>Contenus associés</h3><div className="library-related">{related.map((card) => <button className="library-related-card" type="button" key={card.id} onClick={() => setSelectedId(card.id)}><strong>{card.title}</strong><span>{readingTime(card.body)} min</span></button>)}</div></section>
        ) : null}
      </section>
    );
  }

  return (
    <section className="page-panel panel stack library-panel">
      <div className="row between">
        <div>
          <h2>Bibliothèque scientifique</h2>
          <p className="muted">Fiches courtes et dossiers adaptés à votre profil.</p>
        </div>
        <span className="pill gold">{sectionCards.length} contenu(s)</span>
      </div>
      <div className="library-section-tabs" role="tablist" aria-label="Format de contenu">
        <button className={librarySection === "express" ? "active" : ""} type="button" role="tab" aria-selected={librarySection === "express"} onClick={() => setLibrarySection("express")}>Fiches express</button>
        <button className={librarySection === "deep" ? "active" : ""} type="button" role="tab" aria-selected={librarySection === "deep"} onClick={() => setLibrarySection("deep")}>Dossiers approfondis</button>
      </div>
      <div className="library-tools">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher sommeil, protéines, récupération..." aria-label="Rechercher dans la bibliothèque" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Catégorie">
          {categories.map((item) => <option key={item} value={item}>{item === "all" ? "Toutes les catégories" : item}</option>)}
        </select>
      </div>
      <div className="library-grid">
        {sectionCards.map((card, index) => (
          <article className="library-card" key={card.id}>
            <div className="library-card-media"><Image src={libraryImage(card, index)} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /></div>
            <span className="pill">{card.demo ? "Exemple Reboot" : card.type === "revision_card" ? "Fiche express" : "Dossier approfondi"}</span>
            <h3>{card.title}</h3>
            <p className="muted">{truncateText(card.summary, 150)}</p>
            <div className="row between">
              <span className="muted small">{card.category}</span>
              <span className="pill gold">{readingTime(card.body)} min</span>
            </div>
            <button className="primary" type="button" onClick={() => setSelectedId(card.id)}>Lire la suite</button>
          </article>
        ))}
      </div>
      {!sectionCards.length ? (
        <div className="stack">
          <EmptyState
            title={librarySection === "express" ? "Aucune fiche express" : "Aucun dossier approfondi"}
            text="Essayez une autre recherche, une autre catégorie ou l’autre format de contenu."
          />
          {search || category !== "all" ? (
            <button className="ghost" type="button" onClick={() => { setSearch(""); setCategory("all"); }}>Réinitialiser les filtres</button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function WorkoutSessionPanel({ workout, onNavigate }: { workout: any; onNavigate: (section: ClientSection) => void }) {
  const [activeExercise, setActiveExercise] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [setState, setAction, setPending] = useActionState(completeWorkoutSetStateAction, { status: "idle", message: "" });
  const [finishState, finishAction, finishPending] = useActionState(completeWorkoutStateAction, { status: "idle", message: "" });
  const exercises = useMemo(() => buildWorkoutExercises(workout), [workout]);
  const completed = new Set(workoutCompletedSetKeys(workout?.feedback));
  const totalSets = exercises.reduce((sum: number, exercise: WorkoutExercise) => sum + exercise.sets.length, 0);
  const completedCount = Array.from(completed).length;
  const progress = totalSets ? Math.min(100, Math.round((completedCount / totalSets) * 100)) : 0;

  if (!workout) {
    return (
      <section className="page-panel session-layout">
        <article className="panel premium-empty-state stack">
          <span className="pill gold">Récupération</span>
          <h2>Aucune séance prévue aujourd'hui</h2>
          <p className="muted">Votre planning est à jour. Complétez votre bilan pour aider votre coach à préparer la prochaine étape.</p>
          <div className="row wrap">
            <button className="primary" type="button" onClick={() => onNavigate("weekly")}>Compléter mon bilan</button>
            <button className="ghost" type="button" onClick={() => onNavigate("home")}>Voir mon planning</button>
          </div>
        </article>
      </section>
    );
  }

  const current = exercises[activeExercise] || exercises[0];

  return (
    <section className="page-panel session-layout">
      <article className="panel workout-session stack">
        <div className="row between">
          <div>
            <span className="pill gold">{statusLabel(workout.status)}</span>
            <h2>{shortWorkoutTitle(workout.title)}</h2>
            <p className="muted">{workout.focus || "Objectif: qualite d'execution et regularite."}</p>
          </div>
          <strong className="session-score">{progress}%</strong>
        </div>
        <div className="progress-track" aria-label={`Progression ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
        <div className="exercise-tabs" aria-label="Exercices de la séance">
          {exercises.map((exercise: WorkoutExercise, index: number) => (
            <button key={`${exercise.name}-${index}`} className={activeExercise === index ? "active" : ""} type="button" onClick={() => setActiveExercise(index)}>
              {index + 1}. {exercise.name}
            </button>
          ))}
        </div>
        <article className="exercise-card">
          <div className="row between">
            <div>
              <h3>{current.name}</h3>
              <p className="muted small">Repos {current.rest}s - RPE cible {current.rpe}</p>
            </div>
            <button className="ghost" type="button" onClick={() => setActiveExercise(Math.min(exercises.length - 1, activeExercise + 1))}>Exercice suivant</button>
          </div>
          <div className="set-grid">
            {current.sets.map((set: WorkoutSet, setIndex: number) => {
              const key = `${activeExercise}:${setIndex}`;
              const isDone = completed.has(key);
              return (
                <form className={`set-card ${isDone ? "done" : ""}`} action={setAction} key={key}>
                  <input type="hidden" name="workoutId" value={workout.id} />
                  <input type="hidden" name="exerciseIndex" value={activeExercise} />
                  <input type="hidden" name="setIndex" value={setIndex} />
                  <strong>Serie {setIndex + 1}</strong>
                  <span>{set.reps} reps</span>
                  <span>{set.load}</span>
                  <span>RPE {set.rpe}</span>
                  <button className={isDone ? "ghost" : "primary"} disabled={setPending || isDone}>{isDone ? "Terminée" : "Terminer la série"}</button>
                </form>
              );
            })}
          </div>
        </article>
        <ActionStatus state={setPending ? { status: "idle", message: "Validation de la serie..." } : setState} />
        <div className="session-finish stack">
          {!confirmFinish ? (
            <button className="primary" type="button" onClick={() => setConfirmFinish(true)}>Terminer la séance</button>
          ) : (
            <form className="grid" action={finishAction}>
              <input type="hidden" name="workoutId" value={workout.id} />
              <label className="span-12">Retour rapide<textarea name="clientNote" rows={3} placeholder="Sensations, douleurs, charge trop facile ou trop dure..." /></label>
              <button className="primary span-6" disabled={finishPending}>Confirmer la fin</button>
              <button className="ghost span-6" type="button" onClick={() => setConfirmFinish(false)}>Annuler</button>
            </form>
          )}
          <ActionStatus state={finishPending ? { status: "idle", message: "Clôture de la séance..." } : finishState} />
        </div>
      </article>
      <RestTimer initialSeconds={current?.rest || 90} />
    </section>
  );
}

function RestTimer({ initialSeconds }: { initialSeconds: number }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const done = seconds === 0;

  useEffect(() => {
    setSeconds(initialSeconds);
    setRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!running || seconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");

  return (
    <article className={`panel recovery-clock ${done ? "timer-done" : ""}`}>
      <span className="muted small">Temps de repos</span>
      <strong aria-live="polite">{minutes}:{rest}</strong>
      <div className="timer-actions">
        <button className="primary" type="button" onClick={() => setRunning(true)} disabled={running || done}>{seconds === initialSeconds ? "Démarrer" : "Reprendre"}</button>
        <button className="ghost" type="button" onClick={() => setRunning(false)} disabled={!running}>Pause</button>
        <button className="ghost" type="button" onClick={() => { setSeconds(initialSeconds); setRunning(false); }}>Réinitialiser</button>
      </div>
      {done ? <p className="notice success-notice">Repos terminé. Vous pouvez reprendre.</p> : null}
    </article>
  );
}

function ProgressPanel({
  assessment,
  measurements,
  checkins,
  workouts,
  auditLogs,
  meals,
  hydration,
  nutrition,
  onNavigate
}: {
  assessment: any;
  measurements: any[];
  checkins: any[];
  workouts: any[];
  auditLogs: any[];
  meals: any[];
  hydration: any[];
  nutrition: any;
  onNavigate: (section: ClientSection) => void;
}) {
  const [period, setPeriod] = useState("all");
  const filteredMeasurements = filterByPeriod(measurements, "measured_at", period);
  const filteredCheckins = filterByPeriod(checkins, "week_start", period);
  const filteredWorkouts = filterByPeriod(workouts, "scheduled_for", period);
  const filteredMeals = filterByPeriod(meals, "meal_date", period);
  const filteredHydration = filterByPeriod(hydration, "entry_date", period);
  const previousCheckins = filterByPreviousPeriod(checkins, "week_start", period);
  const previousWorkouts = filterByPreviousPeriod(workouts, "scheduled_for", period);
  const previousMeals = filterByPreviousPeriod(meals, "meal_date", period);
  const completed = filteredWorkouts.filter((workout: any) => workout.status === "completed").length;
  const previousCompleted = previousWorkouts.filter((workout: any) => workout.status === "completed").length;
  const currentMealDays = new Set(filteredMeals.map((meal: any) => meal.meal_date)).size;
  const previousMealDays = new Set(previousMeals.map((meal: any) => meal.meal_date)).size;
  const planned = filteredWorkouts.length;
  const weightPoints = filteredMeasurements.length
    ? filteredMeasurements.map((item: any) => ({ label: formatDate(item.measured_at), value: Number(item.weight_kg || 0) })).filter((item) => item.value > 0)
    : [{ label: "Dernier bilan", value: Number(assessment?.weight_kg || 0) }].filter((item) => item.value > 0);
  const energyPoints = filteredCheckins.map((item: any) => ({ label: formatDate(item.week_start), value: Number(item.energy || 0) })).filter((item) => item.value > 0);
  const stressPoints = filteredCheckins.map((item: any) => ({ label: formatDate(item.week_start), value: Number(item.stress || 0) })).filter((item) => item.value > 0);
  const sleepPoints = filteredCheckins.map((item: any) => ({ label: formatDate(item.week_start), value: Number(item.sleep_hours || 0) })).filter((item) => item.value > 0);
  const rpePoints = filteredCheckins.map((item: any) => ({ label: formatDate(item.week_start), value: Number(item.training_rpe || 0) })).filter((item) => item.value > 0);
  const nutritionAdherencePoints = filteredCheckins.map((item: any) => ({ label: formatDate(item.week_start), value: Number(item.nutrition_adherence || 0) })).filter((item) => item.value > 0);
  const waistPoints = filteredMeasurements.map((item: any) => ({ label: formatDate(item.measured_at), value: Number(item.waist_cm || item.waist || 0) })).filter((item) => item.value > 0);
  const caloriesPoints = aggregateDailyNutrition(filteredMeals, "calories");
  const proteinPoints = aggregateDailyNutrition(filteredMeals, "protein");
  const carbsPoints = aggregateDailyNutrition(filteredMeals, "carbs");
  const fatPoints = aggregateDailyNutrition(filteredMeals, "fat");
  const hydrationPoints = aggregateDailyNutrition(filteredHydration, "liters", "entry_date");
  const workoutVolumePoints = filteredWorkouts
    .filter((item: any) => item.status === "completed")
    .map((item: any) => ({ label: formatDayDate(item.scheduled_for), value: workoutVolume(item) }))
    .filter((item: any) => item.value > 0);
  const hasAnyHistory = [
    weightPoints,
    waistPoints,
    energyPoints,
    stressPoints,
    sleepPoints,
    rpePoints,
    nutritionAdherencePoints,
    hydrationPoints,
    caloriesPoints,
    proteinPoints,
    carbsPoints,
    fatPoints,
    workoutVolumePoints
  ].some((points) => points.length > 0);

  return (
    <section className="page-panel stack progress-page">
      <article className="panel row between">
        <div>
              <h2>Mes progrès</h2>
              <p className="muted">Suivi lisible à partir de vos bilans, séances et mesures.</p>
        </div>
        <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Période des graphiques">
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="90d">3 mois</option>
          <option value="180d">6 mois</option>
          <option value="365d">1 an</option>
          <option value="all">Tout l'historique</option>
        </select>
      </article>
      {period !== "all" ? (
        <section className="panel period-comparison stack" aria-label="Comparaison avec la période précédente">
          <div><span className="pill gold">Tendance</span><h2>Comparaison avec la période précédente</h2></div>
          <div className="period-comparison-grid">
            <article><span className="muted small">Séances réalisées</span><strong>{completed}</strong><small>{trendText(completed, previousCompleted)} · période précédente : {previousCompleted}</small></article>
            <article><span className="muted small">Bilans renseignés</span><strong>{filteredCheckins.length}</strong><small>{trendText(filteredCheckins.length, previousCheckins.length)} · période précédente : {previousCheckins.length}</small></article>
            <article><span className="muted small">Jours avec suivi nutritionnel</span><strong>{currentMealDays}</strong><small>{trendText(currentMealDays, previousMealDays)} · période précédente : {previousMealDays}</small></article>
          </div>
        </section>
      ) : null}
      {hasAnyHistory ? (
        <section className="progress-grid">
          <ChartCard title="Poids" unit="kg" points={weightPoints} />
          <ChartCard title="Tour de taille" unit="cm" points={waistPoints} />
          <ChartCard title="Énergie" unit="/10" points={energyPoints} />
          <ChartCard title="Stress" unit="/10" points={stressPoints} />
          <ChartCard title="Sommeil" unit="h" points={sleepPoints} />
          <ChartCard title="RPE" unit="/10" points={rpePoints} />
          <ChartCard title="Adhérence nutritionnelle" unit="/10" points={nutritionAdherencePoints} />
          <BarChartCard title="Hydratation" unit="L" points={hydrationPoints} target={Number(nutrition?.water_liters || 0)} />
          <BarChartCard title="Calories" unit="kcal" points={caloriesPoints} target={Number(nutrition?.calories || 0)} />
          <ChartCard title="Protéines" unit="g" points={proteinPoints} />
          <ChartCard title="Glucides" unit="g" points={carbsPoints} />
          <ChartCard title="Lipides" unit="g" points={fatPoints} />
          <BarChartCard title="Volume d'entraînement" unit="unités" points={workoutVolumePoints} />
        </section>
      ) : null}
      <section className="grid">
        {kpi("Adhérence", planned ? `${Math.round((completed / planned) * 100)}%` : "-", `${completed}/${planned} séance(s)`)}
        {kpi("Bilans", checkins.length, "envoyé(s)")}
        {kpi("Historique", auditLogs.length, "événement(s)")}
        {kpi("Objectif", assessment?.goal || "-", formulaLabel(assessment?.formula))}
      </section>
      {!hasAnyHistory ? (
        <article className="panel row between progress-empty-action">
          <div><strong>Commencez votre historique</strong><p className="muted">Votre prochain bilan alimentera automatiquement ces graphiques.</p></div>
          <button className="primary" type="button" onClick={() => onNavigate("weekly")}>Remplir mon bilan</button>
        </article>
      ) : null}
    </section>
  );
}

function BarChartCard({
  title,
  unit,
  points,
  target
}: {
  title: string;
  unit: string;
  points: Array<{ label: string; value: number }>;
  target?: number;
}) {
  if (!points.length) return <article className="panel chart-card stack"><h3>{title}</h3><EmptyState title="Aucune donnée" text="Ce graphique apparaîtra après vos prochaines saisies." /></article>;
  const recent = points.slice(-12);
  const current = recent[recent.length - 1];
  if (recent.length === 1) {
    return (
      <article className="panel chart-card chart-single-value stack">
        <div className="row between"><h3>{title}</h3><span className="pill">{unit}</span></div>
        <strong>{current.value} {unit}</strong>
        <p className="muted small">Une seule valeur est disponible pour le moment.{target ? ` Objectif : ${target} ${unit}.` : ""}</p>
      </article>
    );
  }
  const max = Math.max(...recent.map((point) => point.value), Number(target || 0), 1);
  return (
    <article className="panel chart-card stack">
      <div className="row between"><h3>{title}</h3><span className="pill">{unit}</span></div>
      <div className="bar-chart" role="img" aria-label={`${title} : ${recent.length} valeur(s)`}>
        {recent.map((point, index) => (
          <span className="bar-chart-column" key={`${point.label}-${index}`}>
            <i style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}><span className="sr-only">{point.label}: {point.value} {unit}</span></i>
            <small>{shortDateLabel(point.label)}</small>
          </span>
        ))}
      </div>
      <p className="muted small">Dernière valeur : {current.value} {unit}{target ? ` · objectif ${target} ${unit}` : ""}</p>
    </article>
  );
}

function ChartCard({ title, unit, points }: { title: string; unit: string; points: Array<{ label: string; value: number }> }) {
  if (!points.length) {
    return <article className="panel chart-card stack"><h3>{title}</h3><EmptyState title="Aucune donnée" text="Ce graphique apparaîtra après vos prochaines saisies." /></article>;
  }
  const current = points[points.length - 1];
  if (points.length === 1) {
    return (
      <article className="panel chart-card chart-single-value stack">
        <div className="row between"><h3>{title}</h3><span className="pill">{unit}</span></div>
        <strong>{current.value} {unit}</strong>
        <p className="muted small">Une seule mesure est disponible pour le moment.</p>
      </article>
    );
  }
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(1, max - min);
  const polyline = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 92 - ((point.value - min) / range) * 74;
    return `${x},${y}`;
  }).join(" ");
  return (
    <article className="panel chart-card stack">
      <div className="row between">
        <h3>{title}</h3>
        <span className="pill">{unit}</span>
      </div>
      <svg className="real-chart" viewBox="0 0 100 100" role="img" aria-label={`${title}: ${points.length} point(s)`}>
        <line x1="0" x2="100" y1="92" y2="92" />
        <line x1="0" x2="0" y1="8" y2="92" />
        <polyline points={polyline} />
        {points.map((point, index) => {
          const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
          const y = 92 - ((point.value - min) / range) * 74;
          return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="2.4"><title>{point.label}: {point.value} {unit}</title></circle>;
        })}
      </svg>
      <p className="muted small">Dernière valeur : {current.value} {unit} · évolution : {formatSignedChange(current.value - points[points.length - 2].value)} {unit}</p>
    </article>
  );
}

function DailyNutritionRings({
  hydration,
  totals,
  targets
}: {
  hydration: { value: number; target: number };
  totals: any;
  targets: any;
}) {
  const items = [
    { key: "water", label: "Hydratation", value: hydration.value, target: hydration.target, unit: "L" },
    { key: "calories", label: "Calories", value: totals.calories, target: targets.calories, unit: "kcal" },
    { key: "protein", label: "Protéines", value: totals.protein, target: targets.protein, unit: "g" },
    { key: "carbs", label: "Glucides", value: totals.carbs, target: targets.carbs, unit: "g" },
    { key: "fat", label: "Lipides", value: totals.fat, target: targets.fat, unit: "g" }
  ];
  return (
    <section className="daily-ring-grid" aria-label="Récapitulatif nutritionnel quotidien">
      {items.map((item) => {
        const percentage = progressPercent(item.value, item.target);
        const remaining = Math.max(0, Number(item.target || 0) - Number(item.value || 0));
        return (
          <article className={`daily-ring-card ${item.key}`} key={item.key}>
            <div
              className="daily-ring"
              style={{ "--ring-progress": `${percentage * 3.6}deg` } as CSSProperties}
              role="img"
              aria-label={`${item.label} : ${Math.round(item.value * 10) / 10} sur ${Math.round(item.target * 10) / 10} ${item.unit}, ${percentage}%`}
            >
              <span><strong>{percentage}%</strong><small>{item.label}</small></span>
            </div>
            <p><strong>{Math.round(item.value * 10) / 10}</strong> / {Math.round(item.target * 10) / 10} {item.unit}</p>
            <small className="ring-remaining">{item.target > 0 ? `Reste ${Math.round(remaining * 10) / 10} ${item.unit}` : "Objectif à définir"}</small>
          </article>
        );
      })}
    </section>
  );
}

function RecipeDetailModal({
  recipe,
  recipeIndex,
  assigned,
  onClose
}: {
  recipe: any;
  recipeIndex: number;
  assigned: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
      ) || []).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const ingredients = (recipe.recipe_ingredients || []).sort(sortByPosition);
  const steps = (recipe.recipe_steps || []).sort(sortByPosition);

  return (
    <div className="recipe-modal-layer" role="presentation">
      <button className="recipe-modal-backdrop" type="button" onClick={onClose} aria-label="Fermer le détail de la recette" />
      <section className="recipe-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="recipe-detail-title">
        <header className="recipe-modal-header">
          <div>
            <span className="pill gold">{recipe.objective || "Recette adaptée"}</span>
            <h2 id="recipe-detail-title">{recipe.name}</h2>
          </div>
          <button className="ghost recipe-modal-close" type="button" onClick={onClose} ref={closeButtonRef}>Fermer</button>
        </header>
        <div className="recipe-modal-layout">
          <div className="recipe-modal-media">
            <Image src={recipeImage(recipe, recipeIndex)} alt={recipe.image_alt || `Plat ${recipe.name}`} fill sizes="(max-width: 760px) 100vw, 38vw" />
          </div>
          <div className="recipe-modal-content">
            <div className="macro-row recipe-modal-macros" aria-label="Macros de la recette">
              <span>{recipe.calories} kcal</span>
              <span>{recipe.protein} g protéines</span>
              <span>{recipe.carbs} g glucides</span>
              <span>{recipe.fat} g lipides</span>
            </div>
            <p className="muted">{recipe.description}</p>
            <p className="muted small">{recipe.prep_minutes} min de préparation · {recipe.cook_minutes} min de cuisson · {difficultyLabel(recipe.difficulty)}</p>
            {recipe.coach_tip ? <aside className="recipe-modal-tip"><strong>Repère pratique</strong><p>{recipe.coach_tip}</p></aside> : null}
            <div className="recipe-modal-sections">
              <section>
                <h3>Ingrédients</h3>
                {ingredients.length ? <ul>{ingredients.map((ingredient: any, index: number) => <li key={ingredient.id || index}>{[ingredient.quantity, ingredient.unit, ingredient.name || ingredient.ingredient].filter(Boolean).join(" ")}</li>)}</ul> : <p className="muted small">Les ingrédients détaillés ne sont pas encore renseignés.</p>}
              </section>
              <section>
                <h3>Préparation</h3>
                {steps.length ? <ol>{steps.map((step: any, index: number) => <li key={step.id || index}>{step.instruction || step.body || step.description}</li>)}</ol> : <p className="muted small">Les étapes détaillées ne sont pas encore renseignées.</p>}
              </section>
            </div>
            <div className="recipe-modal-action">
              <span className="pill">{assigned ? "Envoyée par le coach" : "Adaptée à votre objectif"}</span>
              <RecipeMealAdder recipe={recipe} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RecipeMealAdder({ recipe }: { recipe: any }) {
  const [state, action, pending] = useActionState(addRecipeToMealsStateAction, { status: "idle", message: "" });
  const [portion, setPortion] = useState("1");
  const [mealName, setMealName] = useState("Déjeuner");
  const factor = Number(portion || 1);
  return (
    <details className="subtle-details recipe-add-meal">
      <summary>Ajouter à mes repas du jour</summary>
      <form
        className="grid"
        action={action}
        onSubmit={(event) => {
          const summary = `${mealName} · ${factor} portion(s) · ${Math.round(Number(recipe.calories || 0) * factor)} kcal`;
          if (!window.confirm(`Ajouter cette recette à vos repas du jour ?\n\n${summary}`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="recipeId" value={recipe.id} />
        <label className="span-6">Moment du repas
          <select name="mealName" value={mealName} onChange={(event) => setMealName(event.target.value)}>
            <option>Petit-déjeuner</option>
            <option>Déjeuner</option>
            <option>Collation</option>
            <option>Dîner</option>
          </select>
        </label>
        <label className="span-6">Portion
          <input name="portion" type="number" min="0.25" max="4" step="0.25" value={portion} onChange={(event) => setPortion(event.target.value)} required />
        </label>
        <div className="span-12 meal-review">
          <strong>Aperçu pour {factor || 0} portion(s)</strong>
          <p>{Math.round(Number(recipe.calories || 0) * factor)} kcal · {Math.round(Number(recipe.protein || 0) * factor * 10) / 10} g protéines · {Math.round(Number(recipe.carbs || 0) * factor * 10) / 10} g glucides · {Math.round(Number(recipe.fat || 0) * factor * 10) / 10} g lipides</p>
        </div>
        <button className="primary span-12" disabled={pending}>{pending ? "Ajout en cours..." : "Confirmer l'ajout"}</button>
      </form>
      <ActionStatus state={pending ? { status: "idle", message: "Enregistrement dans vos repas..." } : state} />
    </details>
  );
}

function MealTrackingPanel({ meals, totals, targets }: { meals: any[]; totals: any; targets: any }) {
  const [estimateState, estimateAction, estimatePending] = useActionState(estimateMealWithAiStateAction, { status: "idle", message: "" });
  const [saveState, saveAction, savePending] = useActionState(saveMealEntryStateAction, { status: "idle", message: "" });
  const [estimateDescription, setEstimateDescription] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [draft, setDraft] = useState({
    mealName: "Repas",
    quantity: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  });
  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat)
  };

  useEffect(() => {
    if (!estimateState.estimate) return;
    setDraft((current) => ({
      ...current,
      description: current.description || estimateDescription,
      calories: String(estimateState.estimate?.calories || ""),
      protein: String(estimateState.estimate?.protein || ""),
      carbs: String(estimateState.estimate?.carbs || ""),
      fat: String(estimateState.estimate?.fat || "")
    }));
    setShowReview(false);
  }, [estimateDescription, estimateState.estimate]);

  useEffect(() => {
    if (saveState.status !== "success") return;
    setDraft({ mealName: "Repas", quantity: "", description: "", calories: "", protein: "", carbs: "", fat: "" });
    setEstimateDescription("");
    setShowReview(false);
  }, [saveState.status]);

  function updateDraft(key: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setShowReview(false);
  }

  return (
    <section className="panel stack meal-panel">
      <div className="row between">
        <div>
          <h2>Saisie du repas</h2>
          <p className="muted">Décrivez votre repas pour obtenir une estimation modifiable, ou saisissez directement les valeurs.</p>
        </div>
        <span className="pill gold">{meals.length} repas aujourd'hui</span>
      </div>
      <form className="grid" action={estimateAction}>
        <label className="span-9">Décrire le repas
          <input name="description" value={estimateDescription} onChange={(event) => setEstimateDescription(event.target.value)} placeholder="Ex: 150 g de poulet, 120 g de riz et un avocat" />
        </label>
        <button className="ghost span-3" disabled={estimatePending}>{estimatePending ? "Estimation..." : "Estimer les valeurs"}</button>
      </form>
      <ActionStatus state={estimatePending ? { status: "idle", message: "Calcul de l'estimation modifiable..." } : estimateState} />
      <form className="grid" action={saveAction} data-testid="meal-entry-form">
        <input type="hidden" name="source" value={estimateState.estimate ? "ai_estimate" : "manual"} />
        <label className="span-3">Moment du repas
          <select name="mealName" value={draft.mealName} onChange={(event) => updateDraft("mealName", event.target.value)} required>
            <option>Petit-déjeuner</option>
            <option>Déjeuner</option>
            <option>Collation</option>
            <option>Dîner</option>
            <option>Repas</option>
          </select>
        </label>
        <label className="span-3">Quantité <input name="quantity" value={draft.quantity} onChange={(event) => updateDraft("quantity", event.target.value)} placeholder="ex: 1 assiette" /></label>
        <label className="span-6">Description <input name="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} required placeholder="Aliments consommés" /></label>
        <label className="span-3">Calories <input name="calories" type="number" min="0" step="1" value={draft.calories} onChange={(event) => updateDraft("calories", event.target.value)} required /></label>
        <label className="span-3">Protéines <input name="protein" type="number" min="0" step="0.1" value={draft.protein} onChange={(event) => updateDraft("protein", event.target.value)} required /></label>
        <label className="span-3">Glucides <input name="carbs" type="number" min="0" step="0.1" value={draft.carbs} onChange={(event) => updateDraft("carbs", event.target.value)} required /></label>
        <label className="span-3">Lipides <input name="fat" type="number" min="0" step="0.1" value={draft.fat} onChange={(event) => updateDraft("fat", event.target.value)} required /></label>
        {showReview ? (
          <aside className="span-12 meal-review">
            <strong>Vérifiez avant d'enregistrer</strong>
            <p>{draft.mealName} · {draft.quantity || "quantité libre"} · {draft.calories} kcal</p>
            <p className="muted small">{draft.protein} g protéines · {draft.carbs} g glucides · {draft.fat} g lipides</p>
          </aside>
        ) : null}
        {!showReview ? (
          <button
            className="primary span-12"
            type="button"
            disabled={savePending}
            onClick={(event) => {
              if (event.currentTarget.form?.reportValidity()) setShowReview(true);
            }}
          >
            Vérifier le repas
          </button>
        ) : (
          <div className="span-12 row meal-review-actions">
            <button className="ghost" type="button" disabled={savePending} onClick={() => setShowReview(false)}>
              Modifier
            </button>
            <button className="primary" type="submit" disabled={savePending}>
              {savePending ? "Enregistrement..." : "Confirmer l'enregistrement"}
            </button>
          </div>
        )}
      </form>
      <ActionStatus state={savePending ? { status: "idle", message: "Enregistrement du repas..." } : saveState} />
      <MacroProgress totals={totals} targets={targets} remaining={remaining} />
      <div className="list">
        {meals.map((meal) => <MealEntryItem key={meal.id} meal={meal} />)}
        {!meals.length ? <EmptyState title="Aucun repas enregistré aujourd'hui" text="Ajoutez votre premier repas pour suivre vos apports." /> : null}
      </div>
    </section>
  );
}

function MealEntryItem({ meal }: { meal: any }) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteMealEntryStateAction, { status: "idle", message: "" });
  const [saveState, saveAction, savePending] = useActionState(saveMealEntryStateAction, { status: "idle", message: "" });
  return (
    <article className="list-item stack">
      <div className="row between">
        <div>
          <strong>{meal.meal_name}</strong>
          <p className="muted small">{meal.description}</p>
        </div>
        <span className="pill">{Number(meal.calories || 0)} kcal</span>
      </div>
      <div className="macro-row">
        <span>{Number(meal.protein || 0)} P</span>
        <span>{Number(meal.carbs || 0)} G</span>
        <span>{Number(meal.fat || 0)} L</span>
        <span>{meal.quantity || "quantité libre"}</span>
      </div>
      <details className="subtle-details">
        <summary>Modifier cette saisie</summary>
        <form className="grid" action={saveAction}>
          <input type="hidden" name="mealId" value={meal.id} />
          <label className="span-3">Nom <input name="mealName" defaultValue={meal.meal_name} /></label>
          <label className="span-3">Quantité <input name="quantity" defaultValue={meal.quantity} /></label>
          <label className="span-6">Description <input name="description" defaultValue={meal.description} required /></label>
          <label className="span-3">Calories <input name="calories" type="number" min="0" step="1" defaultValue={meal.calories} required /></label>
          <label className="span-3">Protéines <input name="protein" type="number" min="0" step="0.1" defaultValue={meal.protein} required /></label>
          <label className="span-3">Glucides <input name="carbs" type="number" min="0" step="0.1" defaultValue={meal.carbs} required /></label>
          <label className="span-3">Lipides <input name="fat" type="number" min="0" step="0.1" defaultValue={meal.fat} required /></label>
          <button className="ghost span-12" disabled={savePending}>Enregistrer la correction</button>
        </form>
        <ActionStatus state={savePending ? { status: "idle", message: "Correction en cours..." } : saveState} />
      </details>
      <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Supprimer cette saisie de repas ?")) event.preventDefault(); }}>
        <input type="hidden" name="mealId" value={meal.id} />
        <button className="danger" disabled={deletePending}>Supprimer</button>
      </form>
      <ActionStatus state={deletePending ? { status: "idle", message: "Suppression..." } : deleteState} />
    </article>
  );
}

function MacroProgress({ totals, targets, remaining }: { totals: any; targets: any; remaining: any }) {
  return (
    <section className="macro-progress-grid">
      {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
        <article className="macro-progress" key={key}>
          <div className="between row">
            <strong>{macroLabel(key)}</strong>
            <span>{Math.round(totals[key])}/{Math.round(targets[key] || 0)}</span>
          </div>
          <div className="progress-track"><span style={{ width: `${progressPercent(totals[key], targets[key])}%` }} /></div>
          <p className="muted small">Reste: {Math.round(remaining[key])}</p>
        </article>
      ))}
    </section>
  );
}

function HydrationPanel({ target, total, entries }: { target: number; total: number; entries: any[] }) {
  const [state, action, pending] = useActionState(addHydrationEntryStateAction, { status: "idle", message: "" });
  const remaining = Math.max(0, target - total);
  return (
    <article className="hydration-card stack">
      <div>
        <h3>Hydratation</h3>
        <p className="muted">{total.toFixed(2)} L bus - reste {remaining.toFixed(2)} L</p>
      </div>
      <div className="progress-track"><span style={{ width: `${progressPercent(total, target)}%` }} /></div>
      <div className="quick-water">
        <form action={action}>
          <input type="hidden" name="liters" value="0.25" />
          <button disabled={pending}>+0,25 L</button>
        </form>
        <form action={action}>
          <input type="hidden" name="liters" value="0.5" />
          <button disabled={pending}>+0,5 L</button>
        </form>
        <form className="quick-water-custom" action={action}>
          <label>Quantité personnalisée <input name="liters" type="number" min="0.1" max="10" step="0.05" placeholder="0,75" required /></label>
          <button className="primary" disabled={pending}>Ajouter</button>
        </form>
      </div>
      <ActionStatus state={pending ? { status: "idle", message: "Ajout hydratation..." } : state} />
      <div className="list compact-list">
        {entries.slice(0, 4).map((entry) => <HydrationEntry key={entry.id} entry={entry} />)}
      </div>
    </article>
  );
}

function HydrationEntry({ entry }: { entry: any }) {
  const [state, action, pending] = useActionState(deleteHydrationEntryStateAction, { status: "idle", message: "" });
  return (
    <form className="inline-delete" action={action} onSubmit={(event) => { if (!window.confirm("Retirer cette saisie d'hydratation ?")) event.preventDefault(); }}>
      <input type="hidden" name="hydrationId" value={entry.id} />
      <span>{Number(entry.liters || 0).toFixed(2)} L</span>
      <button className="ghost" disabled={pending}>Retirer</button>
      <ActionStatus state={state} />
    </form>
  );
}

function WeeklyCheckinPanel({ checkin, assessment, hydrationTarget }: { checkin: any; assessment: any; hydrationTarget: number }) {
  const [draftState, draftAction, draftPending] = useActionState(saveWeeklyCheckinStateAction, { status: "idle", message: "" });
  const [submitState, submitAction, submitPending] = useActionState(submitWeeklyCheckinStateAction, { status: "idle", message: "" });
  const [shareState, shareAction, sharePending] = useActionState(updateWeeklyJournalSharingStateAction, { status: "idle", message: "" });
  const weekStart = checkin?.week_start || getCurrentWeekStart();
  const isEditable = !checkin || checkin.status === "draft";
  const status = checkin ? weeklyCheckinStatusLabel(checkin) : "Brouillon";
  const statusDescription = checkin?.status === "locked"
    ? "Ce bilan est verrouillé. Il reste disponible en lecture seule."
    : checkin?.viewed_at
      ? "Votre coach a consulté ce bilan. Il reste disponible en lecture seule."
      : checkin
        ? "Ce bilan a été transmis au coach. Il reste disponible en lecture seule."
        : "Complétez votre bilan. Vous pouvez garder un brouillon ou le transmettre au coach.";
  return (
    <section className="page-panel panel stack weekly-form-panel">
      <div>
        <h2>Bilan hebdo</h2>
        <p className="muted">{statusDescription}</p>
        <span className={`pill ${isEditable ? "gold" : ""}`}>{status}</span>
      </div>
      {isEditable ? (
        <>
          <form id="weekly-checkin-form" className="grid" action={draftAction}>
            <input type="hidden" name="weekStart" value={weekStart} />
            <label className="span-3">Énergie /10 <input name="energy" type="number" min="1" max="10" defaultValue={checkin?.energy || 5} required /></label>
            <label className="span-3">Stress /10 <input name="stress" type="number" min="1" max="10" defaultValue={checkin?.stress || 5} required /></label>
            <label className="span-3">Sommeil (h) <input name="sleepHours" type="number" min="0" max="16" step="0.25" defaultValue={checkin?.sleep_hours || 7} required /></label>
            <label className="span-3">Hydratation moyenne <input name="averageHydration" type="number" min="0" step="0.1" defaultValue={checkin?.average_hydration || hydrationTarget} required /></label>
            <label className="span-6">Motivation <input name="motivation" defaultValue={checkin?.motivation || ""} /></label>
            <label className="span-6">Qualité du sommeil <input name="sleepQuality" defaultValue={checkin?.sleep_quality || ""} /></label>
            <label className="span-3">Sieste <input name="nap" defaultValue={checkin?.nap || ""} /></label>
            <label className="span-3">Poids <input name="weightKg" type="number" min="1" step="0.1" defaultValue={checkin?.weight_kg || assessment?.weight_kg || ""} /></label>
            <label className="span-3">RPE /10 <input name="trainingRpe" type="number" min="1" max="10" defaultValue={checkin?.training_rpe || 5} required /></label>
            <label className="span-3">Adhérence nutrition /10 <input name="nutritionAdherence" type="number" min="1" max="10" defaultValue={checkin?.nutrition_adherence || 7} required /></label>
            <label className="span-6">Douleurs <input name="pain" defaultValue={checkin?.pain || ""} /></label>
            <label className="span-6">Localisation <input name="painLocation" defaultValue={checkin?.pain_location || ""} /></label>
            <label className="span-6">Ressenti des entraînements <textarea name="trainingFeeling" defaultValue={checkin?.training_feeling || ""} /></label>
            <label className="span-6">Fierté / réussite <textarea name="weeklyWin" defaultValue={checkin?.weekly_win || ""} /></label>
            <label className="span-3">Taille <input name="waist" defaultValue={checkin?.measurements?.waist || ""} /></label>
            <label className="span-3">Poitrine <input name="chest" defaultValue={checkin?.measurements?.chest || ""} /></label>
            <label className="span-3">Hanches <input name="hip" defaultValue={checkin?.measurements?.hip || ""} /></label>
            <label className="span-3">Autres mesures <input name="measurements" defaultValue={checkin?.measurements?.other || ""} /></label>
            <label className="span-12 photo-input">Photos de progression
              <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
              <span className="muted small">{Array.isArray(checkin?.photos) && checkin.photos.length ? `${checkin.photos.length} photo(s) déjà conservée(s)` : "Formats acceptés : JPG, PNG ou WebP. Max 5 Mo par photo."}</span>
            </label>
            <label className="span-12">Journal privé <textarea name="privateJournal" defaultValue={checkin?.journal?.body || ""} /></label>
            <label className="span-12 checkbox-line">
              <input name="sharePrivateJournal" type="checkbox" defaultChecked={Boolean(checkin?.journal?.visible_to_coach)} />
              Autoriser mon coach à lire ce journal privé
              <span className="muted small">Cette décision concerne uniquement votre journal, pas le contenu du bilan.</span>
            </label>
            <div className="span-12 row">
              <button className="ghost" disabled={draftPending}>Enregistrer le brouillon</button>
              <button
                className="primary"
                formAction={submitAction}
                disabled={submitPending}
                onClick={(event) => {
                  if (!window.confirm("Transmettre ce bilan au coach ? Il ne pourra plus être modifié ensuite.")) event.preventDefault();
                }}
              >
                Transmettre au coach
              </button>
            </div>
          </form>
          <ActionStatus state={draftPending ? { status: "idle", message: "Enregistrement du brouillon..." } : draftState} />
          <ActionStatus state={submitPending ? { status: "idle", message: "Transmission au coach..." } : submitState} />
        </>
      ) : (
        <>
          <WeeklyCheckinReadOnly checkin={checkin} />
          <form className="stack sharing-control" action={shareAction}>
            <input type="hidden" name="weekStart" value={weekStart} />
            <div>
              <h3>Journal privé</h3>
              <p className="muted small">Le contenu de votre journal reste distinct du bilan transmis. Vous pouvez en autoriser ou retirer l’accès au coach à tout moment.</p>
            </div>
            <label className="checkbox-line">
              <input name="sharePrivateJournal" type="checkbox" defaultChecked={Boolean(checkin?.journal?.visible_to_coach)} />
              Autoriser mon coach à lire ce journal privé
            </label>
            <button className="ghost" disabled={sharePending}>Mettre à jour le partage</button>
            <ActionStatus state={sharePending ? { status: "idle", message: "Mise à jour du partage..." } : shareState} />
          </form>
        </>
      )}
    </section>
  );
}

function WeeklyCheckinReadOnly({ checkin }: { checkin: any }) {
  const items = [
    ["Énergie", checkin?.energy ? `${checkin.energy}/10` : "Non renseigné"],
    ["Stress", checkin?.stress ? `${checkin.stress}/10` : "Non renseigné"],
    ["Sommeil", checkin?.sleep_hours ? `${checkin.sleep_hours} h` : "Non renseigné"],
    ["Hydratation moyenne", checkin?.average_hydration ? `${checkin.average_hydration} L` : "Non renseigné"],
    ["Poids", checkin?.weight_kg ? `${checkin.weight_kg} kg` : "Non renseigné"],
    ["RPE", checkin?.training_rpe ? `${checkin.training_rpe}/10` : "Non renseigné"],
    ["Adhérence nutritionnelle", checkin?.nutrition_adherence ? `${checkin.nutrition_adherence}/10` : "Non renseigné"],
    ["Douleurs", checkin?.pain || "Aucune précision"],
    ["Ressenti", checkin?.training_feeling || "Aucune précision"],
    ["Fierté / réussite", checkin?.weekly_win || "Aucune précision"]
  ];
  return (
    <section className="weekly-readonly" aria-label="Récapitulatif du bilan hebdomadaire">
      <h3>Récapitulatif en lecture seule</h3>
      <div className="weekly-readonly-grid">
        {items.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
    </section>
  );
}

function AppHeader({
  roleLabel,
  navigationId,
  menuOpen = false,
  onMenuToggle
}: {
  roleLabel: string;
  navigationId?: string;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
}) {
  return (
    <header className="app-header">
      <div className="logo-mark"><strong>REBOOT</strong><span>PERFORMANCE</span></div>
      <div className="header-actions">
        {onMenuToggle ? (
          <button
            className="mobile-menu-button"
            type="button"
            onClick={onMenuToggle}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            aria-controls={navigationId}
            title={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <span aria-hidden="true">☰</span>
          </button>
        ) : null}
        <span className="status-pill">En ligne</span>
        <span className="role-label">{roleLabel}</span>
        <ThemeSwitcher />
        <form action={signOutAction}>
          <button className="header-logout" type="submit" title="Se déconnecter" aria-label="Se déconnecter">
            <span aria-hidden="true">↪</span>
            <span className="header-logout-label">Déconnexion</span>
          </button>
        </form>
      </div>
    </header>
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
  const [theme, setTheme] = useState<ThemeChoice>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("reboot.theme");
    const next = stored === "light" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("reboot.theme", next);
    applyTheme(next);
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={theme === "dark" ? "Mode sombre actif" : "Mode clair actif"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
    </button>
  );
}

function LiveUpdateBridge({ profile, data }: { profile: any; data: any }) {
  const router = useRouter();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [showStatus, setShowStatus] = useState(true);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const forcedOffline = useRef(false);

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
        if (nextStatus === "SUBSCRIBED" && !forcedOffline.current) setStatus("online");
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
      "ai_recommendations",
      "meal_entries",
      "hydration_entries",
      "weekly_checkins",
      "tribe_posts"
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
      forcedOffline.current = false;
      setStatus("connecting");
      router.refresh();
    };
    const onOffline = () => {
      forcedOffline.current = true;
      setStatus("offline");
    };
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
    setShowStatus(true);
    if (status === "online") {
      const timer = window.setTimeout(() => setShowStatus(false), 2400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [status]);

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
      {showStatus ? (
        <div className={`live-status ${status}`} role="status" aria-live="polite">
          {status === "online" ? "Synchronisé" : status === "connecting" ? "Connexion temps réel" : "Hors ligne"}
        </div>
      ) : null}
      {hasNewVersion ? (
        <div className="version-toast" role="status" aria-live="polite">
          <span>Une nouvelle version de Reboot Performance est disponible</span>
          <button className="primary" type="button" onClick={() => window.location.reload()}>Mettre à jour</button>
        </div>
      ) : null}
    </>
  );
}

function useThemePersistence() {
  useEffect(() => {
    const stored = window.localStorage.getItem("reboot.theme");
    applyTheme(stored === "light" ? "light" : "dark");
  }, []);
}

function applyTheme(theme: ThemeChoice) {
  document.documentElement.dataset.theme = theme;
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
      <InfoBlock title="Situation actuelle" value={formatJsonForDisplay(before)} code />
      <InfoBlock title="Proposition" value={formatJsonForDisplay(after)} code />
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <article className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">◇</span>
      <span>
        <strong>{title}</strong>
        <p className="muted">{text}</p>
      </span>
    </article>
  );
}

function DashboardMetric({ label, value, hint, progress, tone }: { label: string; value: string; hint: string; progress: number; tone: string }) {
  return (
    <article className={`dashboard-metric ${tone}`}>
      <span className="metric-symbol" aria-hidden="true" />
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      <span className="muted small">{hint}</span>
      <span className="progress-track" aria-label={`${label} : ${progress}%`}><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></span>
    </article>
  );
}

function kpi(label: string, value: any, hint: string) {
  return <article className="kpi span-3"><span className="muted small">{label}</span><strong>{value}</strong><span className="muted small">{hint}</span></article>;
}

function initials(client: any) {
  return `${client?.first_name?.[0] || ""}${client?.last_name?.[0] || ""}`.toUpperCase() || "RP";
}

function parisDateIso(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function clientLastActivity(clientId: string, data: any) {
  const values = [
    ...(data.workouts || [])
      .filter((item: any) => item.client_id === clientId)
      .map((item: any) => item.completed_at || item.updated_at || item.scheduled_for),
    ...(data.messages || [])
      .filter((item: any) => item.sender_id === clientId || item.recipient_id === clientId)
      .map((item: any) => item.created_at),
    ...(data.weeklyCheckins || [])
      .filter((item: any) => item.client_id === clientId)
      .map((item: any) => item.submitted_at || item.updated_at || item.week_start),
    ...(data.mealEntries || [])
      .filter((item: any) => item.client_id === clientId)
      .map((item: any) => item.created_at || item.meal_date),
    ...(data.hydrationEntries || [])
      .filter((item: any) => item.client_id === clientId)
      .map((item: any) => item.created_at || item.entry_date)
  ].filter(Boolean);
  return values.sort((left: string, right: string) => new Date(right).getTime() - new Date(left).getTime())[0] || null;
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "aucune activité récente";
  const difference = daysSince(value);
  if (!Number.isFinite(difference)) return "date inconnue";
  if (difference <= 0) return "aujourd'hui";
  if (difference === 1) return "hier";
  if (difference < 7) return `il y a ${difference} jours`;
  if (difference < 30) return `il y a ${Math.floor(difference / 7)} semaine(s)`;
  return formatDayDate(String(value).slice(0, 10));
}

function trendText(current: unknown, previous: unknown) {
  const difference = Number(current || 0) - Number(previous || 0);
  if (Math.abs(difference) < 0.05) return "stable";
  return `${difference > 0 ? "+" : ""}${Math.round(difference * 10) / 10}`;
}

function formatSignedChange(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function auditActionLabel(action?: string) {
  const labels: Record<string, string> = {
    "meal.created": "Repas enregistré",
    "meal.updated": "Repas modifié",
    "meal.deleted": "Repas supprimé",
    "meal.recipe_added": "Recette ajoutée aux repas",
    "hydration.created": "Hydratation enregistrée",
    "hydration.deleted": "Hydratation corrigée",
    "workout.created": "Séance attribuée",
    "workout.updated": "Séance modifiée",
    "workout.completed": "Séance terminée",
    "message.sent": "Message envoyé",
    "assessment.updated": "Bilan de forme modifié",
    "nutrition.updated": "Objectifs nutritionnels modifiés"
  };
  return labels[String(action || "")] || "Intervention enregistrée";
}

function currentWeekSchedule(workouts: any[]) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1);
  const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = parisDateIso(date);
    return {
      day: label,
      date: dateKey,
      workout: workouts.find((item: any) => item.scheduled_for === dateKey),
      isToday: dateKey === parisDateIso(now)
    };
  });
}

function shortWorkoutTitle(title?: string) {
  if (!title) return "Repos";
  if (/^phase\d+/i.test(title) || title.length > 34) return "Séance planifiée";
  return title;
}

function recipeImage(recipe: any, index: number) {
  const name = `${recipe?.name || ""} ${recipe?.objective || ""}`.toLowerCase();
  if (name.includes("saumon") || name.includes("poisson")) return "/media/recipe-salmon.webp";
  if (name.includes("petit") || name.includes("avoine") || name.includes("déjeuner")) return "/media/recipe-breakfast.webp";
  if (name.includes("vég") || name.includes("tofu") || name.includes("lentille")) return "/media/recipe-vegetarian.webp";
  return ["/media/recipe-chicken.webp", "/media/recipe-salmon.webp", "/media/recipe-breakfast.webp", "/media/recipe-vegetarian.webp"][index % 4];
}

function sortByPosition(left: any, right: any) {
  return Number(left.position || left.step_number || 0) - Number(right.position || right.step_number || 0);
}

function libraryImage(card: any, index: number) {
  const text = `${card?.title || ""} ${card?.category || ""}`.toLowerCase();
  if (text.includes("récup") || text.includes("sommeil") || text.includes("stress")) return "/media/game-recovery.webp";
  if (text.includes("entraîn") || text.includes("force") || text.includes("sport")) return "/media/game-training.webp";
  return ["/media/game-knowledge.webp", "/media/game-recovery.webp", "/media/game-coach.webp"][index % 3];
}

function readingTime(value: string) {
  return Math.max(1, Math.ceil(String(value || "").trim().split(/\s+/).filter(Boolean).length / 180));
}

function truncateText(value: string, limit: number) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

function displayContentTitle(title: string) {
  const normalized = title.trim();
  const demoMatch = normalized.match(/^d(?:e|é)mo(?:nstration)?[\s:.-]*(.+)$/i);
  return demoMatch?.[1] ? `Démonstration · ${demoMatch[1]}` : normalized;
}

function displayCommunityBody(body?: string) {
  const normalized = String(body || "").trim();
  if (/^payload\s+phase\s*\d+/i.test(normalized)) {
    return "Démonstration · publication utilisée pour vérifier le fil de la Tribu.";
  }
  return normalized || "Publication sans texte.";
}

function displayUserText(value?: string) {
  return String(value || "")
    .replace(/Supabase/gi, "Reboot Performance")
    .replace(/publication_targets/gi, "contenus ciblés")
    .replace(/\bUUID\b/gi, "identifiant")
    .replace(/\bpayload\b/gi, "contenu")
    .trim();
}

function tribeAuthorLabel(post: any) {
  if (post.source === "coach" || post.author_role === "coach") return "Votre coach";
  return "Membre de la Tribu";
}

function tribeKindLabel(kind?: string) {
  return {
    victory: "Victoire",
    question: "Question",
    training_feedback: "Retour d'entraînement",
    client_post: "Publication"
  }[String(kind || "").toLowerCase()] || "Publication";
}

function workoutCompletedSetKeys(feedback: any) {
  const legacy = Array.isArray(feedback?.completed_sets) ? feedback.completed_sets.map(String) : [];
  const structured = Array.isArray(feedback?.reboot_session_v1?.completed_sets)
    ? feedback.reboot_session_v1.completed_sets
        .filter((set: any) => Number.isInteger(set?.exercise_index) && Number.isInteger(set?.set_index))
        .map((set: any) => `${set.exercise_index}:${set.set_index}`)
    : [];
  return Array.from(new Set([...legacy, ...structured]));
}

function weeklyCheckinStatusLabel(checkin: any) {
  if (checkin?.status === "locked") return "Verrouillé";
  if (checkin?.viewed_at) return "Consulté";
  if (checkin?.status === "submitted") return "Transmis";
  return "Brouillon";
}

function statusLabel(status?: string) {
  return {
    planned: "Planifié",
    completed: "Terminé",
    missed: "Manqué",
    archived: "Archivé",
    recovery: "Récupération",
    draft: "Brouillon",
    submitted: "Transmis",
    locked: "Verrouillé",
    active: "Actif",
    pending: "En attente",
    approved: "Validé",
    applied: "Appliqué",
    modified: "Modifié",
    postponed: "Reporté",
    rejected: "Refusé",
    scheduled: "Programmé",
    published: "Publié"
  }[String(status || "").toLowerCase()] || "À vérifier";
}

function formatJsonForDisplay(value: any) {
  const translated = translateTechnicalValues(sanitizeDisplayData(value || {}));
  const lines = formatDisplayLines(translated);
  return lines.length ? lines.join("\n") : "Aucune donnée disponible";
}

function formatDisplayLines(value: any, depth = 0): string[] {
  if (Array.isArray(value)) {
    const visibleEntries = value.slice(0, 3);
    const lines = visibleEntries.flatMap((entry, index) => {
      const prefix = `${"  ".repeat(depth)}Élément ${index + 1}`;
      return entry && typeof entry === "object"
        ? [prefix, ...formatDisplayLines(entry, depth + 1)]
        : [`${prefix} : ${displayScalar(entry)}`];
    });
    if (value.length > visibleEntries.length) {
      lines.push(`${"  ".repeat(depth)}… ${value.length - visibleEntries.length} autre(s) élément(s)`);
    }
    return lines;
  }
  if (!value || typeof value !== "object") return [`${"  ".repeat(depth)}${displayScalar(value)}`];
  const visibleEntries = Object.entries(value).slice(0, 8);
  const lines = visibleEntries.flatMap(([key, entry]) => {
    const label = `${"  ".repeat(depth)}${key}`;
    if (entry && typeof entry === "object") return [label, ...formatDisplayLines(entry, depth + 1)];
    return [`${label} : ${displayScalar(entry)}`];
  });
  if (Object.keys(value).length > visibleEntries.length) {
    lines.push(`${"  ".repeat(depth)}… autres informations disponibles`);
  }
  return lines;
}

function displayScalar(value: unknown) {
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (value === null || value === undefined || value === "") return "Non renseigné";
  return String(value);
}

function sanitizeDisplayData(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeDisplayData);
  if (!value || typeof value !== "object") return value;
  const hiddenKeys = new Set(["id", "client_id", "coach_id", "analysis_id", "created_at", "updated_at", "recipient_id", "sender_id"]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !hiddenKeys.has(key) && !key.endsWith("_id"))
      .map(([key, entry]) => [key, sanitizeDisplayData(entry)])
  );
}

function translateTechnicalValues(value: any): any {
  if (Array.isArray(value)) return value.map(translateTechnicalValues);
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? statusLabelOrValue(value) : value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [displayKeyLabel(key), translateTechnicalValues(entry)]));
}

function statusLabelOrValue(value: string) {
  const translated = statusLabel(value);
  return translated === "À vérifier" ? value : translated;
}

function displayKeyLabel(key: string) {
  return {
    calories: "calories",
    protein: "protéines (g)",
    carbs: "glucides (g)",
    fat: "lipides (g)",
    sets: "séries",
    reps: "répétitions",
    load: "charge (kg)",
    exercise: "exercice",
    exercises: "exercices",
    completed_sets: "séries terminées",
    reboot_session_v1: "suivi de séance",
    client_finished_at: "fin de séance",
    client_note: "note du client",
    finished_at: "terminé le",
    status: "statut",
    scheduled_for: "date planifiée",
    completed_at: "terminé le",
    exercise_index: "exercice",
    set_index: "série",
    water_liters: "hydratation (L)",
    duration_minutes: "durée (min)",
    training_details: "détails de la séance",
    workouts: "séances récentes",
    workout: "séance",
    title: "intitulé",
    notes: "notes",
    feedback: "retour du client",
    measurements: "mesures",
    messages: "échanges récents",
    assessment: "bilan",
    nutrition: "repères nutritionnels",
    formula: "objectif",
    adherence: "assiduité",
    rpe_target: "RPE cible",
    rest_seconds: "repos (sec)",
    replacement_exercise: "exercice de remplacement"
  }[key] || key.replaceAll("_", " ");
}

function recommendationTypeLabel(value?: string) {
  return {
    training: "Entraînement",
    nutrition: "Nutrition",
    follow_up: "Suivi",
    message: "Message",
    publication: "Publication",
    alert: "Alerte"
  }[String(value || "").toLowerCase()] || "Recommandation";
}

function aiActionTypeLabel(value?: string) {
  return {
    "nutrition.update": "Mise à jour nutritionnelle",
    "training.update": "Mise à jour d'entraînement",
    "nutrition.restore": "Restauration nutritionnelle",
    "training.restore": "Restauration d'entraînement"
  }[String(value || "").toLowerCase()] || "Action du coach";
}

function priorityLabel(value?: string) {
  return {
    low: "Priorité faible",
    medium: "Priorité modérée",
    high: "Priorité haute",
    urgent: "Urgent"
  }[String(value || "").toLowerCase()] || "À évaluer";
}

function difficultyLabel(value?: string) {
  return {
    easy: "Facile",
    medium: "Intermédiaire",
    hard: "Avancé",
    facile: "Facile",
    intermediaire: "Intermédiaire",
    avance: "Avancé"
  }[String(value || "").toLowerCase()] || "Niveau adapté";
}

function buildWorkoutExercises(workout: any): WorkoutExercise[] {
  const source = Array.isArray(workout?.exercises) && workout.exercises.length ? workout.exercises : ["Mobilite controlee", "Renforcement technique", "Retour au calme"];
  return source.map((name: string, index: number) => ({
    name: cleanExerciseName(name),
    rest: index === 0 ? 90 : 75,
    rpe: index === 0 ? 7 : 8,
    sets: Array.from({ length: 3 }, (_, setIndex) => ({
      reps: index === 0 ? "8-10" : "10-12",
      load: setIndex === 0 ? "leger" : setIndex === 1 ? "modere" : "controle",
      rpe: index === 0 ? 7 : 8
    }))
  }));
}

function cleanExerciseName(name: string) {
  if (!name || /^phase\d+/i.test(name)) return "Exercice guide";
  return name.replace(/[-_]/g, " ").trim();
}

function filterByPeriod(items: any[], key: string, period: string) {
  if (period === "all") return items;
  const days = periodDays(period);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return items.filter((item) => {
    const value = item?.[key];
    if (!value) return false;
    return new Date(value).getTime() >= threshold.getTime();
  });
}

function filterByPreviousPeriod(items: any[], key: string, period: string) {
  if (period === "all") return [];
  const days = periodDays(period);
  const end = new Date();
  end.setDate(end.getDate() - days);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return items.filter((item) => {
    const value = item?.[key];
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= start.getTime() && time < end.getTime();
  });
}

function periodDays(period: string) {
  const periods: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "365d": 365
  };
  return periods[period] || 90;
}

function aggregateDailyNutrition(items: any[], valueKey: string, dateKey = "meal_date") {
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = String(item?.[dateKey] || "");
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + Number(item?.[valueKey] || 0));
  }
  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ label: formatDayDate(date), value: Math.round(value * 10) / 10 }));
}

function workoutVolume(workout: any) {
  const structured = workout?.feedback?.reboot_session_v1?.completed_sets;
  if (Array.isArray(structured) && structured.length) {
    return structured.reduce((sum: number, set: any) => {
      const load = Number(set.load || set.weight || 0);
      const reps = Number(set.reps || 1);
      return sum + (load > 0 ? load * reps : reps);
    }, 0);
  }
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises.length : 0;
  return exercises > 0 ? exercises : 0;
}

function shortDateLabel(label: string) {
  const parts = label.split(" ");
  return parts.length > 2 ? parts.slice(0, 2).join(" ") : label;
}

function sumMeals(meals: any[]) {
  return meals.reduce((totals, meal) => ({
    calories: totals.calories + Number(meal.calories || 0),
    protein: totals.protein + Number(meal.protein || 0),
    carbs: totals.carbs + Number(meal.carbs || 0),
    fat: totals.fat + Number(meal.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function progressPercent(value: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Number(value || 0) / Number(target)) * 100)));
}

function macroLabel(key: "calories" | "protein" | "carbs" | "fat") {
  return {
    calories: "Calories",
    protein: "Protéines",
    carbs: "Glucides",
    fat: "Lipides"
  }[key];
}

function getCurrentWeekStart() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
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

function formulaLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    perte: "Perte de poids",
    masse: "Prise de masse",
    maintien: "Maintien"
  };
  return labels[String(value || "").toLowerCase()] || "Accompagnement personnalisé";
}

function formatDayDate(value: string | null | undefined) {
  if (!value) return "Date à définir";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / 86400000);
}
