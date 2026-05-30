import { supabase } from "@/integrations/supabase/client";

export type OnboardingValidity = "24h" | "48h" | "72h" | "7d";

const VALIDITY_HOURS: Record<OnboardingValidity, number> = {
  "24h": 24,
  "48h": 48,
  "72h": 72,
  "7d": 168,
};

export async function createOnboardingLink(opts: {
  patientId: string;
  psychologistId: string;
  validity: OnboardingValidity;
}): Promise<string | null> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VALIDITY_HOURS[opts.validity]);

  const { data, error } = await supabase
    .from("patient_onboarding_tokens")
    .insert({
      patient_id: opts.patientId,
      psychologist_id: opts.psychologistId,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (error) {
    console.error("createOnboardingLink", error);
    return null;
  }

  // mark patient as pending
  await supabase
    .from("patients")
    .update({ onboarding_status: "pending" })
    .eq("id", opts.patientId);

  return data.token;
}

export function getOnboardingUrl(token: string): string {
  return `${window.location.origin}/onboarding/${token}`;
}
