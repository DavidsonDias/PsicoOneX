
-- Table for patient access links (token-based portal access)
CREATE TABLE public.patient_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  is_revoked boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Enable RLS
ALTER TABLE public.patient_access_links ENABLE ROW LEVEL SECURITY;

-- Psychologists can manage their own links
CREATE POLICY "Psychologists can create access links"
ON public.patient_access_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Psychologists can view their access links"
ON public.patient_access_links FOR SELECT TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Psychologists can update their access links"
ON public.patient_access_links FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Psychologists can delete their access links"
ON public.patient_access_links FOR DELETE TO authenticated
USING (auth.uid() = created_by);

-- Public read by token (for patient portal - anon access)
CREATE POLICY "Anyone can read link by token"
ON public.patient_access_links FOR SELECT TO anon
USING (true);

-- Index for fast token lookup
CREATE INDEX idx_patient_access_links_token ON public.patient_access_links(token);
