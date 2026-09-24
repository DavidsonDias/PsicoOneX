import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { requireUser } from "../_shared/require-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require caller authentication — prevents unsolicited emails from anon callers.
  const auth = await requireUser(req, corsHeaders);
  if ('error' in auth) return auth.error;

  try {
    const { appointmentId, patientId, token } = await req.json();


    if (!appointmentId || !patientId || !token) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios: appointmentId, patientId, token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Validate token format (alnum/underscore/hyphen, reasonable length) to prevent HTML injection
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch patient
    const { data: patient } = await supabase
      .from("patients")
      .select("full_name, email")
      .eq("id", patientId)
      .single();

    if (!patient?.email) {
      return new Response(JSON.stringify({ error: "Paciente sem e-mail cadastrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch appointment
    const { data: apt } = await supabase
      .from("appointments")
      .select("scheduled_at, duration_minutes, type, psychologist_id")
      .eq("id", appointmentId)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check: caller must own the appointment.
    if (apt.psychologist_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token exists in patient_access_links for this appointment/patient.
    const { data: linkRow } = await supabase
      .from("patient_access_links")
      .select("id")
      .eq("token", token)
      .eq("patient_id", patientId)
      .maybeSingle();
    if (!linkRow) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Fetch psychologist name
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, clinic_name")
      .eq("id", apt.psychologist_id)
      .single();

    const date = new Date(apt.scheduled_at);
    const dateStr = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    const portalUrl = `https://psicoonex.vercel.app/portal/${token}`;

    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({
        templateName: "appointment-confirmation",
        recipientEmail: patient.email,
        idempotencyKey: `apt-confirm-${appointmentId}`,
        templateData: {
          patientName: patient.full_name.split(" ")[0],
          date: dateStr,
          time: timeStr,
          duration: String(apt.duration_minutes || 50),
          type: apt.type || "presential",
          psychologistName: prof?.full_name,
          clinicName: prof?.clinic_name,
          portalUrl,
        },
        metadata: { appointment_id: appointmentId, patient_id: patientId, channel: "legacy_send_appointment_email" },
      }),
    });

    const payload = await emailRes.json().catch(() => ({}));
    if (!emailRes.ok || payload?.error) {
      return new Response(JSON.stringify({ sent: false, error: payload?.error || `HTTP ${emailRes.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true, queued: true, portalUrl, messageId: payload?.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
