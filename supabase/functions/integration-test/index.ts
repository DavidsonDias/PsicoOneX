import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "super_admin")) {
      return json({ success: false, error: "forbidden: super_admin only" }, 403);
    }

    const { integration_id, action = "test", payload = {} } = await req.json();
    if (!integration_id) return json({ success: false, error: "integration_id required" }, 400);

    const { data: cfgRow } = await admin
      .from("integration_configs")
      .select("*")
      .eq("integration_id", integration_id)
      .maybeSingle();

    const cfg = (cfgRow?.config || {}) as Record<string, string>;

    let result: any = { success: true };
    let testStatus = "ok";
    let testError: string | null = null;

    try {
      if (integration_id === "telegram") {
        const token = cfg.bot_token;
        const chatId = payload.chat_id || cfg.default_chat_id;
        if (!token) throw new Error("bot_token não configurado");
        if (action === "test") {
          const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const j = await r.json();
          if (!j.ok) throw new Error(j.description || "getMe falhou");
          result.data = j.result;
        } else if (action === "send") {
          if (!chatId) throw new Error("chat_id obrigatório");
          const text = payload.text || "🚀 Mensagem de teste do PsicoOne";
          const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
          });
          const j = await r.json();
          if (!j.ok) throw new Error(j.description || "sendMessage falhou");
          result.data = j.result;
        }
      }

      else if (integration_id === "twilio_sms") {
        const sid = cfg.account_sid;
        const tok = cfg.auth_token;
        const from = cfg.from_number;
        if (!sid || !tok || !from) throw new Error("account_sid, auth_token e from_number obrigatórios");
        const basic = btoa(`${sid}:${tok}`);
        if (action === "test") {
          const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
            headers: { Authorization: `Basic ${basic}` },
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
          result.data = { friendly_name: j.friendly_name, status: j.status, type: j.type };
        } else if (action === "send") {
          const to = payload.to;
          const body = payload.body || "Mensagem de teste do PsicoOne";
          if (!to) throw new Error("to (número destino) obrigatório");
          const form = new URLSearchParams({ To: to, From: from, Body: body });
          const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: "POST",
            headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
          result.data = { sid: j.sid, status: j.status, to: j.to };
        }
      }

      else if (integration_id === "zapier") {
        const url = payload.webhook_url || cfg.webhook_url;
        if (!url) throw new Error("webhook_url não configurada");
        const body = payload.body || { event: "psicoone.test", timestamp: new Date().toISOString(), source: "PsicoOne Super Admin" };
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok && r.status !== 0) throw new Error(`Webhook respondeu ${r.status}`);
        result.data = { status: r.status, message: "Disparo enviado — verifique o histórico do Zap" };
      }

      else if (integration_id === "apple_calendar") {
        const url = cfg.caldav_url || "https://caldav.icloud.com";
        const user = cfg.apple_id;
        const pass = cfg.app_password;
        if (!user || !pass) throw new Error("apple_id e app_password obrigatórios");
        const basic = btoa(`${user}:${pass}`);
        const r = await fetch(url, {
          method: "PROPFIND",
          headers: {
            Authorization: `Basic ${basic}`,
            Depth: "0",
            "Content-Type": "application/xml; charset=utf-8",
          },
          body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
        });
        if (r.status >= 400) throw new Error(`CalDAV respondeu ${r.status}`);
        result.data = { status: r.status, server: url, message: "Credenciais CalDAV aceitas" };
      }

      else if (integration_id === "outlook") {
        const tenant = cfg.tenant_id;
        const clientId = cfg.client_id;
        const clientSecret = cfg.client_secret;
        if (!tenant || !clientId || !clientSecret) throw new Error("tenant_id, client_id e client_secret obrigatórios");
        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials",
          }),
        });
        const j = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(j.error_description || j.error || `HTTP ${tokenRes.status}`);
        result.data = { token_type: j.token_type, expires_in: j.expires_in, scope: "Microsoft Graph OK" };
      }

      else {
        throw new Error(`integração desconhecida: ${integration_id}`);
      }
    } catch (e: any) {
      testStatus = "failed";
      testError = e?.message || String(e);
      result = { success: false, error: testError };
    }

    if (cfgRow) {
      await admin.from("integration_configs").update({
        last_tested_at: new Date().toISOString(),
        last_test_status: testStatus,
        last_test_error: testError,
      }).eq("id", cfgRow.id);
    }

    return json(result, testStatus === "ok" ? 200 : 400);
  } catch (e: any) {
    return json({ success: false, error: e?.message || String(e) }, 500);
  }
});
