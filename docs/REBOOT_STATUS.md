# Reboot Performance — point de reprise

_Mis à jour le 06/08/2026 (Europe/Rome)._

## Git

- Branche de travail : `agent/rebuild-client-coach-interface`.
- Point de sauvegarde précédent : `0713769238ddd829641873c517ae5af24abddf80` — `Sauvegarde interface client coach et suivi Phase 8`.
- Le parcours de récupération sécurisé du mot de passe est prêt à être sauvegardé sur cette branche.

## Authentification coach

- Compte coach officiel : `milo.reboot.performance@gmail.com`.
- La récupération sécurisée du mot de passe est développée et testée : demande publique non énumérante, callback PKCE, lien invalide/expiré géré, politique de mot de passe, révocation globale des sessions et retour vers la connexion.
- La connexion au compte coach a été confirmée après la récupération.
- URL locale autorisée dans Supabase : `http://localhost:3000/auth/callback?flow=recovery`.

## Vérifications confirmées

- `npm test` — réussi.
- `npm run security:audit` — réussi, sans secret évident dans les fichiers versionnables.
- `npm run build` — réussi avec Next.js `15.5.20`.
- `npm run test:e2e` — réussi : 25 tests passés, 2 tests de mutation distante volontairement ignorés.
- `git diff --check` — réussi, sans erreur d'espacement.

## Éléments hors commit

- `photo/image*.png` — images locales de référence, non liées à l'application.
- `tsconfig.tsbuildinfo` — artefact TypeScript généré.

## Migration Phase 8

- Fichier : `supabase/migrations/0014_phase8_client_tracking.sql`.
- Aucun changement ni aucune application distante n'a été effectué sur cette migration.

## Prochaines étapes métier

- Mettre en place la notion de coach unique actif, sans supprimer les profils coach existants.
- Mettre en place l'affectation automatique et sécurisée des nouveaux clients au coach actif après confirmation du premier paiement.
- Concevoir et implémenter les abonnements et paiements conformément à l'audit produit et sécurité.
