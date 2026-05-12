// WhatsApp Cloud API (Meta) - sender
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.facebook.com/v21.0";

interface SendBody {
  to: string; // E.164 (digits only OK; we sanitize)
  patient_id?: string;
  appointment_id?: string;
  // Either template OR text
  template?: { name: string; language?: string; variables?: string[] };
  text?: string;
}

function sanitizePhone(p: string): string {
  return (p || "").replace(/\D+/g, "");
}

async function sendOnce(payload: any, accessToken: string, phoneNumberId: string) {
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "WhatsApp credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: extract caller (psychologist) from JWT
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userData } = await supabase.auth.getUser(token);
  const psychologistId = userData?.user?.id;
  if (!psychologistId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: SendBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phone = sanitizePhone(body.to);
  if (!phone || phone.length < 8) {
    return new Response(JSON.stringify({ error: "Invalid phone" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let waPayload: any;
  if (body.template) {
    waPayload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: body.template.name,
        language: { code: body.template.language || "pt_BR" },
        components: body.template.variables?.length
          ? [{ type: "body", parameters: body.template.variables.map((t) => ({ type: "text", text: String(t) })) }]
          : undefined,
      },
    };
  } else if (body.text) {
    waPayload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { preview_url: false, body: body.text.slice(0, 4096) },
    };
  } else {
    return new Response(JSON.stringify({ error: "template or text required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert log row
  const { data: logRow } = await supabase.from("whatsapp_logs").insert({
    psychologist_id: psychologistId,
    patient_id: body.patient_id || null,
    appointment_id: body.appointment_id || null,
    phone,
    template: body.template?.name || null,
    message_type: body.template ? "template" : "text",
    body_preview: body.text?.slice(0, 200) || (body.template?.variables?.join(" | ") ?? null),
    status: "sending",
    payload: waPayload,
  }).select().single();

  // Retry up to 3
  let attempts = 0;
  let last: any = null;
  while (attempts < 3) {
    attempts++;
    last = await sendOnce(waPayload, ACCESS_TOKEN, PHONE_NUMBER_ID);
    if (last.ok) break;
    // backoff on transient errors only
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

  return new Response(JSON.stringify({
    success: last.ok, wa_message_id: waId, status, error, log_id: logRow?.id,
  }), {
    status: last.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
