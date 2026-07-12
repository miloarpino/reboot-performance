import { redirect } from "next/navigation";
import { getCurrentSessionData } from "../../lib/supabase/data";
import { CoachSupabaseApp, MissingProfileScreen } from "../supabase-app";

export default async function CoachPage() {
  const { user, profile, appData } = await getCurrentSessionData();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    return <MissingProfileScreen />;
  }

  if (profile.role !== "coach") {
    redirect("/client");
  }

  return <CoachSupabaseApp profile={profile} data={appData} />;
}
