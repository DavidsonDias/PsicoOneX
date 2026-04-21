import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Resolve (or create) the telehealth session for an appointment and return the room token.
 * Used by "Iniciar atendimento" buttons across the app to navigate directly into the room.
 */
export async function resolveSessionTokenForAppointment(appointmentId: string): Promise<string | null> {
  const { data: existing, error } = await supabase
    .from("telehealth_sessions")
    .select("id, room_token, psychologist_id, patient_id, appointment_id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) {
    console.error("[startSession] lookup error", error);
  }

  if (existing?.room_token) return existing.room_token;

  // Fallback: create on the fly (in case trigger missed it for legacy data)
  const { data: apt } = await supabase
    .from("appointments")
    .select("id, psychologist_id, patient_id, recurrence_parent_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!apt) {
    toast.error("Agendamento não encontrado");
    return null;
  }

  // Reuse parent token for recurring series
  let parentToken: string | null = null;
  if (apt.recurrence_parent_id) {
    const { data: parentSess } = await supabase
      .from("telehealth_sessions")
      .select("room_token")
      .eq("appointment_id", apt.recurrence_parent_id)
      .maybeSingle();
    parentToken = parentSess?.room_token ?? null;
  }

  const insertPayload: any = {
    psychologist_id: apt.psychologist_id,
    patient_id: apt.patient_id,
    appointment_id: apt.id,
    status: "waiting",
  };
  if (parentToken) insertPayload.room_token = parentToken;

  const { data: created, error: insErr } = await supabase
    .from("telehealth_sessions")
    .insert(insertPayload)
    .select("room_token")
    .single();

  if (insErr || !created) {
    console.error("[startSession] create error", insErr);
    toast.error("Erro ao preparar sala da sessão");
    return null;
  }

  return created.room_token;
}

/**
 * Marks the appointment as live (waiting -> live) so the patient can join from the portal.
 * Best-effort, non-blocking.
 */
export async function markAppointmentLive(appointmentId: string): Promise<void> {
  await supabase
    .from("appointments")
    .update({ meeting_status: "live" } as any)
    .eq("id", appointmentId);
}
