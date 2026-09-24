import { unvalidatedIntegrationResponse } from "../_shared/staging-isolation.ts";
// Internal endpoint called by DB triggers (or app code) to dispatch
// WhatsApp templates for appointment lifecycle events.
// Body: { appointment_id: string, event: "created"|"rescheduled"|"cancelled"|"started" }
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.facebook.com/v21.0";

const TEMPLATE_BY_EVENT: Record<string, string> = {
  created: "appointment_created",
  rescheduled: "appointment_rescheduled",
  cancelled: "appointment_cancelled",
  started: "session_started",
  reminder_24h: "appointment_reminder_24h",
  reminder_1h: "appointment_reminder_1h",
};

function sanitizePhone(p: string): string {
  let d = (p || "").replace(/\D+/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return { date, time };
}

serve(async (req) => {
  const migrationPause = unvalidatedIntegrationResponse(req);
  if (migrationPause) return migrationPause;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Accept internal secret (DB trigger / cron) OR authenticated caller who
  // owns the appointment. Never allow arbitrary authenticated users.
  const rawToken = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
    || req.headers.get("x-internal-secret");
  const internalAllowed = new Set(
    [
      SERVICE_KEY,
      Deno.env.get("INTERNAL_FUNCTION_SECRET"),
      Deno.env.get("CRON_SECRET"),
    ].filter(Boolean) as string[],
  );
  const isInternal = !!rawToken && internalAllowed.has(rawToken);

  let callerUserId: string | null = null;
  if (!isInternal) {
    if (!rawToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const authClient = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${rawToken}` } } },
      );
      const { data: u } = await authClient.auth.getUser();
      if (!u?.user) throw new Error("unauth");
      callerUserId = u.user.id;
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);


  const { data: cfg } = await supabase.from("whatsapp_config").select("phone_number_id, access_token, is_active").maybeSingle();
  const PHONE_NUMBER_ID = (cfg?.phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "").trim();
  const ACCESS_TOKEN = (cfg?.access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "").trim();

  if (cfg?.is_active === false) {
    return new Response(JSON.stringify({ skipped: "disabled by admin" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "WhatsApp credentials missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { appointment_id?: string; event?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { appointment_id, event } = body;
  if (!appointment_id || !event || !TEMPLATE_BY_EVENT[event]) {
    return new Response(JSON.stringify({ error: "appointment_id and valid event required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // supabase client already created above

  const { data: apt, error: aptErr } = await supabase
    .from("appointments")
    .select("id, psychologist_id, patient_id, scheduled_at, duration_minutes, type, status, patients(full_name, whatsapp_phone, phone, preferred_notification_channel)")
    .eq("id", appointment_id)
    .maybeSingle();

  if (aptErr || !apt) {
    return new Response(JSON.stringify({ error: "appointment not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ownership: non-internal callers must own this appointment.
  if (!isInternal && callerUserId && apt.psychologist_id !== callerUserId) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const patient: any = apt.patients;
  if (!patient) {
    return new Response(JSON.stringify({ skipped: "no patient" }), { status: 200, headers: corsHeaders });
  }

  const channel = patient.preferred_notification_channel || "email";
  if (channel !== "whatsapp" && channel !== "both") {
    return new Response(JSON.stringify({ skipped: "channel disabled" }), { status: 200, headers: corsHeaders });
  }

  const rawPhone = patient.whatsapp_phone || patient.phone;
  const phone = sanitizePhone(rawPhone || "");
  if (!phone || phone.length < 8) {
    return new Response(JSON.stringify({ skipped: "no valid phone" }), { status: 200, headers: corsHeaders });
  }

  const { date, time } = fmtDateTime(apt.scheduled_at);
  const firstName = (patient.full_name || "").split(" ")[0] || "paciente";
  const variables = [firstName, date, time, String(apt.duration_minutes || 50)];
  const templateName = TEMPLATE_BY_EVENT[event];

  const waPayload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "pt_BR" },
      components: [{ type: "body", parameters: variables.map((t) => ({ type: "text", text: t })) }],
    },
  };

  // log row
  const { data: logRow } = await supabase.from("whatsapp_logs").insert({
    psychologist_id: apt.psychologist_id,
    patient_id: apt.patient_id,
    appointment_id: apt.id,
    phone,
    template: templateName,
    message_type: "template",
    body_preview: variables.join(" | "),
    status: "sending",
    payload: waPayload,
  }).select().single();

  let attempts = 0;
  let last: any = null;
  while (attempts < 3) {
    attempts++;
    const res = await fetch(`${GRAPH}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(waPayload),
    });
    const json = await res.json().catch(() => ({}));
    last = { ok: res.ok, status: res.status, json };
    if (last.ok) break;
    if (last.status < 500 && last.status !== 429) break;
    await new Promise((r) => setTimeout(r, 400 * attempts));
  }

  const waId = last?.json?.messages?.[0]?.id || null;
  const status = last.ok ? "sent" : "failed";
  const error = last.ok ? null : (last.json?.error?.message || `HTTP ${last.status}`);

  if (logRow?.id) {
    await supabase.from("whatsapp_logs").update({
      status, wa_message_id: waId, error, response: last.json,
      attempts, sent_at: last.ok ? new Date().toISOString() : null,
    }).eq("id", logRow.id);
  }

  return new Response(JSON.stringify({ success: last.ok, wa_message_id: waId, error }), {
    status: last.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
