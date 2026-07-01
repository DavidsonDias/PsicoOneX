
DROP POLICY IF EXISTS "Anyone can read link by token" ON public.patient_access_links;
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.patient_invites;
DROP POLICY IF EXISTS "Anyone can read token by value" ON public.patient_onboarding_tokens;
DROP POLICY IF EXISTS "Anyone can read session by token" ON public.telehealth_sessions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.enforce_patient_self_update_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF auth.uid() = OLD.psychologist_id THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN RETURN NEW; END IF;
  NEW.psychologist_id:=OLD.psychologist_id; NEW.user_id:=OLD.user_id;
  NEW.full_name:=OLD.full_name; NEW.email:=OLD.email; NEW.phone:=OLD.phone;
  NEW.whatsapp_phone:=OLD.whatsapp_phone; NEW.cpf:=OLD.cpf; NEW.rg:=OLD.rg;
  NEW.date_of_birth:=OLD.date_of_birth; NEW.address:=OLD.address;
  NEW.emergency_contact:=OLD.emergency_contact; NEW.emergency_phone:=OLD.emergency_phone;
  NEW.medical_notes:=OLD.medical_notes; NEW.clinical_history:=OLD.clinical_history;
  NEW.medications:=OLD.medications; NEW.diagnosis:=OLD.diagnosis; NEW.status:=OLD.status;
  NEW.session_price:=OLD.session_price; NEW.session_duration:=OLD.session_duration;
  NEW.billing_frequency:=OLD.billing_frequency; NEW.plan_id:=OLD.plan_id;
  NEW.created_at:=OLD.created_at; NEW.deleted_at:=OLD.deleted_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_patient_self_update_columns ON public.patients;
CREATE TRIGGER trg_enforce_patient_self_update_columns
BEFORE UPDATE ON public.patients FOR EACH ROW
EXECUTE FUNCTION public.enforce_patient_self_update_columns();

ALTER FUNCTION public.enqueue_email(text, jsonb)               SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint)               SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_patient_invite(text, uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_deleted_record(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_system_signature()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_email_status(uuid[])     TO authenticated;
