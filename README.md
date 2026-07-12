# Reboot Performance

Application Next.js principale pour Reboot Performance, connectee a Supabase Auth, Supabase Database, RLS et Agent IA serveur.

L'ancien fichier HTML monolithique reste uniquement une reference locale ignoree par Git. La production doit utiliser l'application Next.js.

## Etat actuel

- Next.js rend la vraie application coach/client sur `/`.
- Supabase est la source principale pour les profils, clients, bilans, nutrition, seances, contenus, recettes, notifications, messages, actions IA et audit.
- Les politiques RLS protegent les acces coach/client.
- L'Agent IA lit les donnees Supabase, enregistre des propositions structurees et applique les modifications internes uniquement apres validation coach.
- Les changements nutrition et entrainement valides sont transactionnels, audites et restaurables.
- Le mode demo historique reste separe sur `/demo` et peut etre bloque en production.
- La Phase 6 ajoute les tests E2E Playwright, le scan de secrets, les pages d'erreur/loading et la checklist de lancement.

## Installation locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

L'application locale s'ouvre ensuite sur [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Renseigner dans `.env.local` uniquement, jamais dans Git :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `AI_MODEL`
- `AI_DEMO_MODE=false`
- `ENABLE_DEMO_MODE=false`
- `SEED_PASSWORD`

`ENABLE_DEMO_MODE=false` bloque `/demo` en production. Mettre `true` uniquement pour une instance de demonstration assumee.

## Migrations Supabase

Les migrations sont dans `supabase/migrations/`.

```bash
npx supabase db push
```

Executer ensuite les validations :

```bash
npm run supabase:smoke
npm run supabase:phase4
npm run supabase:phase5
npm run test:e2e
npm run security:audit
npm audit --omit=dev
npm run build
```

## Comptes de test

Le seed Supabase utilise `SUPABASE_SERVICE_ROLE_KEY` et `SEED_PASSWORD`.

```bash
npm run supabase:seed
```

Comptes attendus :

- `coach.milo@reboot.test`
- `cliente.perte@reboot.test`
- `client.masse@reboot.test`

Le mot de passe vient de `SEED_PASSWORD`.

## Tests avant livraison

```bash
npm run supabase:phase5
npm run supabase:phase4
npm run supabase:smoke
npm test
npm run build
```

Ces commandes doivent rester vertes avant de passer a une phase suivante.

## Deploiement

Voir [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).
Voir aussi [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

Points critiques :

- definir les variables d'environnement dans Vercel ou l'hebergeur choisi ;
- configurer les redirect URLs Supabase Auth ;
- garder `SUPABASE_SERVICE_ROLE_KEY` uniquement cote serveur ;
- garder `ENABLE_DEMO_MODE=false` sur la production publique ;
- verifier RLS apres chaque migration.
