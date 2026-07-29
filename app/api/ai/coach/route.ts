import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

const requestSchema = z.object({
  clientId: z.string().uuid(),
  intent: z.enum(["analyze", "nutrition", "training", "risks"]).default("analyze")
});

const recommendationSchema = z.object({
  type: z.enum(["training", "nutrition", "follow_up", "message", "publication", "alert"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  confidence: z.number().min(0).max(1),
  problem: z.string().min(3),
  current_state: z.record(z.string(), z.unknown()),
  proposed_change: z.record(z.string(), z.unknown()),
  justification: z.string().min(3),
  expected_benefit: z.string(),
  risks: z.array(z.string()).default([]),
  requires_client_visibility: z.boolean().default(true)
});

const aiResponseSchema = z.object({
  summary: z.string().min(3),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  signals: z.array(z.string()),
  recommendations: z.array(recommendationSchema).min(1).max(4)
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Reserve au coach." }, { status: 403 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 4000) {
    return NextResponse.json({ error: "Requete trop volumineuse." }, { status: 413 });
  }

  const parsed = requestSchema.safeParse(JSON.parse(rawBody || "{}"));
  if (!parsed.success) {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  }

  const recentUsage = await supabase
    .from("ai_usage_logs")
    .select("id")
    .eq("coach_id", authData.user.id)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());

  if ((recentUsage.data || []).length >= 12) {
    await supabase.from("ai_usage_logs").insert({
      coach_id: authData.user.id,
      client_id: parsed.data.clientId,
      mode: aiMode(),
      action: "api.rate_limited",
      status: "rate_limited"
    });
    return NextResponse.json({ error: "Trop de requetes IA, reessayez dans une minute." }, { status: 429 });
  }

  const relation = await supabase
    .from("coach_client_relations")
    .select("client_id")
    .eq("coach_id", authData.user.id)
    .eq("client_id", parsed.data.clientId)
    .maybeSingle();

  if (!relation.data) {
    return NextResponse.json({ error: "Client non rattache a ce coach." }, { status: 403 });
  }

  const [client, assessment, nutrition, workouts] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name").eq("id", parsed.data.clientId).single(),
    supabase.from("client_assessments").select("*").eq("client_id", parsed.data.clientId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("nutrition_targets").select("*").eq("client_id", parsed.data.clientId).maybeSingle(),
    supabase.from("workouts").select("*").eq("client_id", parsed.data.clientId).order("scheduled_for", { ascending: false }).limit(8)
  ]);

  if (!client.data || !assessment.data || !nutrition.data) {
    return NextResponse.json({ error: "Donnees client insuffisantes." }, { status: 422 });
  }

  const aiResult = aiResponseSchema.parse(buildDemoAiResponse({
    client: client.data,
    assessment: assessment.data,
    nutrition: nutrition.data,
    workouts: workouts.data || []
  }));

  const { data: analysis, error: analysisError } = await supabase.from("ai_analyses").insert({
    coach_id: authData.user.id,
    client_id: parsed.data.clientId,
    scope: "single_client",
    mode: aiMode(),
    status: "completed",
    summary: aiResult.summary,
    priority: aiResult.priority,
    data_used: {
      client: client.data,
      assessment: assessment.data,
      nutrition: nutrition.data,
      workouts: workouts.data || []
    },
    signals: aiResult.signals
  }).select("*").single();

  if (analysisError || !analysis) {
    return NextResponse.json({ error: "Analyse non enregistree." }, { status: 500 });
  }

  for (const recommendation of aiResult.recommendations) {
    await supabase.from("ai_recommendations").insert({
      analysis_id: analysis.id,
      coach_id: authData.user.id,
      client_id: parsed.data.clientId,
      status: "pending",
      ...recommendation
    });
  }

  await supabase.from("ai_usage_logs").insert({
    coach_id: authData.user.id,
    client_id: parsed.data.clientId,
    mode: aiMode(),
    action: `api.${parsed.data.intent}`,
    status: "success",
    tokens_input: rawBody.length,
    tokens_output: JSON.stringify(aiResult).length
  });

  return NextResponse.json({
    mode: aiMode(),
    demo: aiMode() === "demo",
    analysisId: analysis.id,
    summary: aiResult.summary,
    recommendations: aiResult.recommendations.length
  });
}

function aiMode() {
  return process.env.OPENAI_API_KEY && process.env.AI_DEMO_MODE !== "true" ? "api" : "demo";
}

function buildDemoAiResponse({ client, assessment, nutrition, workouts }: any) {
  const hasPain = [...(assessment.pain || []), ...(assessment.injuries || [])].length > 0;
  const missed = workouts.filter((workout: any) => workout.status === "missed").length;
  const priority = hasPain || missed >= 2 ? "high" : "medium";
  const weight = Number(assessment.weight_kg || 70);
  const calories = assessment.formula === "perte" ? Math.round(weight * 27) : assessment.formula === "masse" ? Math.round(weight * 39) : Math.round(weight * 32);
  const protein = Math.round(weight * 1.9);
  const fat = Math.round(weight * 0.8);

  return {
    summary: `${client.first_name} : analyse structurée du bilan, de la nutrition et des dernières séances.`,
    priority,
    signals: [assessment.formula, hasPain ? "douleur" : "pas_de_douleur_majeure", missed ? "seances_manquees" : "suivi_actif"],
    recommendations: [
      {
        type: "nutrition",
        priority,
        confidence: 0.72,
        problem: "Ajustement nutrition hebdomadaire a valider",
        current_state: nutrition,
        proposed_change: {
          calories,
          protein,
          carbs: Math.max(90, Math.round((calories - protein * 4 - fat * 9) / 4)),
          fat,
          water_liters: Number((weight * 0.035).toFixed(1))
        },
        justification: "Proposition calculée à partir du bilan, de l'objectif actuel et du poids renseigné.",
        expected_benefit: "Obtenir une cible nutrition coherente avec l'objectif actuel.",
        risks: hasPain ? ["Surveiller fatigue et douleurs"] : [],
        requires_client_visibility: true
      }
    ]
  };
}
