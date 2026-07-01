// Cron job: dispatches WhatsApp 24h and 1h reminders for upcoming appointments.
// Idempotency via whatsapp_logs (template + appointment_id within window).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")
    || req.headers.get("x-cron-secret")
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


  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const stats = { checked: 0, sent24h: 0, sent1h: 0, skipped: 0, failed: 0 };

  async function processWindow(hoursAhead: 24 | 1, fromMin: number, toMin: number) {
    const from = new Date(now.getTime() + fromMin * 60_000).toISOString();
    const to = new Date(now.getTime() + toMin * 60_000).toISOString();
    const templateName = hoursAhead === 24 ? "appointment_reminder_24h" : "appointment_reminder_1h";

    const { data: apts } = await supabase
      .from("appointments")
      .select("id")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to)
      .is("deleted_at", null)
      .in("status", ["scheduled", "confirmed"]);

    if (!apts?.length) return;

    for (const a of apts) {
      stats.checked++;
      // dedup
      const { data: existing } = await supabase
        .from("whatsapp_logs")
        .select("id")
        .eq("appointment_id", a.id)
        .eq("template", templateName)
        .neq("status", "failed")
        .limit(1)
        .maybeSingle();
      if (existing) { stats.skipped++; continue; }

      const event = hoursAhead === 24 ? "reminder_24h" : "reminder_1h";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-notify-appointment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY,
        },
        body: JSON.stringify({ appointment_id: a.id, event }),
      });
      if (res.ok) {
        if (hoursAhead === 24) stats.sent24h++; else stats.sent1h++;
      } else {
        stats.failed++;
        console.error(`[wa-reminders] failed apt ${a.id}:`, await res.text());
      }
    }
  }

  await processWindow(24, 23 * 60 + 45, 24 * 60 + 15);
  await processWindow(1, 45, 75);

  console.log("[wa-reminders] done", stats);
  return new Response(JSON.stringify({ ok: true, stats }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
