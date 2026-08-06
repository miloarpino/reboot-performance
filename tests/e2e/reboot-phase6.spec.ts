import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const password = process.env.SEED_PASSWORD || readLocalEnv("SEED_PASSWORD");
const coachEmail = process.env.COACH_E2E_EMAIL || "milo.reboot.performance@gmail.com";
const clientEmail = "cliente.perte@reboot.test";
const allowRemoteMutations = process.env.ALLOW_REMOTE_E2E_MUTATIONS === "true";
const screenshotDirectory = "/private/tmp/reboot-interface-mix";

test("récupération de mot de passe : parcours public et liens invalides", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveAttribute("href", "/forgot-password");

  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await expect(page.getByRole("heading", { name: "Mot de passe oublié" })).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail")).toHaveAttribute("autocomplete", "email");
  await page.getByLabel("Adresse e-mail").fill("adresse-invalide");
  await page.getByRole("button", { name: "Recevoir un lien sécurisé" }).click();
  expect(await page.getByLabel("Adresse e-mail").evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);

  await page.goto("/reset-password");
  await expect(page.getByText("Ce lien de récupération est invalide ou a expiré.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander un nouveau lien" })).toHaveAttribute("href", "/forgot-password");

  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=recovery_link_invalid/);
  await expect(page.getByText("Ce lien de récupération est invalide ou a expiré. Demandez un nouveau lien.")).toBeVisible();
});

test.skip(!password, "SEED_PASSWORD is required for E2E tests.");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/(coach|client)/);
}

async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: "Se déconnecter" });
  await logoutButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/login/);
}

async function resetLocalSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
}

