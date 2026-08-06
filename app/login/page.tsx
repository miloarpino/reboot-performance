import { redirect } from "next/navigation";
import { getCurrentSessionData } from "../../lib/supabase/data";
import { LoginScreen } from "../supabase-app";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string; password_updated?: string }> }) {
  const { user, profile } = await getCurrentSessionData();
  const params = searchParams ? await searchParams : {};

  if (user && profile) {
    redirect(profile.role === "coach" ? "/coach" : "/client");
  }

  return <LoginScreen error={params.error} passwordUpdated={params.password_updated === "1"} />;
}
