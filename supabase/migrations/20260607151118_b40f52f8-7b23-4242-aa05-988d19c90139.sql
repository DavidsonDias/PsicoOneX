
-- Wave 1: Plano de cobrança por paciente (separado da agenda)
CREATE TABLE IF NOT EXISTS public.patient_billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('per_session','weekly','biweekly','monthly')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  sessions_per_cycle INT,
  day_of_month INT CHECK (day_of_month BETWEEN 1 AND 31),
  payment_method TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_billing_plans TO authenticated;
GRANT ALL ON public.patient_billing_plans TO service_role;

ALTER TABLE public.patient_billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psy manages own billing plans"
  ON public.patient_billing_plans FOR ALL
  USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

CREATE INDEX idx_billing_plans_psy ON public.patient_billing_plans(psychologist_id, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_billing_plans_patient ON public.patient_billing_plans(patient_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_billing_plans_updated_at
  BEFORE UPDATE ON public.patient_billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Wave 1: índice de conflito de horário (usado pela validação IA)
CREATE INDEX IF NOT EXISTS idx_appointments_psy_scheduled
  ON public.appointments(psychologist_id, scheduled_at)
  WHERE deleted_at IS NULL;

-- Wave 1: suportar recorrência indeterminada (campo já existe como text;
-- adiciona coluna de janela rolante para o job estender automaticamente)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_open_ended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_extended_until DATE;

CREATE INDEX IF NOT EXISTS idx_appointments_open_ended
  ON public.appointments(psychologist_id, recurrence_extended_until)
  WHERE recurrence_open_ended = TRUE AND deleted_at IS NULL;
