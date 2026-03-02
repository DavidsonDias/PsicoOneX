
-- =====================================================
-- PATIENT-CENTRIC ARCHITECTURE: Performance & Integrity
-- =====================================================

-- 1. INDEXES on patient_id (critical for patient-centric queries)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_patient_id ON public.financial_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_attachments_record_id ON public.medical_record_attachments(medical_record_id);

-- 2. INDEXES on psychologist_id (RLS performance)
CREATE INDEX IF NOT EXISTS idx_appointments_psychologist_id ON public.appointments(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_psychologist_id ON public.medical_records(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_psychologist_id ON public.financial_transactions(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_patients_psychologist_id ON public.patients(psychologist_id);

-- 3. INDEXES for common query patterns
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medical_records_session_date ON public.medical_records(session_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date ON public.financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- 4. COMPOSITE INDEXES for patient-centric views
CREATE INDEX IF NOT EXISTS idx_appointments_patient_scheduled ON public.appointments(patient_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_date ON public.medical_records(patient_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_patient_due ON public.financial_transactions(patient_id, due_date DESC);

-- 5. Add default_session_value and payment_day to patients for patient-centric financial tracking
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS default_session_value numeric DEFAULT 200,
  ADD COLUMN IF NOT EXISTS payment_day integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS treatment_start_date date DEFAULT NULL;

-- 6. Ensure financial_transactions.patient_id is NOT NULL for future inserts
-- (all existing rows already have patient_id set)
ALTER TABLE public.financial_transactions 
  ALTER COLUMN patient_id SET NOT NULL;
