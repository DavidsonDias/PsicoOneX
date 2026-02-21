
-- 1. Soft delete columns on patients
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL;

-- 2. Soft delete columns on medical_records
ALTER TABLE public.medical_records 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL;

-- 3. Soft delete columns on appointments
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL;

-- 4. Soft delete columns on financial_transactions
ALTER TABLE public.financial_transactions 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL;

-- 5. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clinic_id UUID NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  old_data JSONB NULL,
  new_data JSONB NULL,
  ip_address TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON public.patients(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON public.medical_records(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON public.appointments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_deleted_at ON public.financial_transactions(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- 7. Super admin RLS policies on all tables
CREATE POLICY "Super admins can view all patients"
  ON public.patients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all medical records"
  ON public.medical_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all medical records"
  ON public.medical_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all financial transactions"
  ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all financial transactions"
  ON public.financial_transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all attachments"
  ON public.medical_record_attachments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 8. is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- 9. Restore function
CREATE OR REPLACE FUNCTION public.restore_deleted_record(
  _entity_type TEXT,
  _entity_id UUID,
  _restored_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(_restored_by) THEN
    RAISE EXCEPTION 'Only super admins can restore records';
  END IF;

  IF _entity_type = 'patient' THEN
    UPDATE public.patients SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL WHERE id = _entity_id;
    UPDATE public.medical_records SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL WHERE patient_id = _entity_id AND deleted_at IS NOT NULL;
    UPDATE public.appointments SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL WHERE patient_id = _entity_id AND deleted_at IS NOT NULL;
  ELSIF _entity_type = 'medical_record' THEN
    UPDATE public.medical_records SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL WHERE id = _entity_id;
  ELSIF _entity_type = 'appointment' THEN
    UPDATE public.appointments SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL WHERE id = _entity_id;
  ELSIF _entity_type = 'financial_transaction' THEN
    UPDATE public.financial_transactions SET deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL WHERE id = _entity_id;
  ELSE
    RAISE EXCEPTION 'Unknown entity type: %', _entity_type;
  END IF;

  INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, new_data)
  VALUES (_restored_by, 'restore', _entity_type, _entity_id, jsonb_build_object('restored_at', now()));

  RETURN TRUE;
END;
$$;
