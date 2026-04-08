import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a secure access link for a patient appointment.
 * Returns the generated token.
 */
export async function createPatientAccessLink(opts: {
  patientId: string;
  appointmentId?: string;
  createdBy: string;
  expiresInHours?: number;
}): Promise<string | null> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (opts.expiresInHours || 48));

  const { data, error } = await supabase
    .from("patient_access_links")
    .insert({
      patient_id: opts.patientId,
      appointment_id: opts.appointmentId || null,
      created_by: opts.createdBy,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (error) {
    console.error("Error creating access link:", error);
    return null;
  }

  return data?.token || null;
}

/**
 * Revokes an access link.
 */
export async function revokeAccessLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from("patient_access_links")
    .update({ is_revoked: true })
    .eq("id", linkId);

  return !error;
}

/**
 * Gets the full portal URL for a token.
 */
export function getPortalUrl(token: string): string {
  const base = window.location.origin;
  return `${base}/portal/${token}`;
}
