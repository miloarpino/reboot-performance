"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateRecoveredPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { status: "idle", message: "" };

export function PasswordResetForm({ recoveryValid }: { recoveryValid: boolean }) {
  const [state, formAction, pending] = useActionState(updateRecoveredPasswordAction, initialState);

  if (!recoveryValid) {
    return (
      <div className="stack">
        <p className="notice danger-notice" role="alert">Ce lien de récupération est invalide ou a expiré.</p>
        <p className="muted">Demandez un nouveau lien pour choisir un mot de passe.</p>
        <Link className="primary button-link" href="/forgot-password">Demander un nouveau lien</Link>
      </div>
    );
  }

  return (
    <form className="stack" action={formAction}>
      <label htmlFor="new-password">
        Nouveau mot de passe
        <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </label>
      <label htmlFor="password-confirmation">
        Confirmer le nouveau mot de passe
        <input id="password-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required />
      </label>
      <p className="muted small">Au moins 12 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial, sans espace.</p>
      <button className="primary" disabled={pending}>{pending ? "Modification en cours…" : "Modifier le mot de passe"}</button>
      {state.status === "error" ? <p className="notice danger-notice" role="alert">{state.message}</p> : null}
    </form>
  );
}
