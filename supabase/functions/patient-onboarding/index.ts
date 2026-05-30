// Public edge function — paciente completa o próprio cadastro via token seguro
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function getValidToken(token: string) {
  const { data, error } = await supabase
    .from("patient_onboarding_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return { error: "Token inválido", code: 404 };
  if (data.status !== "pending") return { error: "Token já utilizado ou revogado", code: 410 };
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("patient_onboarding_tokens").update({ status: "expired" }).eq("id", data.id);
    return { error: "Token expirado", code: 410 };
  }
  return { row: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "token requerido" }, 400);

    const v = await getValidToken(token);
    if ("error" in v) return json({ error: v.error }, v.code);

    if (req.method === "GET") {
      const { data: patient } = await supabase
        .from("patients")
        .select("id, full_name, email, phone, onboarding_status")
        .eq("id", v.row.patient_id)
        .maybeSingle();
      return json({ patient, expires_at: v.row.expires_at });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { documents, ...patientData } = body;

      // Update patient
      const { error: upErr } = await supabase
        .from("patients")
        .update({
          ...patientData,
          uploaded_documents: documents || [],
          onboarding_status: "review",
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", v.row.patient_id);
      if (upErr) throw upErr;

      // Mark token used
      await supabase
        .from("patient_onboarding_tokens")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", v.row.id);

      // Notify psychologist
      await supabase.from("notifications").insert({
        user_id: v.row.psychologist_id,
        type: "patient_onboarding",
        title: "Paciente concluiu o cadastro",
        message: `${patientData.full_name || "Paciente"} preencheu o formulário e aguarda revisão.`,
        action_path: `/pacientes/${v.row.patient_id}`,
        action_label: "Revisar informações",
      });

      return json({ ok: true });
    }

    return json({ error: "método não suportado" }, 405);
  } catch (e: any) {
    console.error("[patient-onboarding]", e);
    return json({ error: e?.message || "erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
