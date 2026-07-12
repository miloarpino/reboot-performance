"use client";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr" data-theme="dark">
      <body>
        <main className="auth-shell">
          <section className="panel auth-panel stack" role="alert" aria-live="assertive">
            <span className="pill gold">Incident</span>
            <h1>Reboot Performance reste disponible</h1>
            <p className="muted">Un probleme inattendu a ete intercepte avant l'affichage de la page.</p>
            <button className="primary" type="button" onClick={reset}>Reessayer</button>
            <a className="ghost button-link" href="/login">Retour connexion</a>
          </section>
        </main>
      </body>
    </html>
  );
}
