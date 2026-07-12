import { redirect } from "next/navigation";
import { getCurrentSessionData } from "../lib/supabase/data";

export default async function HomePage() {
  const { user, profile } = await getCurrentSessionData();

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    redirect("/login");
  }

  redirect(profile.role === "coach" ? "/coach" : "/client");
}
