import Link from "next/link";
import { PasswordRecoveryRequestForm } from "./password-recovery-request-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-shell">
      <section className="panel auth-panel stack">
        <div>
          <span className="pill gold">Reboot Performance</span>
          <h1>Mot de passe oublié</h1>
          <p className="muted">Saisissez votre adresse e-mail. Nous vous enverrons un lien sécurisé si un compte lui est associé.</p>
        </div>
        <PasswordRecoveryRequestForm />
        <p className="muted small"><Link href="/login">Retour à la connexion</Link></p>
      </section>
    </main>
  );
}
