# Reboot Performance — point de reprise

_Audit local figé le 05/08/2026 (Europe/Rome). Aucune donnée Supabase/Auth ni aucun fichier fonctionnel n'a été modifié pendant cette mission._

## Git

- Branche actuelle : `agent/rebuild-client-coach-interface`
- Commit courant : `0713769238ddd829641873c517ae5af24abddf80` — `Sauvegarde interface client coach et suivi Phase 8`
- Cette branche n'a pas d'upstream distant configuré.
- `main` pointe sur `93c0505` et suit `origin/main`.

### `git status --short`

```
?? docs/REBOOT_STATUS.md
?? photo/image.png
?? photo/image_10.png
?? photo/image_11.png
?? photo/image_12.png
?? photo/image_13.png
?? photo/image_14.png
?? photo/image_15.png
?? photo/image_2.png
?? photo/image_3.png
?? photo/image_4.png
?? photo/image_5.png
?? photo/image_6.png
?? photo/image_7.png
?? photo/image_8.png
?? photo/image_9.png
?? tsconfig.tsbuildinfo
```

### `git diff --stat`

Sortie vide : aucun fichier suivi n'est actuellement modifié. `docs/REBOOT_STATUS.md` est non suivi car il vient d'être créé pour cette mission ; il n'apparaît donc pas dans ce diff.

## Fichiers locaux

### À conserver pour le prochain point de contrôle

- `docs/REBOOT_STATUS.md` — unique fichier créé pendant cette mission ; document de reprise, non fonctionnel.

### Temporaires ou inutilisés à ne pas inclure dans un commit fonctionnel

- `tsconfig.tsbuildinfo` — artefact généré par TypeScript.
- `photo/.DS_Store` — métadonnée macOS ignorée par Git.
- `photo/image.png`
- `photo/image_2.png`
- `photo/image_3.png`
- `photo/image_4.png`
- `photo/image_5.png`
- `photo/image_6.png`
- `photo/image_7.png`
- `photo/image_8.png`
- `photo/image_9.png`
- `photo/image_10.png`
- `photo/image_11.png`
- `photo/image_12.png`
- `photo/image_13.png`
- `photo/image_14.png`
- `photo/image_15.png`

Les quinze PNG du dossier `photo/` sont des images de référence locales non reliées à l'application. Les médias réellement utilisés sont déjà versionnés sous `public/media/` dans le commit `0713769`.

## Dernières vérifications réellement confirmées

Exécutées avec succès le 29/07/2026, avant le commit de sauvegarde :

- `npm test` — réussi.
- `npm run security:audit` — réussi ; aucun secret évident dans les fichiers versionnables.
- `npm run build` — réussi avec Next.js `15.5.20`.
- `npm run test:e2e` — réussi : 24 tests passés, 2 tests de mutations distantes volontairement ignorés.
- `git diff --check` — réussi, sans erreur d'espacement.

Ces commandes n'ont pas été relancées pendant cette mission afin de respecter son périmètre de gel local.

## Migration Phase 8

- Fichier : `supabase/migrations/0014_phase8_client_tracking.sql`
- État Git : suivi et propre ; aucun diff local.
- Dernier commit contenant ce fichier : `0713769238ddd829641873c517ae5af24abddf80`.
- SHA-256 local : `abd557b8d71b7b945e317c5facb3b5d05067187adc2a56a690d7bddd55b0140a`.
- Cette mission n'a ni modifié ni appliqué la migration. Son état d'application distant n'a pas été interrogé.

## État de reprise

### Terminé

- Sauvegarde locale de l'interface client/coach et du suivi Phase 8 dans le commit `0713769`.
- Vérifications de test, sécurité, build, E2E et format du diff confirmées avant cette sauvegarde.
- Supabase est connu comme `ACTIVE_HEALTHY` et la connexion au site est confirmée fonctionnelle.

### En cours

- Aucun changement fonctionnel n'est en cours dans l'arbre Git : aucun fichier suivi n'est modifié.
- Le présent document fige uniquement l'état local.

### Bloqué

- La copie distante du commit `0713769` n'a pas été créée : l'authentification GitHub locale est absente pour le remote HTTPS et SSH est refusé. Aucune branche distante `agent/rebuild-client-coach-interface` n'a été publiée.

### Non commencé

- Rattacher le compte coach Milo Arpino `23709e06-b5b4-4785-9fac-1b379587557a` à `milo.reboot.performance@gmail.com` ; son adresse actuelle reste `coach.milo@reboot.test`.
- Mettre en place la notion de coach unique actif sans supprimer les profils existants.
- Mettre en place l'affectation automatique et sécurisée des nouveaux clients après confirmation du premier paiement.

## Prochaine action unique recommandée

Configurer l'authentification GitHub locale, puis publier **uniquement** le commit de sauvegarde existant sur `origin/agent/rebuild-client-coach-interface` avec `git push -u origin agent/rebuild-client-coach-interface`. Cette action nécessite une autorisation explicite distincte, car elle écrit sur GitHub.
