"use server";

import { getPasswordRecoveryRedirectUrl } from "../../lib/auth/password-recovery";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export type PasswordRecoveryRequestState = {
  status: "idle" | "success";
  message: string;
};

export async function requestPasswordRecoveryAction(
  _previous: PasswordRecoveryRequestState,
  formData: FormData
): Promise<PasswordRecoveryRequestState> {
  const email = String(formData.get("email") || "").trim();

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordRecoveryRedirectUrl()
    });
  } catch {
    // La réponse reste générique pour ne jamais révéler l'existence d'un compte.
  }

  return {
    status: "success",
    message: "Si cette adresse est associée à un compte, un e-mail de récupération vient d’être envoyé."
  };
}
