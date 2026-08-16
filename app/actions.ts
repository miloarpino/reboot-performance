"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createSupabaseServerClient } from "../lib/supabase/server";

type UiActionState = {
  status: "idle" | "success" | "error";
  message: string;
  estimate?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
};

const initialActionState: UiActionState = { status: "idle", message: "" };

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  const profile = await getProfileForUser(supabase, data.user.id);
  redirect(profile?.role === "coach" ? "/coach" : "/client");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createClientAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const firstName = String(formData.get("firstName") || "");
  const lastName = String(formData.get("lastName") || "");

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error || !created.user) throw new Error(error?.message || "Client non créé.");

  await admin.from("profiles").upsert({
    id: created.user.id,
    role: "client",
    first_name: firstName,
    last_name: lastName,
    email
  });

  await admin.from("coach_client_relations").insert({
    coach_id: authData.user.id,
    client_id: created.user.id
  });

  await admin.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: created.user.id,
    action: "client.created",
    summary: `${firstName} ${lastName}`
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function updateAssessmentAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  await requireCoachClient(supabase, authData.user.id, clientId);
  const weight = Number(formData.get("weightKg") || 70);
  const height = Number(formData.get("heightCm") || 170);
  const age = Number(formData.get("age") || 30);
  const formula = String(formData.get("formula") || "maintien");
  const calories = formula === "perte" ? Math.round(weight * 28) : formula === "masse" ? Math.round(weight * 38) : Math.round(weight * 32);
  const protein = Math.round(weight * 1.8);
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(90, Math.round((calories - protein * 4 - fat * 9) / 4));

  await supabase.from("client_assessments").upsert({
    client_id: clientId,
    age,
    sex: String(formData.get("sex") || "homme"),
    height_cm: height,
    weight_kg: weight,
    body_fat_percent: Number(formData.get("bodyFatPercent") || 0),
    level: String(formData.get("level") || "debutant"),
    formula,
    goal: String(formData.get("goal") || ""),
    sport: String(formData.get("sport") || "general"),
    activity_hours: Number(formData.get("activityHours") || 0),
    injuries: splitList(String(formData.get("injuries") || "")),
    pain: splitList(String(formData.get("pain") || "")),
    food_preferences: splitList(String(formData.get("foodPreferences") || "")),
    allergies: splitList(String(formData.get("allergies") || "")),
    restrictions: splitList(String(formData.get("restrictions") || "")),
    calories,
    protein,
    carbs,
    fat,
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" });

  await supabase.from("nutrition_targets").upsert({
    client_id: clientId,
    calories,
    protein,
    carbs,
    fat,
    water_liters: Number((weight * 0.035).toFixed(1)),
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "assessment.updated",
    summary: "Bilan et nutrition recalcules"
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function assignWorkoutAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  await requireCoachClient(supabase, authData.user.id, clientId);
  const title = String(formData.get("title") || "");
  await supabase.from("workouts").insert({
    coach_id: authData.user.id,
    client_id: clientId,
    title,
    focus: String(formData.get("focus") || ""),
    scheduled_for: String(formData.get("scheduledFor") || new Date().toISOString().slice(0, 10)),
    duration_minutes: Number(formData.get("durationMinutes") || 45),
    exercises: splitList(String(formData.get("exercises") || "")),
    notes: String(formData.get("notes") || ""),
    status: "planned"
  });

  await supabase.from("notifications").insert({
    coach_id: authData.user.id,
    client_id: clientId,
    level: "information",
    title: "Nouvelle séance attribuée",
    status: "unread"
  });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "workout.assigned",
    summary: title
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function updateNutritionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  await requireCoachClient(supabase, authData.user.id, clientId);
  await supabase.from("nutrition_targets").upsert({
    client_id: clientId,
    calories: Number(formData.get("calories") || 0),
    protein: Number(formData.get("protein") || 0),
    carbs: Number(formData.get("carbs") || 0),
    fat: Number(formData.get("fat") || 0),
    water_liters: Number(formData.get("waterLiters") || 2),
    updated_at: new Date().toISOString()
  }, { onConflict: "client_id" });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: clientId,
    action: "nutrition.updated",
    summary: "Macros modifiees"
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function createAiRecommendationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);
  const clientId = String(formData.get("clientId"));
  await requireCoachClient(supabase, authData.user.id, clientId);
  const proposal = String(formData.get("proposal") || "").trim();
  if (!proposal) throw new Error("Décrivez la demande à préparer.");

  const { data: analysis, error: analysisError } = await supabase
    .from("ai_analyses")
    .insert({
      coach_id: authData.user.id,
      client_id: clientId,
      scope: "single_client",
      mode: "demo",
      status: "completed",
      summary: "Demande libre du coach préparée pour validation.",
      priority: "medium",
      data_used: { request: proposal, source: "coach" },
      signals: ["demande_coach"]
    })
    .select("id")
    .single();
  if (analysisError || !analysis) throw new Error(analysisError?.message || "La demande n'a pas pu être préparée.");

  const { error: recommendationError } = await supabase.from("ai_recommendations").insert({
    analysis_id: analysis.id,
    coach_id: authData.user.id,
    client_id: clientId,
    type: "follow_up",
    status: "pending",
    priority: "medium",
    confidence: 1,
    problem: "Demande libre du coach",
    current_state: { origin: "coach" },
    proposed_change: { instruction: proposal },
    justification: "Cette proposition reprend la demande du coach et reste inactive jusqu'à sa validation explicite.",
    expected_benefit: "Conserver une demande claire, traçable et prête à être examinée.",
    risks: ["Aucune modification automatique"],
    requires_client_visibility: false
  });
  if (recommendationError) throw recommendationError;

  await insertAuditSafe(supabase, {
    actor_id: authData.user.id,
    client_id: clientId,
    action: "ai.recommendation.created",
    entity_id: analysis.id,
    summary: proposal,
    after_data: { status: "pending", source: "coach_request" }
  });

  revalidatePath("/coach");
}

export async function createAiRecommendationStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await createAiRecommendationAction(formData);
    return { status: "success", message: "Demande préparée. Elle attend votre validation avant toute action." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function analyzeClientWithAiAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const clientId = String(formData.get("clientId"));
  await requireCoachClient(supabase, authData.user.id, clientId);
  await createDeterministicAiAnalysis(supabase, authData.user.id, clientId);
  revalidatePath("/coach");
}

export async function analyzeClientWithAiStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await analyzeClientWithAiAction(formData);
    return { status: "success", message: "Analyse terminée. Les propositions ont été ajoutées au dossier." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function analyzeAllClientsWithAiAction() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const { data: relations } = await supabase
    .from("coach_client_relations")
    .select("client_id")
    .eq("coach_id", authData.user.id);

  for (const relation of relations || []) {
    await createDeterministicAiAnalysis(supabase, authData.user.id, relation.client_id);
  }

  revalidatePath("/coach");
}

export async function analyzeAllClientsWithAiStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await analyzeAllClientsWithAiAction();
    return { status: "success", message: "Analyse globale terminée. Les nouvelles propositions sont prêtes à être examinées." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function decideAiRecommendationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const recommendationId = String(formData.get("recommendationId"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") || "");
  const edit = parseJsonObject(String(formData.get("coachEdit") || ""));

  const { data: recommendation, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("id", recommendationId)
    .eq("coach_id", authData.user.id)
    .single();
  if (error || !recommendation) throw new Error(error?.message || "Recommandation introuvable.");
  await requireCoachClient(supabase, authData.user.id, recommendation.client_id);

  const status = decision === "approve"
    ? (edit ? "modified" : "approved")
    : decision === "reject"
      ? "rejected"
      : "postponed";

  await supabase.from("ai_recommendations").update({
    status,
    coach_edit: edit || recommendation.coach_edit,
    decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", recommendation.id);

  await supabase.from("approval_changes").insert({
    recommendation_id: recommendation.id,
    coach_id: authData.user.id,
    previous_status: recommendation.status,
    new_status: status,
    proposed_before: recommendation.proposed_change,
    proposed_after: edit || recommendation.proposed_change,
    note
  });

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    client_id: recommendation.client_id,
    action: `ai.recommendation.${status}`,
    entity_id: recommendation.id,
    summary: note || recommendation.justification,
    before_data: recommendation,
    after_data: { status, coach_edit: edit || recommendation.coach_edit }
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function decideAiRecommendationStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await decideAiRecommendationAction(formData);
    const decision = String(formData.get("decision") || "");
    const message = decision === "reject"
      ? "Proposition refusée et enregistrée dans l’historique."
      : decision === "postpone"
        ? "Proposition reportée et enregistrée dans l’historique."
        : String(formData.get("coachEdit") || "").trim()
          ? "Proposition modifiée, validée et enregistrée dans l’historique."
          : "Proposition validée et enregistrée dans l’historique.";
    return { status: "success", message };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function applyAiRecommendationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const recommendationId = String(formData.get("recommendationId"));
  const { data: recommendation, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("id", recommendationId)
    .eq("coach_id", authData.user.id)
    .single();
  if (error || !recommendation) throw new Error(error?.message || "Recommandation introuvable.");
  await requireCoachClient(supabase, authData.user.id, recommendation.client_id);

  const rpcName = recommendation.type === "nutrition"
    ? "apply_ai_nutrition_recommendation"
    : recommendation.type === "training"
      ? "apply_ai_training_recommendation"
      : null;
  if (!rpcName) {
    throw new Error("Application transactionnelle disponible pour nutrition et entrainement.");
  }

  const { error: rpcError } = await supabase.rpc(rpcName, {
    p_recommendation_id: recommendation.id,
    p_coach_id: authData.user.id
  });
  if (rpcError) throw new Error(rpcError.message);

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function applyAiRecommendationStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await applyAiRecommendationAction(formData);
    return { status: "success", message: "Modification appliquée et enregistrée dans l’historique." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function estimateMealWithAiStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  const description = String(formData.get("description") || "").trim();
  if (!description) {
    return { status: "error", message: "Decris le repas avant de demander une estimation IA.", estimate: null };
  }

  if (!process.env.OPENAI_API_KEY || process.env.AI_DEMO_MODE === "true") {
    return {
      status: "error",
      message: "L'estimation automatique est momentanément indisponible. Vous pouvez saisir les valeurs manuellement.",
      estimate: null
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_NUTRITION_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "Tu estimes des apports nutritionnels. Reponds uniquement en JSON valide avec calories, protein, carbs et fat. Les macros sont en grammes."
          },
          {
            role: "user",
            content: `Repas a estimer: ${description}`
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "meal_estimate",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fat: { type: "number" }
              },
              required: ["calories", "protein", "carbs", "fat"]
            }
          }
        }
      })
    });
    if (!response.ok) {
      throw new Error("Estimation IA indisponible pour le moment.");
    }
    const payload = await response.json();
    const rawText = typeof payload.output_text === "string" ? payload.output_text : extractResponseText(payload);
    const parsed = JSON.parse(rawText || "{}");
    const estimate = {
      calories: Math.max(0, Math.round(Number(parsed.calories || 0))),
      protein: Math.max(0, Number(Number(parsed.protein || 0).toFixed(1))),
      carbs: Math.max(0, Number(Number(parsed.carbs || 0).toFixed(1))),
      fat: Math.max(0, Number(Number(parsed.fat || 0).toFixed(1)))
    };
    if (!estimate.calories && !estimate.protein && !estimate.carbs && !estimate.fat) {
      throw new Error("Estimation IA incomplete.");
    }
    return {
      status: "success",
      message: "Estimation préparée. Vérifiez-la puis enregistrez-la manuellement.",
      estimate
    };
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error),
      estimate: null
    };
  }
}

