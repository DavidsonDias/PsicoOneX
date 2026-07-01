import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  category?: string;
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  notification_id?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY =
  "BD81p4xbVEUVW5DFDoySC8ub-yZ0vwJbnYy2KfrbEQqruQViRfRR6SrBzpt5qiiboImi-9jL6WvFZqcyWvB-jvE";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@sevendevx.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Accept internal callers only (service role / cron / internal secret).
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
    || req.headers.get("x-internal-secret");
  const allowed = new Set(
    [
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      Deno.env.get("INTERNAL_FUNCTION_SECRET"),
      Deno.env.get("CRON_SECRET"),
    ].filter(Boolean) as string[],
  );
  if (!token || !allowed.has(token)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as PushPayload;
    if (!payload?.title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const userIds = payload.user_ids?.length ? payload.user_ids : payload.user_id ? [payload.user_id] : [];
    // Require an explicit user scope — never broadcast to every subscriber.
    if (!userIds.length) {
      return new Response(JSON.stringify({ error: "user_id or user_ids is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);
    if (error) throw error;


    const notification = {
      title: payload.title,
      body: payload.body || "",
      url: payload.url || "/",
      tag: payload.tag || payload.category || "psicoone",
      category: payload.category,
      notification_id: payload.notification_id,
    };

    const results = await Promise.allSettled(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(notification)
          );
          return { endpoint: s.endpoint, ok: true };
        } catch (e: any) {
          // Clean up expired/invalid subscriptions
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
          return { endpoint: s.endpoint, ok: false, error: String(e?.message || e) };
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r as any).value.ok).length;
    return new Response(JSON.stringify({ ok: true, total: subs?.length || 0, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-push]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
