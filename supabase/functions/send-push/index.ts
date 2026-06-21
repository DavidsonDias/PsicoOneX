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

  try {
    const payload = (await req.json()) as PushPayload;
    if (!payload?.title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = supabase.from("push_subscriptions").select("*");
    const userIds = payload.user_ids?.length ? payload.user_ids : payload.user_id ? [payload.user_id] : [];
    if (userIds.length) query = query.in("user_id", userIds);
    const { data: subs, error } = await query;
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
