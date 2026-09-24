import { unvalidatedIntegrationResponse } from "../_shared/staging-isolation.ts";
// WhatsApp Admin API - Super Admin only
// Actions: test, phone_numbers, templates, business_profile, ping
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.facebook.com/v21.0";

async function loadCfg(supabase: any) {
  const { data } = await supabase.from("whatsapp_config")
    .select("phone_number_id, access_token, business_account_id, app_id").maybeSingle();
  return {
    phoneNumberId: (data?.phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "").trim(),
    accessToken: (data?.access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "").trim(),
    wabaId: (data?.business_account_id || "").trim(),
    appId: (data?.app_id || "").trim(),
  };
}

async function gFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

serve(async (req) => {
  const migrationPause = unvalidatedIntegrationResponse(req);
  if (migrationPause) return migrationPause;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "super_admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden — super admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { action?: string; to?: string; template?: string };
  try { body = await req.json(); } catch { body = {}; }
  const action = body.action || "ping";

  const { phoneNumberId, accessToken, wabaId } = await loadCfg(supabase);

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Access token not configured" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (action === "phone_info") {
      if (!phoneNumberId) throw new Error("phone_number_id missing");
      const r = await gFetch(`${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,name_status,messaging_limit_tier`, accessToken);
      if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
      // Persist display info
      await supabase.from("whatsapp_config").update({
        display_phone_number: r.json?.display_phone_number || null,
        business_name: r.json?.verified_name || null,
        last_tested_at: new Date().toISOString(),
        last_test_status: "ok",
        last_test_error: null,
      }).eq("phone_number_id", phoneNumberId);
      return new Response(JSON.stringify({ success: true, data: r.json }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_phone_numbers") {
      if (!wabaId) throw new Error("business_account_id (WABA) missing");
      const r = await gFetch(`${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier`, accessToken);
      if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
      return new Response(JSON.stringify({ success: true, data: r.json?.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_templates") {
      if (!wabaId) throw new Error("business_account_id (WABA) missing");
      const r = await gFetch(`${GRAPH}/${wabaId}/message_templates?fields=name,language,status,category,components&limit=100`, accessToken);
      if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
      return new Response(JSON.stringify({ success: true, data: r.json?.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "business_profile") {
      if (!phoneNumberId) throw new Error("phone_number_id missing");
      const r = await gFetch(`${GRAPH}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,websites,vertical,profile_picture_url`, accessToken);
      if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
      return new Response(JSON.stringify({ success: true, data: r.json?.data?.[0] || {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_test") {
      if (!phoneNumberId) throw new Error("phone_number_id missing");
      const to = (body.to || "").replace(/\D+/g, "");
      const tpl = body.template || "hello_world";
      if (!to) throw new Error("destination phone required");
      const phone = to.length === 10 || to.length === 11 ? "55" + to : to;
      const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: { name: tpl, language: { code: tpl === "hello_world" ? "en_US" : "pt_BR" } },
      };
      const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      await supabase.from("whatsapp_config").update({
        last_tested_at: new Date().toISOString(),
        last_test_status: res.ok ? "ok" : "failed",
        last_test_error: res.ok ? null : (json?.error?.message || `HTTP ${res.status}`),
      }).eq("phone_number_id", phoneNumberId);
      return new Response(JSON.stringify({ success: res.ok, status: res.status, response: json }), {
        status: res.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ping / default — quick token validity check
    const r = await gFetch(`${GRAPH}/me`, accessToken);
    return new Response(JSON.stringify({ success: r.ok, data: r.json }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
