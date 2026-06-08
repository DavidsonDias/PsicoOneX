
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _entity uuid;
  _action text;
  _old jsonb;
  _new jsonb;
BEGIN
  _user := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  IF TG_OP = 'INSERT' THEN
    _action := 'insert';
    _entity := (to_jsonb(NEW)->>'id')::uuid;
    _new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _entity := (to_jsonb(NEW)->>'id')::uuid;
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    -- avoid noise: skip if nothing material changed
    IF _old = _new THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _entity := (to_jsonb(OLD)->>'id')::uuid;
    _old := to_jsonb(OLD);
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (user_id, action_type, entity_type, entity_id, old_data, new_data)
    VALUES (_user, _action, TG_TABLE_NAME, _entity, _old, _new);
  EXCEPTION WHEN OTHERS THEN
    -- never block the original operation because of audit failure
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers (idempotent)
DROP TRIGGER IF EXISTS audit_patients ON public.patients;
CREATE TRIGGER audit_patients
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_medical_records ON public.medical_records;
CREATE TRIGGER audit_medical_records
AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_appointments ON public.appointments;
CREATE TRIGGER audit_appointments
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_financial_transactions ON public.financial_transactions;
CREATE TRIGGER audit_financial_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

-- Performance index for conflict checks
CREATE INDEX IF NOT EXISTS idx_appointments_psych_time
  ON public.appointments (psychologist_id, scheduled_at);
