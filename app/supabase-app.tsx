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
          <label>Email <input name="email" type="email" required placeholder="coach.milo@reboot.test" /></label>
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
  const selectedClient = data.clients[0];
  const selectedAssessment = selectedClient ? data.assessments.find((item: any) => item.client_id === selectedClient.id) : null;
  const selectedNutrition = selectedClient ? data.nutritionTargets.find((item: any) => item.client_id === selectedClient.id) : null;
  const selectedWorkouts = selectedClient ? data.workouts.filter((item: any) => item.client_id === selectedClient.id) : [];
  const selectedMessages = selectedClient ? data.messages.filter((item: any) => item.sender_id === selectedClient.id || item.recipient_id === selectedClient.id) : [];
  const pendingAi = data.aiRecommendations.filter((item: any) => ["pending", "approved", "modified", "postponed"].includes(item.status));
  const urgentAi = data.aiRecommendations.filter((item: any) => ["high", "urgent"].includes(item.priority) && ["pending", "approved", "modified"].includes(item.status));
  const scheduledContents = data.contents.filter((item: any) => item.status === "scheduled");
  const recentAssessments = data.assessments.filter((item: any) => daysSince(item.updated_at || item.created_at) <= 7);
  const painAssessments = data.assessments.filter((item: any) => (item.pain || []).length || (item.injuries || []).length);
  const unreadNotifications = data.notifications.filter((item: any) => !item.read_at);
  const demoMode = data.aiAnalyses[0]?.mode === "demo" || !data.aiAnalyses.length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Reboot Performance</strong>
          <span className="muted small">Espace coach</span>
        </div>
        <nav className="nav">
          <a className="active" href="#dashboard">Accueil</a>
          <a href="#clients">Clients</a>
          <a href="#ai">Agent IA</a>
          <a href="#publications">Contenus</a>
          <a href="#notifications">Notifications</a>
        </nav>
        <form action={signOutAction}><button className="ghost">Se deconnecter</button></form>
      </aside>
      <section className="content">
        <header className="hero">
          <div className="stack">
            <span className="pill gold">Coach connecte</span>
            <h1>Bonjour {profile.first_name}</h1>
            <p className="muted">Priorites du jour, validations IA et clients a suivre. Tout vient de Supabase.</p>
          </div>
        </header>

        <section id="dashboard" className="grid" aria-label="Accueil coach">
          {kpi("Actions urgentes", urgentAi.length + painAssessments.length, "clients a surveiller")}
          {kpi("Nouveaux bilans", recentAssessments.length, "7 derniers jours")}
          {kpi("Douleurs signalees", painAssessments.length, "a verifier")}
          {kpi("Actions IA", pendingAi.length, "en attente")}
          {kpi("Contenus programmes", scheduledContents.length, "publication future")}
          {kpi("Notifications", unreadNotifications.length, "non lues")}
          <article className="panel span-12 stack" aria-labelledby="next-actions-title">
            <div className="row between">
              <div>
                <h2 id="next-actions-title">Prochaines actions</h2>
                <p className="muted">Commencez par les validations IA, puis ouvrez les clients avec douleur ou bilan recent.</p>
              </div>
              <a className="primary button-link" href="#ai-validations">Valider les modifications</a>
            </div>
            <div className="quick-actions" aria-label="Raccourcis coach">
              <a className="ghost button-link" href="#clients">Ouvrir les clients</a>
              <a className="ghost button-link" href="#ai">Analyser avec l'IA</a>
              <a className="ghost button-link" href="#publications">Creer un contenu</a>
              <a className="ghost button-link" href="#notifications">Voir les notifications</a>
            </div>
          </article>
        </section>

        <section id="ai" className="panel stack">
          <div className="row between">
            <div>
              <h2>Agent IA Coach</h2>
              <p className="muted">Analyse Supabase reelle, propositions structurees et validation coach obligatoire avant toute action visible.</p>
            </div>
            <span className={`pill ${demoMode ? "gold" : ""}`}>{demoMode ? "Mode demonstration IA" : "Mode API serveur"}</span>
          </div>
          <section className="grid">
            {kpi("Clients a surveiller", urgentAi.length, "priorite haute")}
            {kpi("Analyses recentes", data.aiAnalyses.length, "Supabase")}
            {kpi("Modifications preparees", pendingAi.length, "non publiees")}
            {kpi("Actions appliquees", data.aiActions.filter((item: any) => item.status === "applied").length, "auditees")}
          </section>
          <div className="row">
            <form action={analyzeAllClientsWithAiAction}><button className="primary">Analyser tous les clients</button></form>
            {selectedClient ? (
              <form action={analyzeClientWithAiAction}>
                <input type="hidden" name="clientId" value={selectedClient.id} />
                <button className="primary">Analyser ce client</button>
              </form>
            ) : null}
            <a className="ghost button-link" href="#ai-validations">Voir les validations en attente</a>
          </div>

          <div className="list">
            {data.aiAnalyses.slice(0, 4).map((analysis: any) => (
              <article className="list-item" key={analysis.id}>
                <strong>{analysis.summary}</strong>
                <p className="muted small">{analysis.mode === "demo" ? "Mode demonstration IA" : "API IA"} - {analysis.priority} - {formatDate(analysis.created_at)}</p>
                <p className="muted">Signaux: {(analysis.signals || []).join(", ")}</p>
              </article>
            ))}
            {!data.aiAnalyses.length ? <p className="muted">Aucune analyse IA enregistree pour le moment.</p> : null}
          </div>
        </section>

        <section id="publications" className="panel stack">
          <div>
            <h2>Contenus</h2>
            <p className="muted">Creer une annonce, une fiche, une recette ou un defi. Les clients ne voient que les contenus publies et compatibles avec leur profil.</p>
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
            <label className="span-9">Clients precis <input name="clientIds" placeholder={data.clients.map((client: any) => client.id).join(", ")} /></label>
            <label className="span-3">Formules <input name="formulas" placeholder="perte, masse, maintien" /></label>
            <label className="span-3">Objectifs <input name="goals" placeholder="perte de poids durable" /></label>
            <label className="span-3">Sexes <input name="sexes" placeholder="femme, homme" /></label>
            <label className="span-3">Niveaux <input name="levels" placeholder="debutant, intermediaire" /></label>
            <label className="span-3">Sports <input name="sports" placeholder="musculation" /></label>
            <label className="span-3">Age min <input name="minAge" type="number" min={1} /></label>
            <label className="span-3">Age max <input name="maxAge" type="number" min={1} /></label>
            <label className="span-3">Publication <input name="publishAt" type="datetime-local" /></label>
            <label className="span-3">Fin visible <input name="endsAt" type="datetime-local" /></label>
            <button className="ghost span-4" name="intent" value="draft">Enregistrer brouillon</button>
            <button className="primary span-4" name="intent" value="publish">Publier maintenant</button>
            <button className="primary span-4" name="intent" value="schedule">Programmer</button>
          </form>

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
            {!data.contents.length ? <p className="muted">Aucun contenu pour le moment. Creez une annonce, une fiche ou une recette depuis le formulaire ci-dessus.</p> : null}
          </div>
        </section>

        <section id="clients" className="panel stack">
          <div className="row between">
            <div><h2>Clients</h2><p className="muted">Ajouter un client ou ouvrir rapidement une fiche existante.</p></div>
          </div>
          <form className="grid" action={createClientAction}>
            <label className="span-3">Prenom <input name="firstName" required /></label>
            <label className="span-3">Nom <input name="lastName" required /></label>
            <label className="span-3">Email <input name="email" type="email" required /></label>
            <label className="span-3">Mot de passe <input name="password" type="password" required minLength={8} /></label>
            <button className="primary span-12">Creer le client</button>
          </form>
          <div className="list">
            {data.clients.map((client: any) => (
              <article className="list-item" key={client.id}>
                <strong>{client.first_name} {client.last_name}</strong>
                <span className="muted small">{client.email}</span>
              </article>
            ))}
          </div>
        </section>

        {selectedClient ? (
          <>
            <section className="panel stack">
              <h2>Fiche client : {selectedClient.first_name}</h2>
              <p className="muted">Bilan, nutrition, seances, messages et historique sont regroupes ici pour eviter de chercher dans plusieurs pages.</p>
              <form className="grid" action={updateAssessmentAction}>
                <input type="hidden" name="clientId" value={selectedClient.id} />
                <label className="span-3">Age <input name="age" type="number" defaultValue={selectedAssessment?.age || 30} required /></label>
                <label className="span-3">Sexe <select name="sex" defaultValue={selectedAssessment?.sex || "homme"}><option value="homme">Homme</option><option value="femme">Femme</option></select></label>
                <label className="span-3">Taille <input name="heightCm" type="number" defaultValue={selectedAssessment?.height_cm || 175} required /></label>
                <label className="span-3">Poids <input name="weightKg" type="number" step="0.1" defaultValue={selectedAssessment?.weight_kg || 75} required /></label>
                <label className="span-3">Masse grasse <input name="bodyFatPercent" type="number" step="0.1" defaultValue={selectedAssessment?.body_fat_percent || 0} /></label>
                <label className="span-3">Formule <select name="formula" defaultValue={selectedAssessment?.formula || "maintien"}><option value="perte">Perte</option><option value="masse">Masse</option><option value="maintien">Maintien</option></select></label>
                <label className="span-3">Niveau <input name="level" defaultValue={selectedAssessment?.level || "debutant"} /></label>
                <label className="span-3">Sport <input name="sport" defaultValue={selectedAssessment?.sport || "general"} /></label>
                <label className="span-6">Objectif <input name="goal" defaultValue={selectedAssessment?.goal || ""} /></label>
                <label className="span-6">Blessures <input name="injuries" defaultValue={(selectedAssessment?.injuries || []).join(", ")} /></label>
                <label className="span-6">Douleurs <input name="pain" defaultValue={(selectedAssessment?.pain || []).join(", ")} /></label>
                <label className="span-6">Preferences <input name="foodPreferences" defaultValue={(selectedAssessment?.food_preferences || []).join(", ")} /></label>
                <label className="span-6">Allergies <input name="allergies" defaultValue={(selectedAssessment?.allergies || []).join(", ")} /></label>
                <label className="span-6">Restrictions <input name="restrictions" defaultValue={(selectedAssessment?.restrictions || []).join(", ")} /></label>
                <label className="span-3">Activite h/sem <input name="activityHours" type="number" defaultValue={selectedAssessment?.activity_hours || 3} /></label>
                <button className="primary span-12">Enregistrer le bilan</button>
              </form>
            </section>

            <section id="nutrition" className="panel stack">
              <h2>Nutrition</h2>
              <p className="muted">Les modifications sont enregistrees en base et visibles par le client apres validation.</p>
              <form className="grid" action={updateNutritionAction}>
                <input type="hidden" name="clientId" value={selectedClient.id} />
                <label className="span-3">Calories <input name="calories" type="number" defaultValue={selectedNutrition?.calories || selectedAssessment?.calories || 2200} /></label>
                <label className="span-3">Proteines <input name="protein" type="number" defaultValue={selectedNutrition?.protein || selectedAssessment?.protein || 150} /></label>
                <label className="span-3">Glucides <input name="carbs" type="number" defaultValue={selectedNutrition?.carbs || selectedAssessment?.carbs || 220} /></label>
                <label className="span-3">Lipides <input name="fat" type="number" defaultValue={selectedNutrition?.fat || selectedAssessment?.fat || 70} /></label>
                <label className="span-3">Hydratation <input name="waterLiters" type="number" step="0.1" defaultValue={selectedNutrition?.water_liters || 2.4} /></label>
                <button className="primary span-12">Modifier la nutrition</button>
              </form>
            </section>

            <section className="panel stack">
              <h2>Seances</h2>
              <p className="muted">Attribuez une seance claire, avec date, duree et exercices principaux.</p>
              <form className="grid" action={assignWorkoutAction}>
                <input type="hidden" name="clientId" value={selectedClient.id} />
                <label className="span-4">Titre <input name="title" required defaultValue="Seance personnalisee" /></label>
                <label className="span-4">Date <input name="scheduledFor" type="date" required /></label>
                <label className="span-4">Duree <input name="durationMinutes" type="number" defaultValue={45} /></label>
                <label className="span-6">Focus <input name="focus" defaultValue="progression" /></label>
                <label className="span-6">Exercices <input name="exercises" defaultValue="Squat, Developpe, Rowing" /></label>
                <label className="span-12">Notes <input name="notes" /></label>
                <button className="primary span-12">Attribuer la seance</button>
              </form>
              <div className="list">
                {selectedWorkouts.map((workout: any) => <article className="list-item" key={workout.id}><strong>{workout.title}</strong><p className="muted">{workout.status} - {workout.scheduled_for}</p></article>)}
                {!selectedWorkouts.length ? <p className="muted">Aucune seance attribuee a ce client. Utilisez le formulaire ci-dessus pour planifier la prochaine action.</p> : null}
              </div>
            </section>

            <section id="ai-validations" className="panel stack">
              <h2>Validations IA</h2>
              <p className="muted">Aucune modification client n'est publiee automatiquement. Valider prepare l'action, Appliquer execute la transaction interne.</p>
              <div className="list">
                {data.aiRecommendations.map((recommendation: any) => (
                  <article className="list-item" key={recommendation.id}>
                    <div className="row between">
                      <div className="stack">
                        <strong>{recommendation.type} - {recommendation.problem}</strong>
                        <p className="muted small">{recommendation.status} - priorite {recommendation.priority} - confiance {Math.round(Number(recommendation.confidence) * 100)}%</p>
                        <p>{recommendation.justification}</p>
                        <p className="muted">Benefice attendu: {recommendation.expected_benefit}</p>
                        <pre className="code-preview">{JSON.stringify(recommendation.proposed_change, null, 2)}</pre>
                      </div>
                    </div>
                    <form className="grid" action={decideAiRecommendationAction}>
                      <input type="hidden" name="recommendationId" value={recommendation.id} />
                      <label className="span-8">Modifier avant validation (JSON optionnel)
                        <textarea name="coachEdit" rows={3} placeholder='{"calories": 1900, "protein": 135, "carbs": 170, "fat": 60, "water_liters": 2.4}' />
                      </label>
                      <label className="span-4">Note coach <input name="note" placeholder="Justification Milo" /></label>
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
                ))}
                {!data.aiRecommendations.length ? <p className="muted">Aucune proposition IA en attente.</p> : null}
              </div>
            </section>

            <section className="panel stack">
              <h2>Historique IA et restauration</h2>
              <div className="list">
                {data.aiActions.map((action: any) => (
                  <article className="list-item" key={action.id}>
                    <strong>{action.action_type} - {action.status}</strong>
                    <p className="muted small">{formatDate(action.created_at)}</p>
                    <pre className="code-preview">{JSON.stringify({ avant: action.before_data, apres: action.after_data }, null, 2)}</pre>
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
                {!data.aiActions.length ? <p className="muted">Aucune action IA appliquee.</p> : null}
              </div>
            </section>

            <section id="messages" className="panel stack">
              <h2>Messages</h2>
              <p className="muted">Discussion rattachee au client selectionne.</p>
              <form className="row" action={sendMessageAction}>
                <input type="hidden" name="recipientId" value={selectedClient.id} />
                <input name="body" required placeholder="Message au client" />
                <button className="primary">Envoyer</button>
              </form>
              <div className="list">
                {selectedMessages.map((message: any) => <article className="list-item" key={message.id}><p>{message.body}</p></article>)}
                {!selectedMessages.length ? <p className="muted">Aucun message avec ce client pour le moment.</p> : null}
              </div>
            </section>
          </>
        ) : null}

        <section id="notifications" className="panel stack">
          <div>
            <h2>Notifications</h2>
            <p className="muted">Alertes issues de Supabase. Les actions visibles client restent soumises aux validations prevues.</p>
          </div>
          <div className="list">
            {data.notifications.slice(0, 8).map((notification: any) => (
              <article className="list-item" key={notification.id}>
                <strong>{notification.title || notification.type || "Notification"}</strong>
                <p className="muted small">{notification.status || "active"} - {formatDate(notification.created_at)}</p>
                <p>{notification.body || notification.message || "Aucun detail disponible."}</p>
              </article>
            ))}
            {!data.notifications.length ? <p className="muted">Aucune notification pour le moment.</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

export function ClientSupabaseApp({ profile, data }: { profile: any; data: any }) {
  const assessment = data.assessments[0];
  const nutrition = data.nutritionTargets[0];
  const assignments = new Set(data.recipeAssignments.map((item: any) => item.recipe_id));
  const visibleRecipes = data.recipes.filter((recipe: any) => {
    if (assignments.has(recipe.id)) return true;
    if (!assessment) return false;
    return recipe.formulas?.includes(assessment.formula);
  });
  const nextWorkout = data.workouts
    .filter((workout: any) => workout.status !== "completed")
    .sort((a: any, b: any) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)))[0];
  const completedThisWeek = data.workouts.filter((workout: any) => workout.status === "completed" && daysSince(workout.updated_at || workout.scheduled_for) <= 7).length;
  const recommendation = data.contents[0]?.title || visibleRecipes[0]?.name || "Gardez le rythme cette semaine";
  const priorityAction = nextWorkout ? "Realiser la prochaine seance" : visibleRecipes.length ? "Choisir une recette compatible" : "Lire la derniere publication";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><strong>Reboot Performance</strong><span className="muted small">Espace client</span></div>
        <nav className="nav"><a className="active" href="#home">Accueil</a><a href="#feed">Contenus</a><a href="#nutrition">Nutrition</a><a href="#program">Programme</a><a href="#messages">Messages</a></nav>
        <form action={signOutAction}><button className="ghost">Se deconnecter</button></form>
      </aside>
      <section className="content">
        <header className="hero">
          <div className="stack">
            <span className="pill gold">Client connecte</span>
            <h1>Bonjour {profile.first_name}</h1>
            <p className="muted">Votre objectif, votre prochaine action et vos contenus personnalises.</p>
          </div>
        </header>
        <section id="home" className="grid" aria-label="Accueil client">
          {kpi("Objectif", assessment?.goal || "-", assessment?.formula || "programme")}
          {kpi("Prochaine seance", nextWorkout?.title || "A planifier", nextWorkout?.scheduled_for || "coach")}
          {kpi("Nutrition du jour", nutrition?.calories || assessment?.calories || "-", "kcal cible")}
          {kpi("Progres semaine", completedThisWeek, "seance(s) terminee(s)")}
          <article className="panel span-12 stack">
            <div>
              <h2>Action prioritaire</h2>
              <p className="muted">{priorityAction}</p>
            </div>
            <div>
              <h3>Recommandation importante</h3>
              <p>{recommendation}</p>
            </div>
          </article>
        </section>
        <section id="feed" className="panel stack">
          <h2>Contenus du coach</h2>
          <p className="muted">Uniquement les contenus publies pour votre profil.</p>
          <div className="list">
            {data.contents.map((content: any) => (
              <article className="list-item" key={content.id}>
                <strong>{content.title}</strong>
                <p className="muted small">{content.type} - {formatDate(content.publish_at || content.created_at)}</p>
                <p>{content.payload?.body}</p>
              </article>
            ))}
            {!data.contents.length ? <p className="muted">Aucune publication disponible pour votre profil pour le moment.</p> : null}
          </div>
        </section>
        <section id="nutrition" className="panel stack">
          <h2>Corner Cuisine</h2>
          <p className="muted">Recettes compatibles avec votre formule ou envoyees par votre coach.</p>
          <div className="recipe-grid">
            {visibleRecipes.map((recipe: any) => <article className="recipe-card" key={recipe.id}><div className="stack"><strong>{recipe.name}</strong><p className="muted">{recipe.calories} kcal - {recipe.protein} g proteines</p><span className="pill gold">{assignments.has(recipe.id) ? "Envoye par le coach" : "Compatible"}</span></div></article>)}
            {!visibleRecipes.length ? <p className="muted">Aucune recette compatible pour le moment. Votre coach peut vous en attribuer une.</p> : null}
          </div>
        </section>
        <section id="program" className="panel stack">
          <h2>Programme</h2>
          <div className="list">
            {data.workouts.map((workout: any) => <article className="list-item" key={workout.id}><strong>{workout.title}</strong><p className="muted">{workout.scheduled_for} - {workout.status}</p></article>)}
            {!data.workouts.length ? <p className="muted">Aucune seance planifiee pour le moment.</p> : null}
          </div>
        </section>
        <section id="messages" className="panel stack">
          <h2>Messages</h2>
          <p className="muted">Messages autorises par les politiques Supabase.</p>
          <div className="list">
            {data.messages.map((message: any) => <article className="list-item" key={message.id}><p>{message.body}</p></article>)}
            {!data.messages.length ? <p className="muted">Aucun message pour le moment.</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function kpi(label: string, value: any, hint: string) {
  return <article className="kpi span-3"><span className="muted small">{label}</span><strong>{value}</strong><span className="muted small">{hint}</span></article>;
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
