import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppSendArgs {
  to: string;
  patient_id?: string;
  appointment_id?: string;
  template?: { name: string; language?: string; variables?: string[] };
  text?: string;
}

export async function sendWhatsApp(args: WhatsAppSendArgs) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", { body: args });
  if (error) throw error;
  if (!(data as any)?.success) throw new Error((data as any)?.error || "Falha ao enviar WhatsApp");
  return data as { success: boolean; wa_message_id: string | null; status: string; log_id: string };
}

// Pre-approved Meta templates (configure os names exatos no Business Manager)
export const WA_TEMPLATES = {
  appointmentCreated: "appointment_created",
  appointmentReminder24h: "appointment_reminder_24h",
  appointmentReminder1h: "appointment_reminder_1h",
  appointmentRescheduled: "appointment_rescheduled",
  appointmentCancelled: "appointment_cancelled",
  sessionStarted: "session_started",
} as const;
