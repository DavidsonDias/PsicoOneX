import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClinicBranding {
  logoUrl: string | null;
  clinicName: string | null;
  professionalName: string | null;
  crp: string | null;
}

/**
 * Loads the logged-in psychologist's branding (logo, clinic name, name, CRP)
 * to render on documents, medical records, reports and patient-facing screens.
 */
export function useClinicBranding() {
  const [branding, setBranding] = useState<ClinicBranding>({
    logoUrl: null,
    clinicName: null,
    professionalName: null,
    crp: null,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("logo_url, clinic_name, full_name, crp")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setBranding({
          logoUrl: (data as any).logo_url || null,
          clinicName: data.clinic_name,
          professionalName: data.full_name,
          crp: data.crp,
        });
      }
    })();
  }, []);

  return branding;
}
