import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const password = process.env.SEED_PASSWORD || readLocalEnv("SEED_PASSWORD");
const coachEmail = "coach.milo@reboot.test";
const clientEmail = "cliente.perte@reboot.test";

test.skip(!password, "SEED_PASSWORD is required for E2E tests.");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Se deconnecter" }).click();
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
  await expect(page.getByRole("navigation")).toContainText("Accueil");
  await expect(page.getByRole("navigation")).toContainText("Clients");
  await expect(page.getByRole("navigation")).toContainText("Agent IA");
  await expect(page.getByRole("navigation")).toContainText("Contenus");
  await expect(page.getByRole("navigation")).toContainText("Notifications");
  await page.getByRole("button", { name: "Clair" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Systeme" }).click();
  await page.getByRole("button", { name: "Clients", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();
  await logout(page);
});

test("parcours coach: bilan, nutrition, seance, IA et contenu restent fonctionnels", async ({ page }) => {
  await login(page, coachEmail);
  await expect(page).toHaveURL(/\/coach/);

  await page.getByRole("button", { name: "Clients", exact: true }).click();
  await page.getByRole("button", { name: "Bilan" }).click();
  await page.getByLabel("Objectif", { exact: true }).fill("Phase 6 E2E - objectif controle");
  await page.getByRole("button", { name: "Enregistrer le bilan" }).click();
  await expect(page.getByLabel("Objectif", { exact: true })).toHaveValue("Phase 6 E2E - objectif controle");

  await page.getByRole("button", { name: "Nutrition" }).click();
  await page.getByLabel("Calories").fill("1990");
  await page.getByRole("button", { name: "Modifier la nutrition" }).click();
  await expect(page.getByLabel("Calories")).toHaveValue("1990");

  await page.getByRole("button", { name: "Entrainement" }).click();
  const title = `Seance E2E ${Date.now()}`;
  const workoutSection = page.locator("section").filter({ has: page.getByRole("button", { name: "Attribuer la seance" }) }).last();
  await workoutSection.getByLabel("Titre").fill(title);
  await workoutSection.getByLabel("Date").fill(new Date().toISOString().slice(0, 10));
  await workoutSection.getByRole("button", { name: "Attribuer la seance" }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole("button", { name: "Agent IA", exact: true }).click();
  await page.getByRole("button", { name: "Analyser ce client" }).click();
  await expect(page.getByText(/adherence|attention prioritaire|suivi stable/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Contenus", exact: true }).click();
  const contentSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Nouveau contenu", exact: true }) }).last();
  await contentSection.getByLabel("Titre").fill(`Contenu E2E ${Date.now()}`);
  await contentSection.getByLabel("Contenu").fill("Message de test E2E visible uniquement selon ciblage.");
  await contentSection.getByRole("button", { name: "Enregistrer brouillon" }).click();
  await expect(page.getByText("Message de test E2E visible uniquement selon ciblage.").first()).toBeVisible();

  await logout(page);
});

test("parcours client: dashboard, nutrition, recettes, programme, messages et securite coach", async ({ page }) => {
  await login(page, clientEmail);
  await expect(page).toHaveURL(/\/client/);
  await expect(page.getByRole("heading", { name: "Aujourd'hui" })).toBeVisible();
  await expect(page.getByText(/Realiser|Choisir|Lire/)).toBeVisible();
  await page.getByRole("button", { name: "Corner Cuisine" }).click();
  await expect(page.getByRole("heading", { name: "Corner Cuisine", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Programme", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Programme", level: 1 })).toBeVisible();

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
  await expect(page.getByRole("button", { name: "Mettre a jour" })).toBeVisible();
  await logout(page);
});

test("perte puis retour reseau affiche l'etat temps reel", async ({ page }) => {
  await login(page, clientEmail);
  await expect(page).toHaveURL(/\/client/);
  await expect(page.getByText(/Connexion temps reel|Synchronise/)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText("Hors ligne")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText(/Connexion temps reel|Synchronise/)).toBeVisible();
  await logout(page);
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`responsive sans scroll horizontal a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, coachEmail);
    await expectNoHorizontalScroll(page);
    await logout(page);

    await page.setViewportSize({ width, height: 900 });
    await login(page, clientEmail);
    await expectNoHorizontalScroll(page);
    await logout(page);
  });
}

function readLocalEnv(key: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((item) => item.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}
