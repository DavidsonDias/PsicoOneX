
-- Add missing columns to appointments table for recurrence and session value
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS session_value numeric DEFAULT 200,
  ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL;

-- Add foreign key for recurrence parent
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_recurrence_parent_id_fkey 
  FOREIGN KEY (recurrence_parent_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Add index for recurrence lookups
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_parent ON public.appointments(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON public.appointments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON public.patients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_deleted_at ON public.financial_transactions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON public.medical_records(deleted_at) WHERE deleted_at IS NULL;

-- Add receipt/invoice columns to financial_transactions
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS receipt_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_center text DEFAULT NULL;

-- Create storage bucket for financial attachments (receipts, invoices, comprovantes)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('financial-attachments', 'financial-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for financial attachments
CREATE POLICY "Users can upload financial attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'financial-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their financial attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'financial-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their financial attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'financial-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Super admins can view all financial attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'financial-attachments' AND public.has_role(auth.uid(), 'super_admin'));
