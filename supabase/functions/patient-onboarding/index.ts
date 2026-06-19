// Public edge function — paciente completa o próprio cadastro via token seguro
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = "patient-documents";

async function ensureBucket() {
  try {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (!data) {
      await supabase.storage.createBucket(BUCKET, { public: false });
    }
  } catch {
    try { await supabase.storage.createBucket(BUCKET, { public: false }); } catch {}
  }
}

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

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");
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

    // Upload de documento via base64 (contorna RLS do storage de forma segura — só com token válido)
    if (req.method === "POST" && action === "upload") {
      await ensureBucket();
      const body = await req.json();
      const { filename, content_type, data: b64 } = body || {};
      if (!filename || !b64) return json({ error: "filename e data são obrigatórios" }, 400);

      const bytes = base64ToBytes(b64);
      const MAX = 10 * 1024 * 1024; // 10MB
      if (bytes.byteLength > MAX) return json({ error: "Arquivo excede 10MB" }, 413);

      const safeName = String(filename).replace(/[^\w.\-]+/g, "_");
      const path = `${v.row.patient_id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: content_type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true, path, name: filename, type: content_type || "application/octet-stream" });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { documents, ...patientData } = body;
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || req.headers.get("cf-connecting-ip")
        || req.headers.get("x-real-ip")
        || null;

      const { error: upErr } = await supabase
        .from("patients")
        .update({
          ...patientData,
          signature_ip: ip,
          uploaded_documents: documents || [],
          onboarding_status: "review",
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", v.row.patient_id);
      if (upErr) throw upErr;

      await supabase
        .from("patient_onboarding_tokens")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", v.row.id);

      // Notificação in-app
      const { data: notif } = await supabase.from("notifications").insert({
        user_id: v.row.psychologist_id,
        type: "patient_onboarding",
        title: "Paciente concluiu o cadastro",
        message: `${patientData.full_name || "Paciente"} preencheu o formulário e aguarda revisão.`,
        action_path: `/pacientes/${v.row.patient_id}`,
        action_label: "Revisar informações",
      }).select("id").maybeSingle();

      // Push real para o celular do psicólogo (best-effort, não bloqueia resposta)
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({
            user_ids: [v.row.psychologist_id],
            title: "Paciente concluiu o cadastro",
            body: `${patientData.full_name || "Paciente"} preencheu o formulário e aguarda revisão.`,
            url: `/pacientes/${v.row.patient_id}`,
            tag: "patient_onboarding",
            category: "patient_onboarding",
            notification_id: notif?.id,
          }),
        });
      } catch (e) {
        console.warn("[patient-onboarding] push falhou:", e);
      }

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
