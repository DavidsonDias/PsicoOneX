
-- Add recurrence and session value fields to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid DEFAULT NULL REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_value numeric DEFAULT 200;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);


-- Create index for recurrence
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_parent ON public.appointments(recurrence_parent_id);
