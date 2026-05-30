
-- ============================================================
-- FASE 1: Self-Onboarding do Paciente
-- ============================================================

-- 1) Novos campos em patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS emergency_relationship TEXT,
  ADD COLUMN IF NOT EXISTS health_plan TEXT,
  ADD COLUMN IF NOT EXISTS health_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS health_plan_expiry DATE,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lgpd_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS lgpd_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;

-- 2) Tabela de tokens de onboarding
CREATE TABLE IF NOT EXISTS public.patient_onboarding_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  psychologist_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | used | expired | revoked
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_token ON public.patient_onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_patient ON public.patient_onboarding_tokens(patient_id);

GRANT SELECT ON public.patient_onboarding_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_onboarding_tokens TO authenticated;
GRANT ALL ON public.patient_onboarding_tokens TO service_role;

ALTER TABLE public.patient_onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone with the token can read it (needed for public form)
CREATE POLICY "Anyone can read token by value"
ON public.patient_onboarding_tokens
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Psychologists create their tokens"
ON public.patient_onboarding_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists update their tokens"
ON public.patient_onboarding_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists delete their tokens"
ON public.patient_onboarding_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = psychologist_id);

CREATE POLICY "Service role full access onboarding tokens"
ON public.patient_onboarding_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3) Storage bucket for patient-uploaded documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Psychologists can read their patients' documents
CREATE POLICY "Psychologists read patient documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[1]
    AND p.psychologist_id = auth.uid()
  )
);

-- Service role uploads (used by the public onboarding edge function)
CREATE POLICY "Service role manages patient documents"
ON storage.objects
FOR ALL
USING (bucket_id = 'patient-documents' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'patient-documents' AND auth.role() = 'service_role');
