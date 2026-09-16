-- Phase 3: Financial + Stripe enhancements

-- Add Stripe payment link fields to financial_transactions
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID;

CREATE INDEX IF NOT EXISTS idx_ft_stripe_link_id ON public.financial_transactions(stripe_payment_link_id) WHERE stripe_payment_link_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ft_due_status ON public.financial_transactions(psychologist_id, status, due_date) WHERE deleted_at IS NULL;

-- Recurring billing rules per patient
CREATE TABLE IF NOT EXISTS public.recurring_billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_send_link BOOLEAN NOT NULL DEFAULT TRUE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_billings TO authenticated;
GRANT ALL ON public.recurring_billings TO service_role;

ALTER TABLE public.recurring_billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Psychologists manage own recurring billings"
ON public.recurring_billings FOR ALL TO authenticated
USING (auth.uid() = psychologist_id)
WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Service role full access recurring billings"
ON public.recurring_billings FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER recurring_billings_updated_at
BEFORE UPDATE ON public.recurring_billings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_recurring_next_run ON public.recurring_billings(next_run_date) WHERE is_active = TRUE;