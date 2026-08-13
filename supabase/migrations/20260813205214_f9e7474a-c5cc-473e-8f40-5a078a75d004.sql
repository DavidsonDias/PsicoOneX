CREATE TABLE public.patient_onboarding_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  psychologist_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_percentage integer NOT NULL DEFAULT 0,
  current_step integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'in_progress',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_onboarding_drafts_patient_unique UNIQUE (patient_id)
);

GRANT SELECT, DELETE ON public.patient_onboarding_drafts TO authenticated;
GRANT ALL ON public.patient_onboarding_drafts TO service_role;

ALTER TABLE public.patient_onboarding_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Psychologists view own patient drafts"
ON public.patient_onboarding_drafts FOR SELECT TO authenticated
USING (psychologist_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Psychologists delete own patient drafts"
ON public.patient_onboarding_drafts FOR DELETE TO authenticated
USING (psychologist_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_onboarding_drafts_updated_at
BEFORE UPDATE ON public.patient_onboarding_drafts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_onboarding_drafts_psychologist ON public.patient_onboarding_drafts(psychologist_id);