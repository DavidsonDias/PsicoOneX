
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS billing_plan_id uuid REFERENCES public.patient_billing_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ft_billing_plan ON public.financial_transactions(billing_plan_id) WHERE billing_plan_id IS NOT NULL AND deleted_at IS NULL;