export async function saveMealEntryStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const payload = mealPayloadFromForm(formData, authData.user.id);
    const id = String(formData.get("mealId") || "");
    const query = id
      ? supabase.from("meal_entries").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).eq("client_id", authData.user.id)
      : supabase.from("meal_entries").insert(payload);
    const { error } = await query;
    if (error) throw error;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: id ? "meal.updated" : "meal.created",
      entity_id: id || null,
      summary: payload.meal_name,
      after_data: payload
    });

    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: id ? "Repas modifie." : "Repas enregistre." };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "meal_entries") };
  }
}

export async function addRecipeToMealsStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const recipeId = String(formData.get("recipeId") || "");
    const portion = boundedNumber(formData.get("portion"), "Portion", 0.25, 4);
    const mealName = String(formData.get("mealName") || "Repas").trim() || "Repas";
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id,name,calories,protein,carbs,fat")
      .eq("id", recipeId)
      .single();
    if (recipeError || !recipe) throw new Error("Cette recette n'est pas disponible pour votre profil.");

    const payload = {
      client_id: authData.user.id,
      meal_date: todayIso(),
      meal_name: mealName,
      description: recipe.name,
      quantity: `${portion.toLocaleString("fr-FR")} portion${portion > 1 ? "s" : ""}`,
      calories: Math.round(Number(recipe.calories || 0) * portion * 10) / 10,
      protein: Math.round(Number(recipe.protein || 0) * portion * 10) / 10,
      carbs: Math.round(Number(recipe.carbs || 0) * portion * 10) / 10,
      fat: Math.round(Number(recipe.fat || 0) * portion * 10) / 10,
      source: "manual"
    };
    const { data: meal, error } = await supabase
      .from("meal_entries")
      .insert(payload)
      .select("id")
      .single();
    if (error || !meal) throw error || new Error("Le repas n'a pas pu être enregistré.");

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "meal.recipe_added",
      entity_id: meal.id,
      summary: recipe.name,
      after_data: { ...payload, recipe_id: recipe.id }
    });
    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: `${recipe.name} a été ajouté à vos repas du jour.` };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "meal_entries") };
  }
}

