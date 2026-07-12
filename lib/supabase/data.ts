import { createSupabaseServerClient } from "./server";

export async function getCurrentSessionData() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { user: null, profile: null, appData: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return { user: userData.user, profile: null, appData: null };
  }

  if (profile.role === "coach") {
    return {
      user: userData.user,
      profile,
      appData: await getCoachData(userData.user.id)
    };
  }

  return {
    user: userData.user,
    profile,
    appData: await getClientData(userData.user.id)
  };
}

export async function getCoachData(coachId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: relations } = await supabase
    .from("coach_client_relations")
    .select("client_id")
    .eq("coach_id", coachId);

  const clientIds = (relations || []).map((item) => item.client_id);

  const [
    clients,
    assessments,
    nutritionTargets,
    workouts,
    recipes,
    notifications,
    messages,
    approvals,
    auditLogs,
    contents,
    publicationTargets,
    templates,
    aiAnalyses,
    aiRecommendations,
    aiActions,
    rollbackEvents,
    aiUsageLogs
  ] = await Promise.all([
    clientIds.length ? supabase.from("profiles").select("*").in("id", clientIds).order("created_at", { ascending: false }) : emptyResult(),
    clientIds.length ? supabase.from("client_assessments").select("*").in("client_id", clientIds).order("updated_at", { ascending: false }) : emptyResult(),
    clientIds.length ? supabase.from("nutrition_targets").select("*").in("client_id", clientIds).order("updated_at", { ascending: false }) : emptyResult(),
    clientIds.length ? supabase.from("workouts").select("*").in("client_id", clientIds).order("scheduled_for", { ascending: true }) : emptyResult(),
    supabase.from("recipes").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
    clientIds.length ? supabase.from("messages").select("*").or(`sender_id.eq.${coachId},recipient_id.eq.${coachId}`).order("created_at", { ascending: false }) : emptyResult(),
    supabase.from("approval_requests").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").eq("actor_id", coachId).order("created_at", { ascending: false }).limit(20),
    supabase.from("contents").select("*").eq("coach_id", coachId).order("updated_at", { ascending: false }),
    supabase.from("publication_targets").select("*"),
    supabase.from("templates").select("*").eq("coach_id", coachId).eq("archived", false).order("created_at", { ascending: false }),
    supabase.from("ai_analyses").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(12),
    supabase.from("ai_recommendations").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(24),
    supabase.from("ai_actions").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(12),
    supabase.from("rollback_events").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(12),
    supabase.from("ai_usage_logs").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(12)
  ]);

  return {
    clients: clients.data || [],
    assessments: assessments.data || [],
    nutritionTargets: nutritionTargets.data || [],
    workouts: workouts.data || [],
    recipes: recipes.data || [],
    notifications: notifications.data || [],
    messages: messages.data || [],
    approvals: approvals.data || [],
    auditLogs: auditLogs.data || [],
    contents: contents.data || [],
    publicationTargets: publicationTargets.data || [],
    templates: templates.data || [],
    aiAnalyses: aiAnalyses.data || [],
    aiRecommendations: aiRecommendations.data || [],
    aiActions: aiActions.data || [],
    rollbackEvents: rollbackEvents.data || [],
    aiUsageLogs: aiUsageLogs.data || []
  };
}

export async function getClientData(clientId: string) {
  const supabase = await createSupabaseServerClient();

  const [
    assessments,
    nutritionTargets,
    workouts,
    recipes,
    recipeAssignments,
    notifications,
    messages,
    auditLogs,
    contents
  ] = await Promise.all([
    supabase.from("client_assessments").select("*").eq("client_id", clientId).order("updated_at", { ascending: false }),
    supabase.from("nutrition_targets").select("*").eq("client_id", clientId).order("updated_at", { ascending: false }),
    supabase.from("workouts").select("*").eq("client_id", clientId).order("scheduled_for", { ascending: true }),
    supabase.from("recipes").select("*").order("created_at", { ascending: false }),
    supabase.from("recipe_assignments").select("*").eq("client_id", clientId),
    supabase.from("notifications").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("messages").select("*").or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
    supabase.from("contents").select("*").order("publish_at", { ascending: false, nullsFirst: false })
  ]);

  return {
    assessments: assessments.data || [],
    nutritionTargets: nutritionTargets.data || [],
    workouts: workouts.data || [],
    recipes: recipes.data || [],
    recipeAssignments: recipeAssignments.data || [],
    notifications: notifications.data || [],
    messages: messages.data || [],
    auditLogs: auditLogs.data || [],
    contents: contents.data || []
  };
}

function emptyResult() {
  return Promise.resolve({ data: [], error: null });
}
