# Mises a jour et deploiements automatiques

## Code applicatif

La production doit etre branchee sur GitHub avec la branche `main` comme branche de production Vercel.

Workflow a suivre pour chaque modification de code :

1. `npm run release:check`
2. `npm run test:e2e`
3. `npm run supabase:smoke`
4. `npm run supabase:phase4`
5. `npm run supabase:phase5`
6. `git add ...`
7. `git commit -m "Message clair"`
8. `git push origin main`
9. verifier que le deploiement Vercel est `Ready`

Ne jamais pousser si un test ou le build echoue.

Vercel doit utiliser la commande de build par defaut du projet :

```bash
npm run build
```

Ce script lance `next build` et genere le dossier `.next`.

## Donnees metier

Les modifications suivantes sont des donnees Supabase et ne demandent ni commit GitHub ni redeploiement Vercel :

- nutrition ;
- seances ;
- bilans ;
- publications ;
- recettes assignees ;
- messages ;
- notifications ;
- badges ;
- defis ;
- actions IA validees.

Ces changements passent par les Server Actions, Supabase RLS et les invalidations Next.js.

## Temps reel

L'application ecoute Supabase Realtime cote navigateur.

Les abonnements sont filtres par role :

- client : uniquement ses lignes `client_id`, ses messages, ses contenus visibles par RLS ;
- coach : uniquement ses clients, ses contenus, ses messages et ses recommandations IA.

Chaque evenement autorise declenche un `router.refresh()` debounced afin de relire les donnees serveur.

## Nouvelle version

Le client interroge `/api/version`.

Si Vercel a deploye un nouveau commit pendant que l'application est ouverte, un message discret apparait :

> Une nouvelle version de Reboot Performance est disponible

Le bouton `Mettre a jour` recharge la page proprement. Aucun rechargement brutal n'est impose pendant une saisie.

## PWA

Le service worker cache uniquement les assets statiques non sensibles :

- manifest ;
- icones ;
- assets `/_next/static`.

Les routes authentifiees, l'API et les donnees utilisateur ne sont pas mises en cache durablement.