export async function deleteMealEntryStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const id = String(formData.get("mealId") || "");
    if (!id) throw new Error("Repas introuvable.");
    const { error } = await supabase.from("meal_entries").delete().eq("id", id).eq("client_id", authData.user.id);
    if (error) throw error;
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "meal.deleted",
      entity_id: id
    });
    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: "Repas supprime." };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "meal_entries") };
  }
}

export async function addHydrationEntryStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const liters = boundedNumber(formData.get("liters"), "La quantité", 0.05, 10);
    const payload = {
      client_id: authData.user.id,
      entry_date: todayIso(),
      liters,
      note: String(formData.get("note") || "")
    };
    const { error } = await supabase.from("hydration_entries").insert(payload);
    if (error) throw error;
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "hydration.created",
      summary: `${liters} L`,
      after_data: payload
    });
    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: `${liters} L ajoute(s).` };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "hydration_entries") };
  }
}

export async function deleteHydrationEntryStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const id = String(formData.get("hydrationId") || "");
    if (!id) throw new Error("Entree hydratation introuvable.");
    const { error } = await supabase.from("hydration_entries").delete().eq("id", id).eq("client_id", authData.user.id);
    if (error) throw error;
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "hydration.deleted",
      entity_id: id
    });
    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: "Entree hydratation supprimee." };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "hydration_entries") };
  }
}

export async function saveWeeklyCheckinStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  return upsertWeeklyCheckin(formData, "draft");
}

export async function submitWeeklyCheckinStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  return upsertWeeklyCheckin(formData, "submitted");
}

export async function updateWeeklyJournalSharingStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const weekStart = String(formData.get("weekStart") || "");
    if (!weekStart) throw new Error("Bilan introuvable.");
    const { data: checkin, error: checkinError } = await supabase
      .from("weekly_checkins")
      .select("id")
      .eq("client_id", authData.user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (checkinError) throw checkinError;
    if (!checkin) throw new Error("Bilan introuvable.");

    const visibleToCoach = formData.get("sharePrivateJournal") === "on";
    const { data: journal, error: journalReadError } = await supabase
      .from("weekly_private_journals")
      .select("id")
      .eq("client_id", authData.user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (journalReadError) throw journalReadError;

    const mutation = journal
      ? supabase
          .from("weekly_private_journals")
          .update({ visible_to_coach: visibleToCoach })
          .eq("id", journal.id)
          .eq("client_id", authData.user.id)
      : supabase
          .from("weekly_private_journals")
          .insert({
            client_id: authData.user.id,
            week_start: weekStart,
            body: "",
            visible_to_coach: visibleToCoach
          });
    const { error } = await mutation;
    if (error) throw error;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "weekly_private_journal.visibility_updated",
      entity_id: checkin.id,
      summary: visibleToCoach ? "Journal partage avec le coach" : "Journal masque au coach",
      after_data: { week_start: weekStart, visible_to_coach: visibleToCoach }
    });

    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: visibleToCoach ? "Note partagee avec le coach." : "Note masquee au coach." };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "weekly_private_journals") };
  }
}

export async function createTribePostStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const body = String(formData.get("body") || "").trim();
    if (body.length < 3) throw new Error("Ecris au moins quelques mots avant de publier.");
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const { data: relation, error: relationError } = await supabase
      .from("coach_client_relations")
      .select("coach_id")
      .eq("client_id", authData.user.id)
      .limit(1)
      .single();
    if (relationError || !relation?.coach_id) throw new Error("Aucun coach associe a ce compte.");
    const requestedKind = String(formData.get("kind") || "client_post");
    const kind = ["client_post", "victory", "question", "training_feedback"].includes(requestedKind)
      ? requestedKind
      : "client_post";

    const payload = {
      coach_id: relation.coach_id,
      client_id: authData.user.id,
      author_id: authData.user.id,
      author_role: "client",
      kind,
      body,
      media_url: String(formData.get("mediaUrl") || "").trim() || null
    };
    const { data: post, error } = await supabase.from("tribe_posts").insert(payload).select("id").single();
    if (error) throw error;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "tribe_post.created",
      entity_id: post?.id || null,
      summary: body.slice(0, 90),
      after_data: payload
    });

    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: "Publication ajoutee a la Tribu." };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "tribe_posts") };
  }
}

