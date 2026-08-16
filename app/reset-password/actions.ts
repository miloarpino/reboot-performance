"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  isValidPasswordRecoveryCookie,
  PASSWORD_RECOVERY_COOKIE,
  validateNewPassword
} from "../../lib/auth/password-recovery";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export type ResetPasswordState = {
  status: "idle" | "error";
  message: string;
};

export async function updateRecoveredPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");
  const validation = validateNewPassword(password, confirmation);
  if (!validation.valid) {
    return { status: "error", message: validation.message };
  }

  const cookieStore = await cookies();
  const recoveryCookie = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value;
  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user || !isValidPasswordRecoveryCookie(recoveryCookie, data.user.id)) {
    clearRecoveryCookie(cookieStore);
    return { status: "error", message: "Ce lien de récupération est invalide ou a expiré. Demandez un nouveau lien." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { status: "error", message: "Impossible de modifier le mot de passe. Demandez un nouveau lien de récupération." };
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  clearRecoveryCookie(cookieStore);
  if (signOutError) {
    return {
      status: "error",
      message: "Le mot de passe a été modifié, mais la fermeture des autres sessions n’a pas pu être confirmée. Connectez-vous à nouveau dès maintenant."
    };
  }

  redirect("/login?password_updated=1");
}

function clearRecoveryCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(PASSWORD_RECOVERY_COOKIE, "", { path: "/", maxAge: 0 });
}
