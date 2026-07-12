import { redirect } from "next/navigation";
import { getCurrentSessionData } from "../../lib/supabase/data";
import { ClientSupabaseApp, MissingProfileScreen } from "../supabase-app";

export default async function ClientPage() {
  const { user, profile, appData } = await getCurrentSessionData();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    return <MissingProfileScreen />;
  }

  if (profile.role !== "client") {
    redirect("/coach");
  }

  return <ClientSupabaseApp profile={profile} data={appData} />;
}
