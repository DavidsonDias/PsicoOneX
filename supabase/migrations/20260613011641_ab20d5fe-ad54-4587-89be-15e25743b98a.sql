
-- Index for fast subscription lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Helper: call dispatch-notification edge function via pg_net
CREATE OR REPLACE FUNCTION public.dispatch_notification_async(
  _user_id uuid,
  _category text,
  _type text,
  _title text,
  _message text,
  _action_path text DEFAULT NULL,
  _action_label text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  url text := 'https://jlnpehjlfwejwshvxwhs.supabase.co/functions/v1/dispatch-notification';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbnBlaGpsZndlandzaHZ4d2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTE1MzcsImV4cCI6MjA3NTY4NzUzN30.ZPbxgwGryhGivDfGIiQyT-Rvv9w4pwcFtzEWrmGkT3Q';
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  BEGIN
    PERFORM net.http_post(
      url := url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey', anon_key,
        'Authorization','Bearer '||anon_key
      ),
      body := jsonb_build_object(
        'user_id', _user_id,
        'category', _category,
        'type', _type,
        'title', _title,
        'message', _message,
        'action_path', _action_path,
        'action_label', _action_label,
        'metadata', _metadata
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block original op
    NULL;
  END;
END;
$$;

-- Appointments trigger
CREATE OR REPLACE FUNCTION public.notify_appointment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name text;
  v_when text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
    SELECT full_name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;
    v_when := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI');
    PERFORM public.dispatch_notification_async(
      NEW.psychologist_id,'agenda','appointment',
      'Novo agendamento',
      COALESCE(v_patient_name,'Paciente')||' em '||v_when,
      '/agenda', 'Ver agenda',
      jsonb_build_object('appointment_id', NEW.id, 'event','created')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      SELECT full_name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;
      PERFORM public.dispatch_notification_async(
        NEW.psychologist_id,'agenda','appointment',
        'Agendamento removido',
        COALESCE(v_patient_name,'Paciente'),
        '/agenda','Ver agenda',
        jsonb_build_object('appointment_id', NEW.id,'event','deleted')
      );
      RETURN NEW;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'cancelled' THEN
      SELECT full_name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;
      PERFORM public.dispatch_notification_async(
        NEW.psychologist_id,'agenda','appointment',
        'Agendamento cancelado',
        COALESCE(v_patient_name,'Paciente'),
        '/agenda','Ver agenda',
        jsonb_build_object('appointment_id', NEW.id,'event','cancelled')
      );
    ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
      SELECT full_name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;
      v_when := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI');
      PERFORM public.dispatch_notification_async(
        NEW.psychologist_id,'agenda','appointment',
        'Agendamento remarcado',
        COALESCE(v_patient_name,'Paciente')||' agora em '||v_when,
        '/agenda','Ver agenda',
        jsonb_build_object('appointment_id', NEW.id,'event','rescheduled')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_appointment_event ON public.appointments;
CREATE TRIGGER trg_notify_appointment_event
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_event();

-- Financial trigger
CREATE OR REPLACE FUNCTION public.notify_financial_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name text;
  v_amount text;
BEGIN
  v_amount := 'R$ '||to_char(COALESCE(NEW.amount,0),'FM999G999G990D00');
  IF NEW.patient_id IS NOT NULL THEN
    SELECT full_name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
    PERFORM public.dispatch_notification_async(
      NEW.user_id,'financeiro','payment',
      'Novo lançamento financeiro',
      COALESCE(v_patient_name||' · ','')||v_amount,
      '/financeiro','Abrir financeiro',
      jsonb_build_object('transaction_id', NEW.id,'event','created')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'paid' THEN
        PERFORM public.dispatch_notification_async(
          NEW.user_id,'financeiro','payment',
          'Pagamento recebido',
          COALESCE(v_patient_name||' · ','')||v_amount,
          '/financeiro','Abrir financeiro',
          jsonb_build_object('transaction_id', NEW.id,'event','paid')
        );
      ELSIF NEW.status = 'overdue' THEN
        PERFORM public.dispatch_notification_async(
          NEW.user_id,'financeiro','alert',
          'Pagamento vencido',
          COALESCE(v_patient_name||' · ','')||v_amount,
          '/financeiro','Abrir financeiro',
          jsonb_build_object('transaction_id', NEW.id,'event','overdue')
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_financial_event ON public.financial_transactions;
CREATE TRIGGER trg_notify_financial_event
AFTER INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_financial_event();

-- Medical record creation trigger
CREATE OR REPLACE FUNCTION public.notify_medical_record_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name text;
  v_owner uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  SELECT full_name, user_id INTO v_patient_name, v_owner FROM public.patients WHERE id = NEW.patient_id;
  PERFORM public.dispatch_notification_async(
    COALESCE(NEW.psychologist_id, v_owner),'prontuario','patient',
    'Prontuário criado',
    COALESCE(v_patient_name,'Paciente')||' · sessão #'||COALESCE(NEW.session_number::text,'-'),
    '/prontuarios','Ver prontuários',
    jsonb_build_object('record_id', NEW.id,'event','created')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_medical_record_event ON public.medical_records;
CREATE TRIGGER trg_notify_medical_record_event
AFTER INSERT ON public.medical_records
FOR EACH ROW EXECUTE FUNCTION public.notify_medical_record_event();
