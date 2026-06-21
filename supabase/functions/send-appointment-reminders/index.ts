// Sends 24h-ahead and 1h-ahead reminders for upcoming appointments.
// Triggered by pg_cron every 15 minutes.
// Idempotency is enforced via deterministic idempotencyKey in send-transactional-email.
//
// Strategy:
// - 24h reminder: catch appointments scheduled in [now+23h45m, now+24h15m]
// - 1h reminder:  catch appointments scheduled in [now+45m,    now+1h15m]
//
// We dedupe by checking email_send_log for prior sends with matching template + appointment_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AptRow {
  id: string;
  patient_id: string;
  psychologist_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  type: string | null;
  status: string | null;
  patients: { full_name: string; email: string | null } | null;
  profiles?: { full_name: string; clinic_name: string | null } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const stats = { checked: 0, sent24h: 0, sent1h: 0, sent15m: 0, skipped: 0, failed: 0 };

  async function processWindow(hoursAhead: 24 | 1 | 0.25, fromMin: number, toMin: number) {
    const from = new Date(now.getTime() + fromMin * 60_000).toISOString();
    const to = new Date(now.getTime() + toMin * 60_000).toISOString();


    const { data: apts, error } = await supabase
      .from("appointments")
      .select("id, patient_id, psychologist_id, scheduled_at, duration_minutes, type, status, patients(full_name, email)")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to)
      .is("deleted_at", null)
      .in("status", ["scheduled", "confirmed"])
      .returns<AptRow[]>();

    if (error) {
      console.error(`[reminders] Failed to query window ${hoursAhead}h:`, error);
      return;
    }

    if (!apts || apts.length === 0) return;

    for (const apt of apts) {
      stats.checked++;
      if (!apt.patients?.email) {
        stats.skipped++;
        continue;
      }

      // Dedup: check if reminder for this appointment + window already sent
      const { data: existing } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("template_name", "appointment-reminder")
        .eq("recipient_email", apt.patients.email)
        .ilike("error_message", `%apt-rem-${hoursAhead}-${apt.id}%`)
        .limit(1)
        .maybeSingle();

      // Also check via message_id-style idempotency by querying recent logs
      const { data: recent } = await supabase
        .from("email_send_log")
        .select("id, status, created_at")
        .eq("template_name", "appointment-reminder")
        .eq("recipient_email", apt.patients.email)
        .gte("created_at", new Date(now.getTime() - 26 * 60 * 60_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Heuristic dedup: if a reminder for this same recipient was sent in the last 23h
      // and the latest one is newer than (scheduled - hoursAhead - 30min), skip.
      const aptTime = new Date(apt.scheduled_at).getTime();
      const cutoff = aptTime - (hoursAhead * 60 + 30) * 60_000;
      const alreadySent = (recent || []).some(r =>
        r.status !== "failed" && new Date(r.created_at).getTime() >= cutoff
      );
      if (existing || alreadySent) {
        stats.skipped++;
        continue;
      }

      // Fetch profile separately (RLS-bypass via service)
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, clinic_name")
        .eq("id", apt.psychologist_id)
        .single();

      // Generate fresh access link (24h validity for reminder)
      const expiresAt = new Date(aptTime + 6 * 60 * 60_000).toISOString();
      const { data: link } = await supabase
        .from("patient_access_links")
        .insert({
          patient_id: apt.patient_id,
          appointment_id: apt.id,
          created_by: apt.psychologist_id,
          expires_at: expiresAt,
        })
        .select("token")
        .single();

      const portalUrl = link?.token ? `https://psicoone.com/portal/${link.token}` : undefined;

      const aptDate = new Date(apt.scheduled_at);
      const dateStr = aptDate.toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
        timeZone: "America/Sao_Paulo",
      });
      const timeStr = aptDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

      // Invoke send-transactional-email
      const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body: JSON.stringify({
          templateName: "appointment-reminder",
          recipientEmail: apt.patients.email,
          idempotencyKey: `apt-rem-${hoursAhead}-${apt.id}`,
          templateData: {
            patientName: apt.patients.full_name.split(" ")[0],
            date: dateStr,
            time: timeStr,
            duration: String(apt.duration_minutes || 50),
            type: apt.type || "presential",
            psychologistName: prof?.full_name,
            clinicName: prof?.clinic_name,
            portalUrl,
            hoursAhead: String(hoursAhead),
          },
        }),
      });

      if (sendRes.ok) {
        if (hoursAhead === 24) stats.sent24h++;
        else if (hoursAhead === 1) stats.sent1h++;
        else stats.sent15m++;
      } else {
        stats.failed++;
        console.error(`[reminders] Failed for apt ${apt.id}:`, await sendRes.text());
      }
    }
  }

  await processWindow(24, 23 * 60 + 45, 24 * 60 + 15);
  await processWindow(1, 45, 75);
  // 15-minute heads-up — narrow window so it lands once per appointment
  await processWindow(0.25, 10, 20);


  console.log("[reminders] Done", stats);

  return new Response(JSON.stringify({ ok: true, stats }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
