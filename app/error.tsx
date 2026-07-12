"use client";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth-shell">
      <section className="panel auth-panel stack" role="alert" aria-live="assertive">
        <span className="pill gold">Erreur</span>
        <h1>Une erreur est survenue</h1>
        <p className="muted">
          L'action n'a pas pu etre terminee. Vous pouvez reessayer sans perdre votre session.
        </p>
        <p className="small muted">{error.digest ? `Reference: ${error.digest}` : "Erreur applicative."}</p>
        <button className="primary" type="button" onClick={reset}>Reessayer</button>
        <a className="ghost button-link" href="/">Retour a l'accueil</a>
      </section>
    </main>
  );
}
