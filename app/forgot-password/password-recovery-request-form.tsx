"use client";

import { useActionState } from "react";
import { requestPasswordRecoveryAction, type PasswordRecoveryRequestState } from "./actions";

const initialState: PasswordRecoveryRequestState = { status: "idle", message: "" };

export function PasswordRecoveryRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordRecoveryAction, initialState);

  return (
    <form className="stack" action={formAction}>
      <label htmlFor="recovery-email">
        Adresse e-mail
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <button className="primary" disabled={pending}>
        {pending ? "Envoi en cours…" : "Recevoir un lien sécurisé"}
      </button>
      {state.status === "success" ? <p className="notice" role="status" aria-live="polite">{state.message}</p> : null}
    </form>
  );
}
