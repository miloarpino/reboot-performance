export default function Loading() {
  return (
    <main className="auth-shell" aria-busy="true" aria-live="polite">
      <section className="panel auth-panel stack">
        <span className="pill gold">Chargement</span>
        <h1>Reboot Performance</h1>
        <p className="muted">Chargement securise de votre espace.</p>
        <div className="skeleton-block" aria-hidden="true" />
      </section>
    </main>
  );
}
