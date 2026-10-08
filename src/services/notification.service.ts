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
  emailQueued?: boolean;
  psychologistEmailSent?: boolean;
  portalUrl?: string;
  reason?: string;
  error?: string;
}

/** Creates a portal link and requests a server-authorized confirmation.
 * The staging worker is manual: queue acceptance never means delivery.
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
  try {
    const { data: patient, error: patientError } = await supabase
      .from("patients").select("full_name, email").eq("id", ctx.patientId).single();
    if (patientError || !patient) return { success: false, emailSent: false, reason: "patient_not_found" };

    const token = await createPatientAccessLink({
      patientId: ctx.patientId, appointmentId: ctx.appointmentId,
      createdBy: ctx.psychologistId, expiresInHours: options.expiresInHours || 72,
    });
    if (!token) return { success: false, emailSent: false, reason: "token_failed" };
    const portalUrl = getPortalUrl(token);
    if (options.skipEmail) return { success: true, emailSent: false, portalUrl, reason: "skipped_by_preference" };
    if (!patient.email) return { success: true, emailSent: false, portalUrl, reason: "no_email" };
    // Reminders and professional copies remain disabled until their server flows are validated.
    if (options.templateName === "appointment-reminder") {
      return { success: false, emailSent: false, portalUrl, reason: "reminders_unavailable" };
    }
    // Only identifiers cross this boundary. Recipient, ownership and content are resolved server-side.
    const { data, error } = await supabase.functions.invoke("send-appointment-email", {
      body: { appointmentId: ctx.appointmentId, patientId: ctx.patientId, token },
    });
    if (error) return { success: false, emailSent: false, portalUrl, error: "Não foi possível solicitar o e-mail." };
    const queued = data?.queued === true && data?.sent === false && typeof data?.messageId === "string" && data.messageId.length > 0;
    if (data?.already_sent === true && data?.sent === true && data?.queued === false &&
        typeof data?.messageId === "string" && data.messageId.length > 0) {
      return { success: true, emailSent: true, emailQueued: false, psychologistEmailSent: false, portalUrl, reason: "already_sent" };
    }
    if (!queued) return { success: false, emailSent: false, portalUrl, reason: "queue_not_confirmed" };
    return { success: true, emailSent: false, emailQueued: true, psychologistEmailSent: false, portalUrl, reason: "queued" };
  } catch {
    return { success: false, emailSent: false, error: "Não foi possível solicitar o e-mail." };
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
        queued: result.emailQueued === true,
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
        title: result.emailQueued ? "E-mail aguardando envio" : result.emailSent ? "Acesso reenviado" : "Link de acesso gerado",
        message: result.emailQueued
          ? "E-mail de acesso adicionado à fila; o envio ainda não foi confirmado."
          : result.emailSent
          ? "E-mail enviado ao paciente com o link de acesso."
          : "Link gerado. O envio por e-mail não foi confirmado.",
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
    .eq("metadata->>appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return "never";
  if (data.status === "sent") return "sent";
  if (data.status === "failed") return "failed";
  if (data.status === "suppressed") return "suppressed";
  return "pending";
}
