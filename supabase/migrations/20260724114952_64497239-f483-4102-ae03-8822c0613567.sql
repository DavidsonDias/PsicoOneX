
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_onboarding_tokens TO authenticated;
GRANT ALL ON public.patient_onboarding_tokens TO service_role;

DROP POLICY IF EXISTS "Psychologists read their tokens" ON public.patient_onboarding_tokens;
CREATE POLICY "Psychologists read their tokens"
ON public.patient_onboarding_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = psychologist_id);
