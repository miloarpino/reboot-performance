import { cookies } from "next/headers";
import { isValidPasswordRecoveryCookie, PASSWORD_RECOVERY_COOKIE } from "../../lib/auth/password-recovery";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { PasswordResetForm } from "./password-reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryCookie = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const recoveryValid = !error && Boolean(data.user) && isValidPasswordRecoveryCookie(recoveryCookie, data.user!.id);

  return (
    <main className="auth-shell">
      <section className="panel auth-panel stack">
        <div>
          <span className="pill gold">Reboot Performance</span>
          <h1>Choisir un nouveau mot de passe</h1>
          <p className="muted">Cette page est réservée aux liens de récupération valides et temporaires.</p>
        </div>
        <PasswordResetForm recoveryValid={recoveryValid} />
      </section>
    </main>
  );
}