async function expectNoHorizontalScroll(page: Page) {
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement || document.body;
    return root ? root.scrollWidth - window.innerWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test("mauvaise connexion, connexion coach, navigation coach et deconnexion", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(coachEmail);
  await page.getByLabel("Mot de passe").fill("mot-de-passe-invalide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();

  await login(page, coachEmail);
  await expect(page).toHaveURL(/\/coach/);
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
  const coachNavigation = page.locator("#coach-navigation .nav");
  await expect(coachNavigation.getByRole("button")).toHaveCount(4);
  await expect(coachNavigation).toContainText("Tableau de bord");
  await expect(coachNavigation).toContainText("Clients");
  await expect(coachNavigation).toContainText("Contenu");
  await expect(coachNavigation).toContainText("Alertes");
  await expect(coachNavigation).not.toContainText("Agent IA");
  await expect(page.getByLabel(/Passer en mode sombre|Passer en mode clair/i)).toBeVisible();
  await expect(page.getByText("Systeme")).toHaveCount(0);
  await page.getByLabel("Passer en mode clair").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Passer en mode sombre").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Clients", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();
  await logout(page);
});

test("separation stricte: le coach conserve la console coach apres ouverture d'une fiche et rechargement", async ({ page }) => {
  await login(page, coachEmail);
  await expect(page).toHaveURL(/\/coach/);
  await expect(page.getByTestId("coach-workspace")).toBeVisible();
  await expect(page.getByTestId("client-workspace")).toHaveCount(0);
  await expect(page.getByText("Menu Athlète", { exact: true })).toHaveCount(0);
  await expect(page.locator(".role-label")).toHaveText("Console Coach");

  await page.getByRole("button", { name: "Clients", exact: true }).click();
  const clientRows = page.getByTestId("coach-client-row");
  expect(await clientRows.count()).toBeGreaterThan(0);
  await clientRows.first().click();
  await expect(page.getByRole("tablist", { name: "Fiche client" })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/coach/);
  await expect(page.getByTestId("coach-workspace")).toBeVisible();
  await expect(page.getByTestId("client-workspace")).toHaveCount(0);
  await expect(page.getByText("Menu Athlète", { exact: true })).toHaveCount(0);
});

test("separation stricte: le client reste dans l'espace athlete et ne peut pas ouvrir coach", async ({ page }) => {
  await login(page, clientEmail);
  await expect(page).toHaveURL(/\/client/);
  await expect(page.getByTestId("client-workspace")).toBeVisible();
  await expect(page.getByTestId("coach-workspace")).toHaveCount(0);
  await expect(page.getByText("Menu Athlète", { exact: true })).toBeVisible();
  await expect(page.getByText("Console Coach", { exact: true })).toHaveCount(0);

  await page.goto("/coach");
  await expect(page).toHaveURL(/\/client/);
  await page.reload();
  await expect(page.getByTestId("client-workspace")).toBeVisible();
  await expect(page.getByTestId("coach-workspace")).toHaveCount(0);
});

test("navigation mobile client: le tiroir s'ouvre, navigue puis se ferme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, clientEmail);
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("button", { name: "Fermer le menu", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Coin diététique" }).click();
  await expect(page.getByRole("heading", { name: "Coin diététique", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Système", { exact: true })).toHaveCount(0);
});

test("navigation mobile coach: le tiroir ouvre les clients et l'Agent IA reste dans le dossier", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, coachEmail);
  await expect(page.getByTestId("coach-workspace")).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Clients", exact: true }).click();
  await page.getByTestId("coach-client-row").first().click();
  await expect(page.getByRole("heading", { name: "Agent IA Coach", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Menu Athlète", { exact: true })).toHaveCount(0);
});

test("jeux client interactifs et états produit sans mutation distante", async ({ page }) => {
  await login(page, clientEmail);
  await page.getByRole("button", { name: "Jeux & Quiz" }).click();
  await page.locator(".game-menu-card").filter({ hasText: "Quiz évolutif" }).getByRole("button").click();
  await page.getByRole("button", { name: "Sommeil court et performances en baisse" }).click();
  await page.getByRole("button", { name: "Valider ma réponse" }).click();
  await expect(page.getByText(/Bonne réponse/)).toBeVisible();
  await expect(page.getByText(/Score : 1\/1/)).toBeVisible();
  await page.getByRole("button", { name: "Question suivante" }).click();
  await page.getByRole("button", { name: "Recommencer le quiz" }).click();
  await expect(page.getByText(/Score : 0\/0/)).toBeVisible();

  await page.getByRole("button", { name: "Retour aux jeux" }).click();
  await page.locator(".game-menu-card").filter({ hasText: "Juste Macro" }).getByRole("button").click();
  await page.getByLabel("Votre estimation").fill("520");
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText(/référence|proche|Écart/i)).toBeVisible();
  await page.getByRole("button", { name: "Retour aux jeux" }).click();
  await page.locator(".game-menu-card").filter({ hasText: "Labo du Chef" }).getByRole("button").click();
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(page.getByText(/Score \d+\/100/)).toBeVisible();

  await page.getByRole("button", { name: "Bibliothèque" }).click();
  await expect(page.getByRole("heading", { name: "Bibliothèque scientifique" })).toBeVisible();
  const demonstrationBadge = page.getByText("Démonstration", { exact: true }).first();
  if (await demonstrationBadge.count()) await expect(demonstrationBadge).toBeVisible();
  await page.getByRole("button", { name: "Lire la suite" }).first().click();
  await expect(page.getByRole("button", { name: "Retour à la bibliothèque" })).toBeVisible();
  await page.getByRole("button", { name: "Retour à la bibliothèque" }).click();
  await expect(page.getByText(/UUID|Supabase|publication_targets/i)).toHaveCount(0);
});

test("ciblage coach par noms sans identifiant technique visible", async ({ page }) => {
  await login(page, coachEmail);
  await page.getByRole("button", { name: "Contenu", exact: true }).click();
  await page.getByLabel("Ciblage").selectOption("manual");
  const targetLabels = page.locator(".client-target-grid label");
  expect(await targetLabels.count()).toBeGreaterThan(0);
  await expect(page.locator("main")).not.toContainText(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});

test("nutrition client: indicateurs, estimation modifiable et ajout recette sont de vraies interactions", async ({ page }) => {
  await login(page, clientEmail);
  await page.getByRole("button", { name: "Coin diététique" }).click();
  await expect(page.locator(".daily-ring-card")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "+0,25 L" })).toBeVisible();
  const mealForm = page.getByTestId("meal-entry-form");
  await mealForm.getByLabel("Moment du repas").selectOption({ label: "Dîner" });
  await mealForm.getByLabel("Description", { exact: true }).fill("Poulet, riz et légumes");
  await mealForm.getByLabel("Calories", { exact: true }).fill("540");
  await mealForm.getByLabel("Protéines", { exact: true }).fill("42");
  await mealForm.getByLabel("Glucides", { exact: true }).fill("62");
  await mealForm.getByLabel("Lipides", { exact: true }).fill("14");
  await mealForm.getByRole("button", { name: "Vérifier le repas" }).click();
  await expect(mealForm.getByText(/Dîner .* 540 kcal/)).toBeVisible();
  await mealForm.getByRole("button", { name: "Modifier", exact: true }).click();
  await mealForm.getByLabel("Calories", { exact: true }).fill("515");
  await mealForm.getByRole("button", { name: "Vérifier le repas" }).click();
  await expect(mealForm.getByText(/Dîner .* 515 kcal/)).toBeVisible();

  const recipeAdders = page.getByText("Ajouter à mes repas du jour", { exact: true });
  if (await recipeAdders.count()) {
    await recipeAdders.first().click();
    await expect(page.getByRole("button", { name: "Confirmer l'ajout" }).first()).toBeVisible();
  }
});

test("dossier coach: huit onglets, messagerie et validation humaine de l'Agent IA", async ({ page }) => {
  await login(page, coachEmail);
  await page.getByRole("button", { name: "Clients", exact: true }).click();
  await page.getByTestId("coach-client-row").first().click();
  await expect(page.getByRole("tablist", { name: "Fiche client" }).getByRole("button")).toHaveCount(8);
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await expect(page.getByText(/Conversation avec/)).toBeVisible();
  await expect(page.getByPlaceholder(/Écrire à/)).toBeVisible();

  const recommendation = page.locator(".ai-card").first();
  if (await recommendation.count()) {
    await expect(recommendation.getByRole("button", { name: "Modifier et valider" })).toBeVisible();
    await expect(recommendation.getByRole("button", { name: "Valider", exact: true })).toBeVisible();
    await expect(recommendation.getByRole("button", { name: "Reporter" })).toBeVisible();
    await expect(recommendation.getByRole("button", { name: "Refuser" })).toBeVisible();
  }
});

test("centre d'alertes ouvre le dossier ou la messagerie concernée", async ({ page }) => {
  await login(page, coachEmail);
  await page.getByRole("button", { name: "Alertes", exact: true }).click();
  await expect(page.getByTestId("coach-alerts-hub")).toBeVisible();
  const openDossier = page.getByRole("button", { name: "Ouvrir le dossier" }).first();
  if (await openDossier.count()) {
    await openDossier.click();
    await expect(page.getByTestId("coach-client-dossier")).toBeVisible();
  }
});

test("parcours coach: bilan, nutrition, seance, IA et contenu restent fonctionnels", async ({ page }) => {
  test.skip(!allowRemoteMutations, "Activez ALLOW_REMOTE_E2E_MUTATIONS=true uniquement sur une base de test isolée.");
  await login(page, coachEmail);
  await expect(page).toHaveURL(/\/coach/);

  await page.getByRole("button", { name: "Clients", exact: true }).click();
  const clientRows = page.getByTestId("coach-client-row");
  await clientRows.first().click();
  await page.getByRole("button", { name: "Bilan" }).click();
  await page.getByLabel("Objectif", { exact: true }).fill("Phase 6 E2E - objectif controle");
  await page.getByRole("button", { name: "Enregistrer le bilan" }).click();
  await expect(page.getByLabel("Objectif", { exact: true })).toHaveValue("Phase 6 E2E - objectif controle");

  await page.getByRole("button", { name: "Nutrition" }).click();
  await page.getByLabel("Calories").fill("1990");
  await page.getByRole("button", { name: "Valider les objectifs nutritionnels" }).click();
  await expect(page.getByLabel("Calories")).toHaveValue("1990");

  await page.getByRole("button", { name: "Entraînement" }).click();
  const title = `Seance E2E ${Date.now()}`;
  const workoutSection = page.locator("section").filter({ has: page.getByRole("button", { name: "Attribuer cette séance" }) }).last();
  await workoutSection.getByLabel("Titre").fill(title);
  await workoutSection.getByLabel("Date").fill(new Date().toISOString().slice(0, 10));
  await workoutSection.getByRole("button", { name: "Attribuer cette séance" }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole("button", { name: "Analyser", exact: false }).first().click();
  await expect(page.getByText("Analyse IA terminee. Les propositions ont ete ajoutees au dossier.")).toBeVisible();
  await expect(page.locator(".ai-card").first()).toBeVisible();

  await page.getByRole("button", { name: "Contenu", exact: true }).click();
  const contentSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Nouveau contenu", exact: true }) }).last();
  await contentSection.getByLabel("Titre").fill(`Contenu E2E ${Date.now()}`);
  await contentSection.getByLabel("Contenu").fill("Message de test E2E visible uniquement selon ciblage.");
  await contentSection.getByRole("button", { name: "Enregistrer brouillon" }).click();
  await expect(page.getByText("Message de test E2E visible uniquement selon ciblage.").first()).toBeVisible();

  await logout(page);
});

test("parcours client: dashboard, nutrition, recettes, programme, messages et securite coach", async ({ page }) => {
  test.skip(!allowRemoteMutations, "Activez ALLOW_REMOTE_E2E_MUTATIONS=true uniquement sur une base de test isolée.");
  await login(page, clientEmail);
  await expect(page).toHaveURL(/\/client/);
  await expect(page.getByRole("heading", { name: "Votre espace" })).toBeVisible();
  await expect(page.getByText(/Réaliser|Consulter/)).toBeVisible();
  await page.getByRole("button", { name: "Coin diététique" }).click();
  await expect(page.getByRole("heading", { name: "Coin diététique", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Corner Cuisine Premium" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saisie du repas" })).toBeVisible();
  await expect(page.getByText("Reste:").first()).toBeVisible();
  await page.getByRole("button", { name: "Séance active", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Séance active", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Démarrer" })).toBeVisible();
  await page.getByRole("button", { name: "Démarrer" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeEnabled();
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  let finishSet = page.getByRole("button", { name: "Terminer la série" }).first();
  if (!await finishSet.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Exercice suivant" }).click();
    finishSet = page.getByRole("button", { name: "Terminer la série" }).first();
  }
  if (await finishSet.isVisible().catch(() => false)) {
    await finishSet.click();
    await expect(page.getByText("Serie terminee.")).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: "Terminée" }).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await expect(page.getByRole("button", { name: "Confirmer la fin" })).toBeVisible();
  await page.getByRole("button", { name: "Bilan hebdo" }).click();
  await expect(page.getByRole("button", { name: "Enregistrer le brouillon" })).toBeVisible();
  await expect(page.getByLabel("Partager cette note privée avec mon coach")).toBeVisible();
  await page.getByRole("button", { name: "Mes progrès" }).click();
  await expect(page.getByRole("heading", { name: "Mes progrès", level: 2 })).toBeVisible();
  await page.getByLabel("Période des graphiques").selectOption("90d");
  await expect(page.locator(".real-chart").first()).toBeVisible();
  await page.getByRole("button", { name: "Tribu & Badges" }).click();
  await expect(page.getByRole("heading", { name: "Fil de groupe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publier dans la Tribu" })).toBeVisible();
  await page.getByRole("button", { name: "Jeux & Quiz" }).click();
  await page.locator(".game-menu-card").filter({ hasText: "Quiz évolutif" }).getByRole("button").click();
  await page.getByRole("button", { name: "Sommeil court et performances en baisse" }).click();
  await expect(page.getByText(/Le duo sommeil faible/)).toBeVisible();
  await page.getByRole("button", { name: "Retour aux jeux" }).click();
  await page.locator(".game-menu-card").filter({ hasText: "Juste Macro" }).getByRole("button").click();
  await page.getByLabel("Votre estimation").fill("520");
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText(/Référence|Très proche|Écart/)).toBeVisible();
  await page.getByRole("button", { name: "Tribu & Badges" }).click();
  await expect(page.getByText(/Payload Phase/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Bibliothèque" }).click();
  await expect(page.getByRole("heading", { name: "Bibliothèque scientifique" })).toBeVisible();
  await page.getByLabel("Rechercher dans la bibliothèque").fill("protéines");
  await expect(page.getByText(/Protéines|contenu compatible/i)).toBeVisible();

  await page.goto("/coach");
  await expect(page).toHaveURL(/\/client/);
  await logout(page);
});

test("PWA et detection douce de nouvelle version", async ({ page }) => {
  await page.route("**/api/version", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ version: "version-b" })
    });
  });

  await login(page, clientEmail);
  await expect(page).toHaveURL(/\/client/);
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();

  await page.evaluate(() => window.localStorage.setItem("reboot.version", "version-a"));
  await page.evaluate(() => window.dispatchEvent(new Event("reboot:check-version")));
  await expect(page.getByText("Une nouvelle version de Reboot Performance est disponible")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mettre à jour" })).toBeVisible();
  await logout(page);
});

test("perte puis retour reseau affiche l'etat temps reel", async ({ page }) => {
  await login(page, clientEmail);
  await expect(page).toHaveURL(/\/client/);
  await expect(page.getByText(/Connexion temps réel|Synchronisé/)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText("Hors ligne")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText(/Connexion temps réel|Synchronisé/)).toBeVisible();
  await logout(page);
});

for (const width of [320, 375, 390, 430, 700, 768, 900, 1024, 1280, 1440, 1920]) {
  test(`responsive sans scroll horizontal a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, coachEmail);
    await expectNoHorizontalScroll(page);
    await resetLocalSession(page);

    await page.setViewportSize({ width, height: 900 });
    await login(page, clientEmail);
    await expectNoHorizontalScroll(page);
    await resetLocalSession(page);
  });
}

test("captures visuelles client et coach aux points de rupture demandes", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(screenshotDirectory, { recursive: true });

  await login(page, clientEmail);
  for (const width of [390, 700, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/client");
    await expect(page.getByTestId("client-workspace")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: `${screenshotDirectory}/client-home-${width}.png`, fullPage: false });
  }

  for (const section of [
    { label: "Séance active", slug: "active" },
    { label: "Coin diététique", slug: "nutrition" },
    { label: "Bilan hebdo", slug: "weekly" },
    { label: "Mes progrès", slug: "progress" },
    { label: "Tribu & Badges", slug: "tribe" },
    { label: "Jeux & Quiz", slug: "games" },
    { label: "Bibliothèque", slug: "library" }
  ]) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await openNavigationItem(page, section.label, width);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `${screenshotDirectory}/client-${section.slug}-${width}.png`, fullPage: false });
      if (section.slug === "nutrition") {
        await page.getByRole("heading", { name: "Corner Cuisine Premium" }).scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${screenshotDirectory}/client-cuisine-${width}.png`, fullPage: false });
      }
    }
  }
  await resetLocalSession(page);

  await login(page, coachEmail);
  for (const width of [390, 700, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/coach");
    await expect(page.getByTestId("coach-workspace")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: `${screenshotDirectory}/coach-home-${width}.png`, fullPage: false });
  }

  for (const section of [
    { label: "Clients", slug: "clients" },
    { label: "Contenu", slug: "content" },
    { label: "Alertes", slug: "alerts" }
  ]) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await openNavigationItem(page, section.label, width);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `${screenshotDirectory}/coach-${section.slug}-${width}.png`, fullPage: false });
    }
  }
  for (const width of [390, 700, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openNavigationItem(page, "Clients", width);
    await page.getByTestId("coach-client-row").first().click();
    await expect(page.getByTestId("coach-client-dossier")).toBeVisible();
    await page.waitForTimeout(300);
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: `${screenshotDirectory}/coach-dossier-${width}.png`, fullPage: false });
    await page.getByRole("heading", { name: "Agent IA Coach" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotDirectory}/coach-ai-${width}.png`, fullPage: false });
  }
});

async function openNavigationItem(page: Page, label: string, width: number) {
  if (width < 1200) {
    const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
    if (await menuButton.isVisible()) await menuButton.click();
  }
  await page.getByRole("button", { name: label, exact: true }).click();
  if (width < 1200) {
    await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute("aria-expanded", "false");
  }
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

function readLocalEnv(key: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((item) => item.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}
