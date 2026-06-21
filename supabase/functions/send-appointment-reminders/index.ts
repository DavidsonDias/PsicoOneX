// Sends configurable reminders ahead of upcoming appointments.
// Triggered by pg_cron every 5–15 minutes.
//
// Strategy:
// - For each enabled offset (in minutes) from the psychologist's preferences,
//   find appointments scheduled in [now + offset - WINDOW/2, now + offset + WINDOW/2].
// - Idempotency is enforced by a deterministic idempotencyKey: `apt-rem-{offsetMin}-{appointmentId}`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_OFFSETS_MIN = [1440, 180, 60, 15];
// Half-window in minutes around each offset. Must cover the cron interval.
const HALF_WINDOW: Record<number, number> = {
  1440: 15, // 24h ± 15min
  720: 15,
  180: 10,
  120: 10,
  60: 10,
  30: 7,
  15: 5,
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const stats: Record<string, number> = { checked: 0, sent: 0, skipped: 0, failed: 0 };

  // Map psychologist_id -> enabled offsets
  const { data: prefRows } = await supabase
    .from("user_preferences")
    .select("user_id, settings");
  const prefMap = new Map<string, number[]>();
  for (const r of (prefRows ?? []) as any[]) {
    const list = r?.settings?.reminder_minutes;
    if (Array.isArray(list) && list.length) prefMap.set(r.user_id, list);
  }

  // All offsets that might be enabled across users
  const allOffsets = new Set<number>(DEFAULT_OFFSETS_MIN);
  prefMap.forEach((arr) => arr.forEach((m) => allOffsets.add(m)));

  for (const offset of allOffsets) {
    const half = HALF_WINDOW[offset] ?? 10;
    const from = new Date(now.getTime() + (offset - half) * 60_000).toISOString();
    const to = new Date(now.getTime() + (offset + half) * 60_000).toISOString();

    const { data: apts, error } = await supabase
      .from("appointments")
      .select("id, patient_id, psychologist_id, scheduled_at, duration_minutes, type, status, patients(full_name, email)")
      .gte("scheduled_at", from)
      .lt("scheduled_at", to)
      .is("deleted_at", null)
      .in("status", ["scheduled", "confirmed"])
      .returns<AptRow[]>();

    if (error) {
      console.error(`[reminders] window ${offset}m query failed:`, error);
      continue;
    }
    if (!apts?.length) continue;

    for (const apt of apts) {
      stats.checked++;
      if (!apt.patients?.email) { stats.skipped++; continue; }

      // Honor psychologist preference (fallback to defaults)
      const enabled = prefMap.get(apt.psychologist_id) ?? DEFAULT_OFFSETS_MIN;
      if (!enabled.includes(offset)) { stats.skipped++; continue; }

      const idempotencyKey = `apt-rem-${offset}-${apt.id}`;

      // Dedup via email_send_log
      const { data: existing } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("template_name", "appointment-reminder")
        .or(`metadata->>idempotency_key.eq.${idempotencyKey},error_message.ilike.%${idempotencyKey}%`)
        .limit(1)
        .maybeSingle();
      if (existing) { stats.skipped++; continue; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, clinic_name")
        .eq("id", apt.psychologist_id)
        .single();

      const aptTime = new Date(apt.scheduled_at).getTime();
      const linkExpiresAt = new Date(aptTime + 6 * 60 * 60_000).toISOString();
      const { data: link } = await supabase
        .from("patient_access_links")
        .insert({
          patient_id: apt.patient_id,
          appointment_id: apt.id,
          created_by: apt.psychologist_id,
          expires_at: linkExpiresAt,
        })
        .select("token")
        .single();

      const portalUrl = link?.token ? `https://psicoone.com/portal/${link.token}` : undefined;
      const dateStr = new Date(apt.scheduled_at).toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
        timeZone: "America/Sao_Paulo",
      });
      const timeStr = new Date(apt.scheduled_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      });

      // Friendly label per offset
      const label =
        offset >= 1440 ? "24 horas" :
        offset >= 60 ? `${Math.round(offset / 60)} hora${offset >= 120 ? "s" : ""}` :
        `${offset} minutos`;

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
          idempotencyKey,
          templateData: {
            patientName: apt.patients.full_name.split(" ")[0],
            date: dateStr,
            time: timeStr,
            duration: String(apt.duration_minutes || 50),
            type: apt.type || "presential",
            psychologistName: prof?.full_name,
            clinicName: prof?.clinic_name,
            portalUrl,
            hoursAhead: String(offset / 60),
            offsetLabel: label,
          },
          metadata: {
            appointment_id: apt.id,
            patient_id: apt.patient_id,
            idempotency_key: idempotencyKey,
            offset_minutes: offset,
          },
        }),
      });

      if (sendRes.ok) stats.sent++;
      else {
        stats.failed++;
        console.error(`[reminders] send failed apt=${apt.id} offset=${offset}:`, await sendRes.text());
      }
    }
  }

  console.log("[reminders] done", stats);
  return new Response(JSON.stringify({ ok: true, stats }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