export async function createRecipeStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const objective = String(formData.get("objective") || "").trim();
    if (name.length < 3 || description.length < 10 || objective.length < 3) {
      throw new Error("Renseignez un nom, une description et un objectif suffisamment précis.");
    }
    const recipePayload = {
      coach_id: authData.user.id,
      name,
      description,
      objective,
      formulas: splitList(String(formData.get("formulas") || "")),
      goals: splitList(String(formData.get("goals") || "")),
      calories: boundedInteger(formData.get("calories"), "Calories", 1, 5000),
      protein: boundedInteger(formData.get("protein"), "Protéines", 0, 500),
      carbs: boundedInteger(formData.get("carbs"), "Glucides", 0, 1000),
      fat: boundedInteger(formData.get("fat"), "Lipides", 0, 500),
      portions: boundedInteger(formData.get("portions"), "Portions", 1, 20),
      prep_minutes: boundedInteger(formData.get("prepMinutes"), "Préparation", 0, 600),
      cook_minutes: boundedInteger(formData.get("cookMinutes"), "Cuisson", 0, 600),
      difficulty: ["facile", "intermediaire", "avance"].includes(String(formData.get("difficulty")))
        ? String(formData.get("difficulty"))
        : "facile",
      allergens: splitList(String(formData.get("allergens") || "")),
      diet_tags: splitList(String(formData.get("dietTags") || "")),
      coach_tip: String(formData.get("coachTip") || "").trim(),
      image_alt: String(formData.get("imageAlt") || "").trim()
    };
    const { data: recipe, error } = await admin.from("recipes").insert(recipePayload).select("id").single();
    if (error || !recipe) throw error || new Error("La recette n'a pas pu être créée.");

    try {
      const ingredients = String(formData.get("ingredients") || "").split("\n").map((item) => item.trim()).filter(Boolean);
      const steps = String(formData.get("steps") || "").split("\n").map((item) => item.trim()).filter(Boolean);
      if (!ingredients.length || !steps.length) throw new Error("Ajoutez au moins un ingrédient et une étape.");
      const { error: ingredientError } = await admin.from("recipe_ingredients").insert(
        ingredients.map((item, position) => ({ recipe_id: recipe.id, name: item, quantity: "", position }))
      );
      if (ingredientError) throw ingredientError;
      const { error: stepError } = await admin.from("recipe_steps").insert(
        steps.map((body, position) => ({ recipe_id: recipe.id, body, position }))
      );
      if (stepError) throw stepError;
    } catch (nestedError) {
      await admin.from("recipes").delete().eq("id", recipe.id);
      throw nestedError;
    }

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      action: "recipe.created",
      entity_id: recipe.id,
      summary: name,
      after_data: recipePayload
    });
    revalidatePath("/coach");
    revalidatePath("/client");
    return { status: "success", message: "Recette créée et ajoutée au Corner Cuisine." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function awardBadgeStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);
    const clientId = String(formData.get("clientId") || "");
    const title = String(formData.get("title") || "").trim();
    if (title.length < 3 || title.length > 100) throw new Error("Le nom du badge doit contenir entre 3 et 100 caractères.");
    await requireCoachClient(supabase, authData.user.id, clientId);
    const { data: badge, error } = await supabase.from("user_badges").insert({
      coach_id: authData.user.id,
      client_id: clientId,
      title,
      status: "unlocked",
      unlocked_at: new Date().toISOString()
    }).select("id").single();
    if (error || !badge) throw error || new Error("Le badge n'a pas pu être attribué.");
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: clientId,
      action: "badge.awarded",
      entity_id: badge.id,
      summary: title
    });
    revalidatePath("/coach");
    revalidatePath("/client");
    return { status: "success", message: "Badge attribué au client." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createChallengeStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);
    const clientId = String(formData.get("clientId") || "");
    const title = String(formData.get("title") || "").trim();
    if (title.length < 3 || title.length > 140) throw new Error("Le titre du défi doit contenir entre 3 et 140 caractères.");
    await requireCoachClient(supabase, authData.user.id, clientId);
    const endsAtRaw = String(formData.get("endsAt") || "");
    const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
    if (endsAt && Number.isNaN(endsAt.getTime())) throw new Error("La date de fin est invalide.");
    const { data: challenge, error } = await supabase.from("challenges").insert({
      coach_id: authData.user.id,
      client_id: clientId,
      title,
      status: "active",
      starts_at: new Date().toISOString(),
      ends_at: endsAt?.toISOString() || null
    }).select("id").single();
    if (error || !challenge) throw error || new Error("Le défi n'a pas pu être créé.");
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: clientId,
      action: "challenge.created",
      entity_id: challenge.id,
      summary: title
    });
    revalidatePath("/coach");
    revalidatePath("/client");
    return { status: "success", message: "Défi créé et attribué au client." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function completeWorkoutSetStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const workoutId = String(formData.get("workoutId") || "");
    const exerciseIndex = Number(formData.get("exerciseIndex") || 0);
    const setIndex = Number(formData.get("setIndex") || 0);
    if (!workoutId || !Number.isInteger(exerciseIndex) || !Number.isInteger(setIndex)) {
      throw new Error("Serie introuvable.");
    }

    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .select("id, client_id, feedback, status")
      .eq("id", workoutId)
      .eq("client_id", authData.user.id)
      .single();
    if (workoutError || !workout) throw new Error("Seance introuvable.");
    if (workout.status === "completed") throw new Error("Cette séance est déjà terminée.");

    const feedback = normalizeWorkoutFeedback(workout.feedback);
    const key = `${exerciseIndex}:${setIndex}`;
    const completedSets = new Set(feedback.completed_sets);
    completedSets.add(key);
    const structuredSets = new Map(
      feedback.reboot_session_v1.completed_sets.map((set: any) => [`${set.exercise_index}:${set.set_index}`, set])
    );
    structuredSets.set(key, {
      exercise_index: exerciseIndex,
      set_index: setIndex,
      completed_at: new Date().toISOString()
    });
    const nextFeedback = {
      ...feedback,
      completed_sets: Array.from(completedSets),
      reboot_session_v1: {
        ...feedback.reboot_session_v1,
        completed_sets: Array.from(structuredSets.values())
      },
      last_completed_set: {
        exercise_index: exerciseIndex,
        set_index: setIndex,
        completed_at: new Date().toISOString()
      }
    };

    const { error } = await admin
      .from("workouts")
      .update({ feedback: nextFeedback, updated_at: new Date().toISOString() })
      .eq("id", workoutId)
      .eq("client_id", authData.user.id);
    if (error) throw error;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "workout_set.completed",
      entity_id: workoutId,
      summary: `Exercice ${exerciseIndex + 1}, serie ${setIndex + 1}`,
      after_data: nextFeedback
    });

    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: "Série terminée." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function completeWorkoutStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const workoutId = String(formData.get("workoutId") || "");
    if (!workoutId) throw new Error("Seance introuvable.");

    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .select("id, client_id, feedback, status")
      .eq("id", workoutId)
      .eq("client_id", authData.user.id)
      .single();
    if (workoutError || !workout) throw new Error("Seance introuvable.");

    const feedback = normalizeWorkoutFeedback(workout.feedback);
    const nextFeedback = {
      ...feedback,
      reboot_session_v1: {
        ...feedback.reboot_session_v1,
        finished_at: new Date().toISOString()
      },
      client_finished_at: new Date().toISOString(),
      client_note: String(formData.get("clientNote") || "").trim()
    };

    const { error } = await admin
      .from("workouts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        feedback: nextFeedback,
        updated_at: new Date().toISOString()
      })
      .eq("id", workoutId)
      .eq("client_id", authData.user.id);
    if (error) throw error;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: "workout.completed",
      entity_id: workoutId,
      summary: "Séance terminée par le client",
      after_data: nextFeedback
    });

    revalidatePath("/client");
    revalidatePath("/coach");
    return { status: "success", message: "Séance terminée. Bravo, votre coach verra le retour." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function restoreAiNutritionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const actionId = String(formData.get("actionId"));
  const { error } = await supabase.rpc("restore_ai_nutrition_action", {
    p_action_id: actionId,
    p_coach_id: authData.user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function restoreAiTrainingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const actionId = String(formData.get("actionId"));
  const { error } = await supabase.rpc("restore_ai_training_action", {
    p_action_id: actionId,
    p_coach_id: authData.user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function resolveApprovalAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const id = String(formData.get("approvalId"));
  const status = String(formData.get("status"));
  await supabase.from("approval_requests").update({
    status,
    resolved_at: new Date().toISOString()
  }).eq("id", id);

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: `ai.recommendation.${status}`,
    entity_id: id
  });

  revalidatePath("/coach");
}

export async function sendMessageAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const recipientId = String(formData.get("recipientId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!recipientId || !body) throw new Error("Le destinataire et le message sont obligatoires.");

  const profile = await getProfileForUser(supabase, authData.user.id);
  if (profile?.role === "coach") {
    await requireCoachClient(supabase, authData.user.id, recipientId);
  } else {
    await requireClient(supabase, authData.user.id);
    const { data: relation, error: relationError } = await supabase
      .from("coach_client_relations")
      .select("coach_id")
      .eq("client_id", authData.user.id)
      .eq("coach_id", recipientId)
      .maybeSingle();
    if (relationError || !relation) throw new Error("Ce destinataire n'est pas rattaché à votre suivi.");
  }

  const { data: message, error } = await supabase.from("messages").insert({
    sender_id: authData.user.id,
    recipient_id: recipientId,
    body
  }).select("id").single();
  if (error) throw error;

  await insertAuditSafe(supabase, {
    actor_id: authData.user.id,
    client_id: profile?.role === "client" ? authData.user.id : recipientId,
    action: "message.sent",
    entity_id: message?.id || null,
    summary: body.slice(0, 90)
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function sendMessageStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await sendMessageAction(formData);
    return { status: "success", message: "Message envoyé." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function createPublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const intent = String(formData.get("intent") || "draft");
  const status = intent === "schedule" ? "scheduled" : intent === "publish" ? "published" : "draft";
  const now = new Date().toISOString();
  const publishAt = status === "published"
    ? now
    : status === "scheduled"
      ? String(formData.get("publishAt") || now)
      : null;

  const payload = {
    body: String(formData.get("body") || ""),
    category: String(formData.get("category") || "general")
  };

  const { data: content, error } = await supabase.from("contents").insert({
    coach_id: authData.user.id,
    type: String(formData.get("type") || "announcement"),
    title: String(formData.get("title") || ""),
    status,
    payload,
    publish_at: publishAt,
    ends_at: String(formData.get("endsAt") || "") || null
  }).select("*").single();
  if (error || !content) throw new Error(error?.message || "Publication non créée.");

  const clientIds = formData
    .getAll("clientIds")
    .flatMap((value) => splitList(String(value)))
    .filter(Boolean);

  await supabase.from("publication_targets").insert({
    content_id: content.id,
    mode: String(formData.get("targetMode") || "all"),
    client_ids: clientIds,
    formulas: splitList(String(formData.get("formulas") || "")),
    goals: splitList(String(formData.get("goals") || "")),
    sexes: splitList(String(formData.get("sexes") || "")),
    levels: splitList(String(formData.get("levels") || "")),
    sports: splitList(String(formData.get("sports") || "")),
    min_age: optionalNumber(formData.get("minAge")),
    max_age: optionalNumber(formData.get("maxAge"))
  });

  if (status === "published") {
    await notifyPublicationTargets(supabase, authData.user.id, content.id, content.title);
  }

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: `content.${status}`,
    entity_id: content.id,
    summary: content.title
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function createPublicationStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await createPublicationAction(formData);
    const intent = String(formData.get("intent") || "draft");
    return {
      status: "success",
      message: intent === "publish"
        ? "Contenu publié."
        : intent === "schedule"
          ? "Publication programmée."
          : "Brouillon enregistré."
    };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateAssessmentStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await updateAssessmentAction(formData);
    return { status: "success", message: "Bilan enregistré et objectifs recalculés." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function assignWorkoutStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await assignWorkoutAction(formData);
    return { status: "success", message: "Séance attribuée au client." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateWorkoutStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);

    const workoutId = String(formData.get("workoutId") || "");
    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .select("*")
      .eq("id", workoutId)
      .eq("coach_id", authData.user.id)
      .single();
    if (workoutError || !workout) throw new Error("Séance introuvable.");
    await requireCoachClient(supabase, authData.user.id, workout.client_id);

    const update = {
      title: String(formData.get("title") || workout.title),
      focus: String(formData.get("focus") || ""),
      scheduled_for: String(formData.get("scheduledFor") || workout.scheduled_for),
      duration_minutes: boundedInteger(formData.get("durationMinutes"), "Durée", 10, 240),
      exercises: splitList(String(formData.get("exercises") || "")),
      notes: String(formData.get("notes") || ""),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase
      .from("workouts")
      .update(update)
      .eq("id", workoutId)
      .eq("coach_id", authData.user.id);
    if (error) throw error;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: workout.client_id,
      action: "workout.updated",
      entity_id: workoutId,
      summary: update.title,
      before_data: workout,
      after_data: update
    });
    revalidatePath("/coach");
    revalidatePath("/client");
    return { status: "success", message: "Séance modifiée." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateNutritionStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    await updateNutritionAction(formData);
    return { status: "success", message: "Objectifs nutritionnels enregistrés." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function markNotificationReadStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);

    const notificationId = String(formData.get("notificationId") || "");
    const { data: notification, error: readError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("coach_id", authData.user.id)
      .single();
    if (readError || !notification) throw new Error("Alerte introuvable.");
    if (notification.client_id) await requireCoachClient(supabase, authData.user.id, notification.client_id);

    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ status: "read", read_at: readAt })
      .eq("id", notificationId)
      .eq("coach_id", authData.user.id);
    if (error) throw error;
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: notification.client_id,
      action: "notification.read",
      entity_id: notificationId,
      after_data: { status: "read", read_at: readAt }
    });
    revalidatePath("/coach");
    return { status: "success", message: "Alerte marquée comme traitée." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function markAllNotificationsReadStateAction(_previous: UiActionState, _formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);

    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ status: "read", read_at: readAt })
      .eq("coach_id", authData.user.id)
      .neq("status", "read");
    if (error) throw error;
    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      action: "notifications.read_all",
      after_data: { status: "read", read_at: readAt }
    });
    revalidatePath("/coach");
    return { status: "success", message: "Toutes les alertes ont été marquées comme traitées." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function markClientMessagesReadStateAction(_previous: UiActionState, formData: FormData): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireCoach(supabase, authData.user.id);
    const clientId = String(formData.get("clientId") || "");
    await requireCoachClient(supabase, authData.user.id, clientId);

    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", clientId)
      .eq("recipient_id", authData.user.id)
      .is("read_at", null);
    if (error) throw error;
    revalidatePath("/coach");
    return { status: "success", message: "Les messages de ce client sont marqués comme lus." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function archivePublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const contentId = String(formData.get("contentId"));
  await supabase.from("contents").update({
    status: "archived",
    updated_at: new Date().toISOString()
  }).eq("id", contentId).eq("coach_id", authData.user.id);

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "content.archived",
    entity_id: contentId
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function deletePublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const contentId = String(formData.get("contentId"));
  await supabase.from("contents").delete().eq("id", contentId).eq("coach_id", authData.user.id);

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "content.deleted",
    entity_id: contentId
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function duplicatePublicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const contentId = String(formData.get("contentId"));
  const { data: source, error } = await supabase
    .from("contents")
    .select("*")
    .eq("id", contentId)
    .eq("coach_id", authData.user.id)
    .single();
  if (error || !source) throw new Error(error?.message || "Publication source introuvable.");

  const { data: copy, error: copyError } = await supabase.from("contents").insert({
    coach_id: authData.user.id,
    type: source.type,
    title: `${source.title} - copie`,
    status: "draft",
    payload: source.payload,
    publish_at: null,
    ends_at: null
  }).select("*").single();
  if (copyError || !copy) throw new Error(copyError?.message || "Duplication impossible.");

  const { data: targets } = await supabase.from("publication_targets").select("*").eq("content_id", contentId);
  for (const target of targets || []) {
    await supabase.from("publication_targets").insert({
      content_id: copy.id,
      mode: target.mode,
      client_ids: target.client_ids,
      formulas: target.formulas,
      goals: target.goals,
      sexes: target.sexes,
      levels: target.levels,
      sports: target.sports,
      min_age: target.min_age,
      max_age: target.max_age
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "content.duplicated",
    entity_id: copy.id,
    summary: source.title
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function optionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function requiredNumber(formData: FormData, key: string, label: string) {
  const value = Number(formData.get(key) || 0);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} doit etre un nombre positif.`);
  }
  return value;
}

function mealPayloadFromForm(formData: FormData, clientId: string) {
  const description = String(formData.get("description") || "").trim();
  if (!description) throw new Error("La description du repas est obligatoire.");
  return {
    client_id: clientId,
    meal_date: todayIso(),
    meal_name: String(formData.get("mealName") || "Repas").trim() || "Repas",
    description,
    quantity: String(formData.get("quantity") || "").trim(),
    calories: boundedNumber(formData.get("calories"), "Calories", 0, 10000),
    protein: boundedNumber(formData.get("protein"), "Protéines", 0, 1000),
    carbs: boundedNumber(formData.get("carbs"), "Glucides", 0, 2000),
    fat: boundedNumber(formData.get("fat"), "Lipides", 0, 1000),
    source: String(formData.get("source") || "manual") === "ai_estimate" ? "ai_estimate" : "manual"
  };
}

async function upsertWeeklyCheckin(formData: FormData, status: "draft" | "submitted"): Promise<UiActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/login");
    await requireClient(supabase, authData.user.id);

    const weekStart = String(formData.get("weekStart") || currentWeekStartIso());
    const { data: currentCheckin, error: currentError } = await supabase
      .from("weekly_checkins")
      .select("id,photos,status")
      .eq("client_id", authData.user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (currentError) throw currentError;
    if (currentCheckin && currentCheckin.status !== "draft") {
      throw new Error("Ce bilan a déjà été transmis. Il ne peut plus être modifié.");
    }

    const basePayload = {
      client_id: authData.user.id,
      week_start: weekStart,
      status: "draft",
      energy: boundedInteger(formData.get("energy"), "Energie", 1, 10),
      motivation: String(formData.get("motivation") || ""),
      stress: boundedInteger(formData.get("stress"), "Stress", 1, 10),
      sleep_hours: boundedNumber(formData.get("sleepHours"), "Heures de sommeil", 0, 16),
      sleep_quality: String(formData.get("sleepQuality") || ""),
      nap: String(formData.get("nap") || ""),
      average_hydration: requiredNumber(formData, "averageHydration", "Hydratation moyenne"),
      weight_kg: optionalNumber(formData.get("weightKg")),
      pain: String(formData.get("pain") || ""),
      pain_location: String(formData.get("painLocation") || ""),
      training_rpe: boundedInteger(formData.get("trainingRpe"), "RPE", 1, 10),
      training_feeling: String(formData.get("trainingFeeling") || ""),
      nutrition_adherence: boundedInteger(formData.get("nutritionAdherence"), "Adherence nutritionnelle", 1, 10),
      weekly_win: String(formData.get("weeklyWin") || ""),
      measurements: {
        waist: String(formData.get("waist") || ""),
        chest: String(formData.get("chest") || ""),
        hip: String(formData.get("hip") || ""),
        other: String(formData.get("measurements") || "")
      }
    };

    const { data: savedCheckin, error: saveError } = await supabase
      .from("weekly_checkins")
      .upsert(basePayload, { onConflict: "client_id,week_start" })
      .select("id,photos,status")
      .single();
    if (saveError || !savedCheckin) throw saveError || new Error("Bilan introuvable après enregistrement.");

    const existingPhotos = Array.isArray(savedCheckin.photos) ? savedCheckin.photos : [];
    const uploadedPhotos = await uploadWeeklyCheckinPhotos(supabase, formData, authData.user.id, savedCheckin.id);
    const photos = [...existingPhotos, ...uploadedPhotos];
    const { error: updateError } = await supabase
      .from("weekly_checkins")
      .update({
        ...basePayload,
        status,
        photos
      })
      .eq("id", savedCheckin.id)
      .eq("client_id", authData.user.id);
    if (updateError) throw updateError;

    const privateJournalBody = String(formData.get("privateJournal") || "").trim();
    const visibleToCoach = formData.get("sharePrivateJournal") === "on";
    const { error: journalError } = await supabase
      .from("weekly_private_journals")
      .upsert({
        client_id: authData.user.id,
        week_start: weekStart,
        body: privateJournalBody,
        visible_to_coach: visibleToCoach
      }, { onConflict: "client_id,week_start" });
    if (journalError) throw journalError;

    await insertAuditSafe(supabase, {
      actor_id: authData.user.id,
      client_id: authData.user.id,
      action: status === "submitted" ? "weekly_checkin.submitted" : "weekly_checkin.draft_saved",
      entity_id: savedCheckin.id,
      summary: weekStart,
      after_data: {
        ...basePayload,
        status,
        photos_count: photos.length,
        journal_visible_to_coach: visibleToCoach
      }
    });

    revalidatePath("/client");
    revalidatePath("/coach");
    return {
      status: "success",
      message: status === "submitted" ? "Bilan transmis au coach." : "Brouillon de bilan enregistre."
    };
  } catch (error) {
    return { status: "error", message: tableAwareError(error, "weekly_checkins") };
  }
}

export async function markWeeklyCheckinViewedAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const checkinId = String(formData.get("checkinId") || "");
  const { data: checkin, error } = await supabase
    .from("weekly_checkins")
    .select("id,client_id,status")
    .eq("id", checkinId)
    .single();
  if (error || !checkin) throw new Error(error?.message || "Bilan introuvable.");
  await requireCoachClient(supabase, authData.user.id, checkin.client_id);

  const { error: updateError } = await supabase
    .from("weekly_checkins")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", checkin.id);
  if (updateError) throw updateError;

  await insertAuditSafe(supabase, {
    actor_id: authData.user.id,
    client_id: checkin.client_id,
    action: "weekly_checkin.viewed",
    entity_id: checkin.id,
    summary: "Bilan consulte par le coach"
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

export async function lockWeeklyCheckinAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  await requireCoach(supabase, authData.user.id);

  const checkinId = String(formData.get("checkinId") || "");
  const { data: checkin, error } = await supabase
    .from("weekly_checkins")
    .select("id,client_id,status")
    .eq("id", checkinId)
    .single();
  if (error || !checkin) throw new Error(error?.message || "Bilan introuvable.");
  await requireCoachClient(supabase, authData.user.id, checkin.client_id);

  const { error: updateError } = await supabase
    .from("weekly_checkins")
    .update({ status: "locked", viewed_at: new Date().toISOString() })
    .eq("id", checkin.id);
  if (updateError) throw updateError;

  await insertAuditSafe(supabase, {
    actor_id: authData.user.id,
    client_id: checkin.client_id,
    action: "weekly_checkin.locked",
    entity_id: checkin.id,
    summary: "Bilan verrouille"
  });

  revalidatePath("/coach");
  revalidatePath("/client");
}

function boundedInteger(value: FormDataEntryValue | null, label: string, min: number, max: number) {
  const parsed = Number(value || 0);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} doit etre entre ${min} et ${max}.`);
  }
  return parsed;
}

function boundedNumber(value: FormDataEntryValue | null, label: string, min: number, max: number) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} doit etre entre ${min} et ${max}.`);
  }
  return parsed;
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function currentWeekStartIso() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeWorkoutFeedback(value: any) {
  const feedback = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const structured = feedback.reboot_session_v1 && typeof feedback.reboot_session_v1 === "object" && !Array.isArray(feedback.reboot_session_v1)
    ? feedback.reboot_session_v1
    : {};
  const structuredSets = Array.isArray(structured.completed_sets)
    ? structured.completed_sets
        .filter((set: any) => Number.isInteger(set?.exercise_index) && Number.isInteger(set?.set_index))
        .map((set: any) => ({
          exercise_index: set.exercise_index,
          set_index: set.set_index,
          completed_at: typeof set.completed_at === "string" ? set.completed_at : null
        }))
    : [];
  const legacySets = Array.isArray(feedback.completed_sets) ? feedback.completed_sets.map(String) : [];
  const completedSets = Array.from(new Set([
    ...legacySets,
    ...structuredSets.map((set: any) => `${set.exercise_index}:${set.set_index}`)
  ]));
  return {
    ...feedback,
    completed_sets: completedSets,
    reboot_session_v1: {
      ...structured,
      completed_sets: structuredSets
    }
  };
}

function extractResponseText(payload: any) {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

async function uploadWeeklyCheckinPhotos(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  formData: FormData,
  clientId: string,
  checkinId: string
) {
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return [];
  const uploaded = [];
  for (const file of files.slice(0, 6)) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Les photos doivent être au format JPG, PNG ou WebP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Chaque photo doit peser moins de 5 Mo.");
    }
    const extension = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${clientId}/${checkinId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("reboot-weekly-photos")
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });
    if (error) throw new Error("Le stockage prive des photos n'est pas encore pret. Le bilan n'a pas ete enregistre.");
    uploaded.push({
      path,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString()
    });
  }
  return uploaded;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action impossible pour le moment.";
}

function tableAwareError(error: unknown, tableName: string) {
  const message = errorMessage(error);
  if (message.includes(tableName) || message.toLowerCase().includes("schema cache") || message.toLowerCase().includes("relation")) {
    return "Cette action sera disponible après la mise à jour des données. Rien n’a été enregistré pour le moment.";
  }
  return message;
}

async function insertAuditSafe(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  payload: Record<string, any>
) {
  await supabase.from("audit_logs").insert(payload);
}

async function notifyPublicationTargets(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  contentId: string,
  title: string
) {
  const { data: targets } = await supabase.from("publication_targets").select("*").eq("content_id", contentId);
  const { data: relations } = await supabase.from("coach_client_relations").select("client_id").eq("coach_id", coachId);
  const clientIds = (relations || []).map((item) => item.client_id);
  if (!clientIds.length) return;

  const { data: assessments } = await supabase.from("client_assessments").select("*").in("client_id", clientIds);
  const recipients = new Set<string>();

  for (const target of targets || []) {
    for (const assessment of assessments || []) {
      if (targetMatchesAssessment(target, assessment)) {
        recipients.add(assessment.client_id);
      }
    }
  }

  for (const clientId of recipients) {
    await supabase.from("notifications").insert({
      coach_id: coachId,
      client_id: clientId,
      level: "information",
      title: `Nouvelle publication: ${title}`,
      status: "unread"
    });
  }
}

function targetMatchesAssessment(target: any, assessment: any) {
  if (target.mode === "manual") return (target.client_ids || []).includes(assessment.client_id);
  if (target.mode === "all") return true;

  return matchesArray(target.client_ids, assessment.client_id)
    && matchesArray(target.formulas, assessment.formula)
    && matchesArray(target.goals, assessment.goal)
    && matchesArray(target.sexes, assessment.sex)
    && matchesArray(target.levels, assessment.level)
    && matchesArray(target.sports, assessment.sport)
    && (!target.min_age || assessment.age >= target.min_age)
    && (!target.max_age || assessment.age <= target.max_age);
}

function matchesArray(values: string[] | null, value: string) {
  return !values?.length || values.includes(value);
}

async function createDeterministicAiAnalysis(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  clientId: string
) {
  const [profileResult, assessmentResult, nutritionResult, workoutsResult, measurementsResult, messagesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", clientId).single(),
    supabase.from("client_assessments").select("*").eq("client_id", clientId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("nutrition_targets").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("workouts").select("*").eq("client_id", clientId).order("scheduled_for", { ascending: false }).limit(8),
    supabase.from("measurements").select("*").eq("client_id", clientId).order("measured_at", { ascending: false }).limit(4),
    supabase.from("messages").select("*").or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`).order("created_at", { ascending: false }).limit(5)
  ]);

  const client = profileResult.data;
  const assessment = assessmentResult.data;
  const nutrition = nutritionResult.data;
  const workouts = workoutsResult.data || [];
  const measurements = measurementsResult.data || [];
  const messages = messagesResult.data || [];

  if (!client || !assessment || !nutrition) {
    throw new Error("Donnees client insuffisantes pour analyser.");
  }

  const completed = workouts.filter((workout: any) => workout.status === "completed").length;
  const missed = workouts.filter((workout: any) => workout.status === "missed").length;
  const hasPain = [...(assessment.pain || []), ...(assessment.injuries || [])].length > 0;
  const adherence = workouts.length ? Math.round((completed / workouts.length) * 100) : 0;
  const priority = hasPain || missed >= 2 ? "high" : adherence < 50 ? "medium" : "low";
  const mode = process.env.OPENAI_API_KEY && process.env.AI_DEMO_MODE !== "true" ? "api" : "demo";
  const targetCalories = assessment.formula === "perte"
    ? Math.max(1300, Math.round(Number(assessment.weight_kg || 70) * 27))
    : assessment.formula === "masse"
      ? Math.round(Number(assessment.weight_kg || 70) * 39)
      : Math.round(Number(assessment.weight_kg || 70) * 32);
  const nextNutrition = {
    calories: targetCalories,
    protein: Math.round(Number(assessment.weight_kg || 70) * 1.9),
    carbs: Math.max(90, Math.round((targetCalories - Math.round(Number(assessment.weight_kg || 70) * 1.9) * 4 - Math.round(Number(assessment.weight_kg || 70) * 0.8) * 9) / 4)),
    fat: Math.round(Number(assessment.weight_kg || 70) * 0.8),
    water_liters: Number((Number(assessment.weight_kg || 70) * 0.035).toFixed(1))
  };

  const dataUsed = {
    profile: { id: client.id, first_name: client.first_name, role: client.role },
    assessment: {
      age: assessment.age,
      sex: assessment.sex,
      formula: assessment.formula,
      goal: assessment.goal,
      level: assessment.level,
      sport: assessment.sport,
      injuries: assessment.injuries,
      pain: assessment.pain
    },
    nutrition,
    workouts: workouts.map((workout: any) => ({ id: workout.id, title: workout.title, status: workout.status, scheduled_for: workout.scheduled_for })),
    measurements,
    messages_count: messages.length,
    adherence
  };

  const { data: analysis, error: analysisError } = await supabase.from("ai_analyses").insert({
    coach_id: coachId,
    client_id: clientId,
    scope: "single_client",
    mode,
    status: "completed",
    summary: `${client.first_name}: ${priority === "high" ? "attention prioritaire" : "suivi stable"} - adherence ${adherence}%.`,
    priority,
    data_used: dataUsed,
    signals: [
      hasPain ? "douleur_ou_blessure" : "aucune_douleur_majeure",
      missed >= 2 ? "seances_manquees" : "rythme_correct",
      `formule_${assessment.formula}`
    ]
  }).select("*").single();
  if (analysisError || !analysis) throw new Error(analysisError?.message || "Analyse non créée.");

  const recommendations: any[] = [
    {
      analysis_id: analysis.id,
      coach_id: coachId,
      client_id: clientId,
      type: "nutrition",
      status: "pending",
      priority,
      confidence: mode === "api" ? 0.82 : 0.72,
      problem: nutrition.calories !== nextNutrition.calories ? "Macros a recalibrer selon le bilan" : "Macros coherentes, hydratation a confirmer",
      current_state: nutrition,
      proposed_change: nextNutrition,
      justification: `Calcul base sur poids, formule ${assessment.formula}, objectif et adherence recente.`,
      expected_benefit: "Aligner les apports avec la progression attendue cette semaine.",
      risks: hasPain ? ["Surveiller fatigue et douleurs avant deficit agressif"] : [],
      requires_client_visibility: true
    },
    {
      analysis_id: analysis.id,
      coach_id: coachId,
      client_id: clientId,
      type: "training",
      status: "pending",
      priority: hasPain ? "high" : "medium",
      confidence: mode === "api" ? 0.78 : 0.68,
      problem: hasPain ? "Douleur ou blessure signalee" : "Optimisation de la charge hebdomadaire",
      current_state: { workouts, adherence },
      proposed_change: {
        title: hasPain ? "Seance adaptee douleur IA" : "Seance progression IA",
        focus: hasPain ? "recuperation active" : "progression controlee",
        scheduled_for: new Date().toISOString().slice(0, 10),
        duration_minutes: hasPain ? 35 : 50,
        exercises: hasPain ? ["Mobilite hanches", "Goblet squat leger", "Rowing elastique"] : ["Squat", "Developpe couche", "Rowing barre"],
        notes: hasPain ? "RPE cible 6, aucun mouvement douloureux." : "Progression prudente, repos strict.",
        deload: hasPain,
        rest_days: hasPain ? 2 : 1,
        intensity: hasPain ? "moderee" : "progressive",
        training_details: {
          sets: hasPain ? 3 : 4,
          reps: hasPain ? "10-12" : "6-8",
          load: hasPain ? "60% charge habituelle" : "+2,5% si RPE <= 8",
          rest_seconds: hasPain ? 75 : 120,
          rpe_target: hasPain ? 6 : 8,
          replacement_exercise: hasPain ? "Remplacer tout exercice douloureux" : null
        }
      },
      justification: "Adaptation préparée depuis les séances, douleurs et données d’assiduité récentes.",
      expected_benefit: hasPain ? "Reduire le risque blessure sans arreter le suivi." : "Maintenir la progression sans surcharge.",
      risks: hasPain ? ["Ne pas publier sans validation coach"] : [],
      requires_client_visibility: true
    }
  ];

  for (const recommendation of recommendations) {
    await supabase.from("ai_recommendations").insert(recommendation);
  }

  await supabase.from("ai_usage_logs").insert({
    coach_id: coachId,
    client_id: clientId,
    mode,
    action: "analysis.created",
    status: "success",
    tokens_input: JSON.stringify(dataUsed).length,
    tokens_output: JSON.stringify(recommendations).length
  });

  await supabase.from("audit_logs").insert({
    actor_id: coachId,
    client_id: clientId,
    action: "ai.analysis.created",
    entity_id: analysis.id,
    summary: analysis.summary,
    after_data: { mode, recommendations: recommendations.length }
  });

  return analysis;
}

function parseJsonObject(value: string) {
  if (!value.trim()) return null;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("La modification structurée n’est pas valide.");
  }
  return parsed;
}

async function requireCoachClient(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  clientId: string
) {
  const { data } = await supabase
    .from("coach_client_relations")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data) {
    throw new Error("Client non rattache a ce coach.");
  }
}

async function getProfileForUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data;
}

async function requireCoach(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const profile = await getProfileForUser(supabase, userId);
  if (profile?.role !== "coach") {
    redirect("/client");
  }
}

async function requireClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const profile = await getProfileForUser(supabase, userId);
  if (profile?.role !== "client") {
    redirect("/coach");
  }
}
