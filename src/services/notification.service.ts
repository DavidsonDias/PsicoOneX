/**
 * Centralized Notification Service
 * 
 * SINGLE source of truth for sending appointment-related notifications.
 * Never call edge functions directly from UI — always use this service.
 * 
 * Future: WhatsApp, SMS, push notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { createPatientAccessLink, getPortalUrl } from "@/lib/patient-access";

export interface AppointmentNotificationContext {
  appointmentId: string;
  patientId: string;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  psychologistId: string;
}

export interface NotificationResult {
  success: boolean;
  emailSent: boolean;
  psychologistEmailSent?: boolean;
  portalUrl?: string;
  reason?: string;
  error?: string;
}

const APP_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://psicoone.lovable.app";

/**
 * Sends appointment confirmation email + generates patient portal link.
 * Idempotent: re-running with the same appointmentId is safe (deduped via idempotencyKey).
 */
export async function sendAppointmentNotification(
  ctx: AppointmentNotificationContext,
  options: {
    templateName?: "appointment-confirmation" | "appointment-reminder";
    hoursAhead?: number;
    expiresInHours?: number;
    skipEmail?: boolean;
    psychologistEmailEvent?: "appointment_created" | "access_sent" | false;
  } = {}
): Promise<NotificationResult> {
  const templateName = options.templateName || "appointment-confirmation";
  const expiresInHours = options.expiresInHours || 72;

  try {
    // 1. Fetch patient + psychologist data
    const [{ data: patient }, { data: prof }] = await Promise.all([
      supabase.from("patients").select("full_name, email").eq("id", ctx.patientId).single(),
      supabase.from("profiles").select("full_name, clinic_name, notification_emails").eq("id", ctx.psychologistId).single(),
    ]);

    // 2. Generate fresh access token
    const token = await createPatientAccessLink({
      patientId: ctx.patientId,
      appointmentId: ctx.appointmentId,
      createdBy: ctx.psychologistId,
      expiresInHours,
    });

    if (!token) {
      return { success: false, emailSent: false, reason: "token_failed" };
    }

    const portalUrl = getPortalUrl(token);

    if (!patient?.email) {
      return { success: true, emailSent: false, portalUrl, reason: "no_email" };
    }

    const aptDate = new Date(ctx.scheduledAt);
    const dateStr = aptDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
    const timeStr = aptDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

    // 3. Idempotency key — distinct per template + appointment
    const idempotencyKey =
      templateName === "appointment-reminder"
        ? `apt-rem-${options.hoursAhead || 24}-${ctx.appointmentId}`
        : `apt-confirm-${ctx.appointmentId}`;

    // Short-circuit: if caller wants only the portal link (no email)
    if (options.skipEmail) {
      return { success: true, emailSent: false, portalUrl, reason: "skipped_by_preference" };
    }


    const metadata = {
      appointment_id: ctx.appointmentId,
      patient_id: ctx.patientId,
      idempotency_key: idempotencyKey,
      channel: "patient_email",
    };

    // 4. Invoke transactional email function
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: patient.email,
        idempotencyKey,
        templateData: {
          patientName: patient.full_name.split(" ")[0],
          date: dateStr,
          time: timeStr,
          duration: String(ctx.durationMinutes),
          type: ctx.type,
          psychologistName: prof?.full_name,
          clinicName: prof?.clinic_name,
          portalUrl,
          hoursAhead: options.hoursAhead ? String(options.hoursAhead) : undefined,
        },
        metadata,
      },
    });

    if (error) {
      console.error("[NotificationService] Email failed:", error);
      return { success: false, emailSent: false, portalUrl, error: error.message };
    }

    const ok = data?.success || data?.queued;

    let psychologistEmailSent = false;
    try {
      const { data: prefs } = await supabase
        .from("user_preferences" as any)
        .select("settings")
        .eq("user_id", ctx.psychologistId)
        .maybeSingle();
      const psychologistAlerts = (prefs as any)?.settings?.psychologist_alerts ?? {};
      const wantsCopy = psychologistAlerts.bcc_self_on_patient_emails === true;
      const psychEvent =
        options.psychologistEmailEvent === false
          ? false
          : options.psychologistEmailEvent || (templateName === "appointment-confirmation" ? "appointment_created" : false);
      const alertEnabled = psychEvent === "access_sent" || psychologistAlerts.on_create !== false;
      const recipients = Array.from(
        new Set([...(Array.isArray((prof as any)?.notification_emails) ? (prof as any).notification_emails : [])].filter(Boolean))
      );

      if (ok && recipients.length > 0 && (wantsCopy || (psychEvent && alertEnabled))) {
        await Promise.all(
          recipients.map((recipientEmail) =>
            supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "psychologist-patient-action",
                recipientEmail,
                idempotencyKey: `${idempotencyKey}-psych-${recipientEmail}`,
                templateData: {
                  psychologistName: prof?.full_name,
                  patientName: patient.full_name,
                  actionType: psychEvent || "access_sent",
                  appointmentDate: dateStr,
                  appointmentTime: timeStr,
                  message:
                    psychEvent === "appointment_created"
                      ? "O agendamento foi criado e o acesso seguro do paciente foi enviado."
                      : "O acesso seguro do paciente foi reenviado.",
                  agendaUrl: `${APP_BASE_URL}/agenda`,
                },
                metadata: {
                  ...metadata,
                  channel: "psychologist_email_copy",
                  recipient: recipientEmail,
                },
              },
            })
          )
        );
        psychologistEmailSent = true;
      }
    } catch (copyError) {
      console.warn("[NotificationService] psychologist copy failed", copyError);
    }

    return { success: !!ok, emailSent: !!ok, psychologistEmailSent, portalUrl, reason: data?.reason };
  } catch (err) {
    console.error("[NotificationService] Unexpected error:", err);
    return {
      success: false,
      emailSent: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Resends access link for an existing appointment.
 * Generates a fresh token, re-triggers the confirmation email, registers audit
 * log + internal notification for the psychologist, and respects the
 * `email_events.on_access_share` user preference.
 */
export async function resendAppointmentAccess(
  appointmentId: string
): Promise<NotificationResult> {
  const { data: apt, error } = await supabase
    .from("appointments")
    .select("id, patient_id, psychologist_id, scheduled_at, duration_minutes, type")
    .eq("id", appointmentId)
    .single();

  if (error || !apt) {
    return { success: false, emailSent: false, reason: "appointment_not_found" };
  }

  // Honor user preference: skip e-mail when the toggle is OFF, but still rotate token.
  let emailEnabled = true;
  try {
    const { data: prefs } = await supabase
      .from("user_preferences" as any)
      .select("settings")
      .eq("user_id", apt.psychologist_id)
      .maybeSingle();
    const ev = (prefs as any)?.settings?.email_events;
    if (ev && ev.on_access_share === false) emailEnabled = false;
  } catch {/* non-fatal */}

  const result = await sendAppointmentNotification(
    {
      appointmentId: apt.id,
      patientId: apt.patient_id,
      psychologistId: apt.psychologist_id,
      scheduledAt: apt.scheduled_at,
      durationMinutes: apt.duration_minutes || 50,
      type: apt.type || "presential",
    },
    emailEnabled ? { psychologistEmailEvent: "access_sent" } : { skipEmail: true, psychologistEmailEvent: "access_sent" }
  );

  // Internal audit + notification (best effort, never block UX)
  try {
    await supabase.from("audit_logs").insert({
      user_id: apt.psychologist_id,
      action_type: "resend_access",
      entity_type: "appointment",
      entity_id: apt.id,
      new_data: {
        sent: result.emailSent,
        portal_url: result.portalUrl,
        email_enabled: emailEnabled,
      } as any,
    } as any);
  } catch {/* ignore */}

  try {
    await supabase.functions.invoke("dispatch-notification", {
      body: {
        user_id: apt.psychologist_id,
        category: "agenda",
        type: "appointment",
        title: result.emailSent ? "Acesso reenviado" : "Link de acesso gerado",
        message: result.emailSent
          ? "E-mail enviado ao paciente com o link de acesso."
          : "Link copiado. Compartilhe manualmente com o paciente.",
        action_path: "/agenda",
        action_label: "Ver agenda",
        metadata: { appointment_id: apt.id, event: "resend_access" },
      },
    });
  } catch {/* ignore */}

  return result;
}

/**
 * Checks the latest email send status for an appointment.
 * Returns 'sent' | 'failed' | 'pending' | 'never'.
 */
export async function getAppointmentEmailStatus(
  appointmentId: string
): Promise<"sent" | "failed" | "pending" | "suppressed" | "never"> {
  const { data } = await supabase
    .from("email_send_log")
    .select("status, created_at")
    .or(
      `metadata->>appointment_id.eq.${appointmentId},template_name.eq.appointment-confirmation`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return "never";
  if (data.status === "sent") return "sent";
  if (data.status === "failed") return "failed";
  if (data.status === "suppressed") return "suppressed";
  return "pending";
}
