# Guide de deploiement GitHub + Vercel

Guide simple pour publier Reboot Performance sans exposer de secret.

## 1. Verifier le projet local

Depuis le dossier du projet :

```bash
npm run supabase:phase5
npm run supabase:phase4
npm run supabase:smoke
npm test
npm run test:e2e
npm run security:audit
npm audit --omit=dev
npm run next:build
```

Tout doit etre vert avant de continuer.

## 2. Creer le depot GitHub

1. Ouvrir GitHub.
2. Cliquer sur `New repository`.
3. Nom conseille : `reboot-performance`.
4. Garder le depot prive au debut.
5. Ne pas ajouter de README depuis GitHub si le projet en contient deja un.

## 3. Pousser le projet

Dans le terminal :

```bash
git remote add origin https://github.com/VOTRE_COMPTE/reboot-performance.git
git branch -M main
git push -u origin main
```

Ne jamais pousser `.env.local`.

## 4. Creer le projet Vercel

1. Ouvrir Vercel.
2. Cliquer sur `Add New Project`.
3. Importer le depot GitHub `reboot-performance`.
4. Framework detecte : Next.js.
5. Garder la commande build : `npm run next:build`.

## 5. Ajouter les variables d'environnement Vercel

Dans `Project Settings > Environment Variables`, ajouter :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `AI_MODEL`
- `AI_DEMO_MODE=false`
- `ENABLE_DEMO_MODE=false`
- `SEED_PASSWORD` uniquement sur un environnement de test si le seed doit y tourner.

Ne jamais creer de variable `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## 6. Configurer Supabase Auth

Dans Supabase :

1. Aller dans `Authentication > URL Configuration`.
2. `Site URL` : URL Vercel de production.
3. Ajouter dans `Redirect URLs` :
   - `http://localhost:3000`
   - `https://votre-projet.vercel.app`
   - `https://votre-domaine.com` si un domaine custom est branche.

## 7. Deployer

1. Lancer le premier deploy Vercel.
2. Ouvrir l'URL preview.
3. Tester connexion coach et client.
4. Verifier que `/demo` est inaccessible si `ENABLE_DEMO_MODE=false`.
5. Verifier les pages `/coach`, `/client`, `/login`.

## 8. Tester apres deploiement

Depuis votre Mac, en pointant les variables vers le meme Supabase :

```bash
npm run supabase:smoke
npm run supabase:phase4
npm run supabase:phase5
```

Tester manuellement :

- connexion coach ;
- connexion client ;
- redirection selon role ;
- publication brouillon ;
- contenu cible visible cote client ;
- Agent IA avec validation obligatoire.

## 9. Rollback

Si un probleme apparait :

1. Ouvrir le projet dans Vercel.
2. Aller dans `Deployments`.
3. Choisir le dernier deploy stable.
4. Cliquer sur `Promote to Production`.
5. Verifier immediatement `/login`, `/coach` et `/client`.

## 10. Regles de securite

- Garder le depot prive tant que l'app n'est pas auditee par un humain.
- Ne jamais envoyer `.env.local`.
- Ne jamais afficher `SUPABASE_SERVICE_ROLE_KEY`.
- Garder `ENABLE_DEMO_MODE=false` en production publique.
- Relancer `npm run security:audit` avant chaque commit important.
