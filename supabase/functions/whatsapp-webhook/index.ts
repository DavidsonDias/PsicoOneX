// WhatsApp webhook (Meta) - verify + status/messages receiver
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function verifySignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header || !header.startsWith("sha256=")) return false;
  const provided = header.slice(7);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === provided;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
  const APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
  const url = new URL(req.url);

  // Verification challenge
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const tok = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && tok === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  if (APP_SECRET) {
    const ok = await verifySignature(raw, req.headers.get("x-hub-signature-256"), APP_SECRET);
    if (!ok) return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  let body: any = {};
  try { body = JSON.parse(raw); } catch { /* ignore */ }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        // Status updates
        for (const st of value.statuses || []) {
          const waId = st.id;
          const update: any = { status: st.status };
          if (st.status === "delivered") update.delivered_at = new Date(Number(st.timestamp) * 1000).toISOString();
          if (st.status === "read") update.read_at = new Date(Number(st.timestamp) * 1000).toISOString();
          if (st.status === "failed") update.error = JSON.stringify(st.errors || st);
          await supabase.from("whatsapp_logs").update(update).eq("wa_message_id", waId);
        }
        // Inbound messages → log + notification (best effort)
        for (const msg of value.messages || []) {
          const from = msg.from;
          const text = msg.text?.body || `[${msg.type}]`;
          // Find a patient by phone (digits-only match)
          const { data: pats } = await supabase.from("patients")
            .select("id, psychologist_id, full_name, whatsapp_phone, phone")
            .or(`whatsapp_phone.ilike.%${from}%,phone.ilike.%${from}%`)
            .limit(1);
          const pat = pats?.[0];
          await supabase.from("whatsapp_logs").insert({
            psychologist_id: pat?.psychologist_id || "00000000-0000-0000-0000-000000000000",
            patient_id: pat?.id || null,
            phone: from,
            message_type: "inbound",
            body_preview: text.slice(0, 200),
            status: "received",
            payload: msg,
          });
          if (pat?.psychologist_id) {
            await supabase.from("notifications").insert({
              user_id: pat.psychologist_id,
              type: "whatsapp",
              title: `WhatsApp de ${pat.full_name}`,
              message: text.slice(0, 200),
              action_label: "Ver paciente",
              action_path: `/pacientes/${pat.id}`,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("webhook error", e);
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
