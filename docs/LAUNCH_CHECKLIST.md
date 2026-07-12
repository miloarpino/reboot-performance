# Reboot Performance - Launch Checklist

Checklist Phase 6 pour preparer une premiere mise en ligne test sans casser les fondations validees.

## 1. Application

- [ ] `npm run build` passe sans erreur et genere `.next`.
- [ ] `npm run test:e2e` passe avec les comptes de test.
- [ ] `npm run security:audit` ne detecte aucun secret versionnable.
- [ ] `npm audit --omit=dev` retourne `found 0 vulnerabilities`.
- [ ] `/` ouvre la vraie application Next.js, pas une page de demonstration.
- [ ] `/demo` est inaccessible en production si `ENABLE_DEMO_MODE=false`.
- [ ] L'ecran de connexion affiche uniquement des informations utiles, sans secret ni detail technique sensible.
- [ ] Coach redirige vers `/coach`.
- [ ] Client redirige vers `/client`.

## 2. Supabase

- [ ] Toutes les migrations sont appliquees avec `npx supabase db push`.
- [ ] `npm run supabase:smoke` passe.
- [ ] `npm run supabase:phase4` passe.
- [ ] `npm run supabase:phase5` passe.
- [ ] Les roles coach/client ne peuvent pas etre choisis depuis le frontend.
- [ ] Les policies RLS empechent un client de lire les donnees d'un autre client.
- [ ] Les contenus programmes ne sont pas visibles avant leur date de publication.

## 3. Agent IA

- [ ] L'Agent IA lit les donnees Supabase reelles.
- [ ] Les propositions sont enregistrees en base.
- [ ] Une modification visible client n'est jamais publiee sans validation coach.
- [ ] Les changements nutritionnels valides sont transactionnels et audites.
- [ ] Les changements d'entrainement valides sont transactionnels, audites et restaurables.
- [ ] La cle `OPENAI_API_KEY` n'est jamais exposee au navigateur.

## 4. Experience coach

- [ ] Le menu coach reste limite a Accueil, Clients, Agent IA, Contenus, Notifications.
- [ ] L'accueil coach montre uniquement les priorites du jour.
- [ ] Les fiches clients regroupent bilan, nutrition, seances, validations IA, historique et messages.
- [ ] Aucun bouton visible n'est decoratif.
- [ ] Les messages d'etat vide expliquent quoi faire ensuite.

## 5. Experience client

- [ ] L'accueil client affiche objectif, prochaine seance, nutrition du jour, progression semaine et action prioritaire.
- [ ] Le client ne voit que les contenus publies compatibles avec son profil ou envoyes par le coach.
- [ ] Le Corner Cuisine respecte la formule du client ou les assignations coach.
- [ ] Les messages et programmes respectent les politiques RLS.

## 6. UI, mobile et accessibilite

- [ ] Mode sombre coherent.
- [ ] Mode clair coherent si active plus tard.
- [ ] Aucun element important ne garde une couleur hors theme.
- [ ] Tous les champs ont un label visible.
- [ ] Les boutons tactiles font au moins 44 px de hauteur.
- [ ] Le focus clavier est visible.
- [ ] L'application est lisible sur mobile, tablette et desktop.
- [ ] Les textes ne debordent pas des cartes.
- [ ] Les largeurs 320, 375, 390, 430, 768, 1024 et 1440 px n'ont aucun scroll horizontal.

## 7. Securite de production

- [ ] `.env.local` n'est pas commite.
- [ ] `.env.example` ne contient que des noms de variables, jamais de vraies valeurs.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` n'existe dans aucune variable `NEXT_PUBLIC_`.
- [ ] Les routes serveur verifient la session et le role.
- [ ] Les actions importantes sont auditees.
- [ ] Les doubles validations ne creent pas d'etat incoherent.

## 8. Deploiement Vercel

- [ ] Creer le projet Vercel depuis le repo Git.
- [ ] Ajouter les variables d'environnement de production.
- [ ] Configurer les URLs Supabase Auth :
  - `https://votre-domaine`
  - `https://votre-domaine/auth/callback` si le flux OAuth est ajoute plus tard.
- [ ] Lancer un premier deploy preview.
- [ ] Executer les tests Supabase contre l'environnement de production test.
- [ ] Garder un rollback disponible vers le dernier deploy stable.

## 10. GitHub

- [ ] `git status --short` ne contient pas `.env.local`, `.next`, `node_modules`, `dist`, `playwright-report` ou `test-results`.
- [ ] Le premier commit local est cree uniquement apres un scan de secrets vert.
- [ ] Aucun push GitHub n'est fait avant verification manuelle des fichiers suivis.

## 11. Commande finale avant Phase 7

```bash
npm run supabase:phase5
npm run supabase:phase4
npm run supabase:smoke
npm test
npm run test:e2e
npm run security:audit
npm run build
```
