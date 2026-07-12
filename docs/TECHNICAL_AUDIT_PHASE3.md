# Audit technique Phase 3

## Verdict court

La partie utilisable de Reboot Performance est encore une demo locale statique.

Elle fonctionne via :

- `index.html`
- `src/main.mjs`
- `src/domain.mjs`
- `src/seed.mjs`
- `localStorage`
- `scripts/test.mjs`
- `scripts/build.mjs`

Next.js, Supabase et les routes serveur sont prepares, mais ils ne pilotent pas encore l'application visible.

## Next.js

- Des fichiers Next existent dans `app/`.
- `app/page.tsx` est une page minimale.
- L'interface premium visible n'est pas encore rendue par Next.js.
- Les composants React metier ne sont pas encore crees.
- `node_modules` n'existe pas dans le dossier.
- `npm run dev` echoue dans cet environnement car `npm` n'est pas disponible dans le PATH.
- `npm run build` echoue pour la meme raison.

## Supabase

- Les migrations SQL existent dans `supabase/migrations/`.
- `lib/supabase/server.ts` prepare un client serveur Supabase.
- Aucune donnee de l'interface demo n'est actuellement lue depuis Supabase.
- Les donnees sont locales dans `src/seed.mjs`.
- Les modifications sont stockees dans `localStorage`.
- Les politiques RLS sont ecrites dans les migrations, mais non executees ni verifiees contre une instance Supabase locale ou distante.

## Authentification

- Les roles coach/client existent dans les donnees de demo.
- Il n'y a pas encore de connexion Supabase Auth operationnelle dans l'interface visible.
- Le changement coach/client dans la demo est un selecteur local.

## Routes serveur

- `app/api/ai/coach/route.ts` existe.
- Elle n'est pas utilisee par la demo locale.
- Elle ne peut pas etre verifiee via `npm run dev` tant que l'environnement Next n'est pas installe/lance.

## Build et tests disponibles

- Le build local `node scripts/build.mjs` genere `dist/`.
- Les tests locaux `node scripts/test.mjs` valident les regles metier en JavaScript.
- Ces tests ne valident pas encore Supabase, RLS, Auth ou rendu Next.

## Decision Phase 3

Conserver le prototype local comme mode demonstration fonctionnel.

Continuer a developper les regles metier et l'UX sans casser la demo.

Preparer les migrations Supabase en parallele, sans pretendre que les donnees sont connectees tant que Supabase Auth, RLS et les requetes serveur ne sont pas branches.
