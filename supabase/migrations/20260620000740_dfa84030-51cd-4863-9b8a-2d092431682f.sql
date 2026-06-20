CREATE OR REPLACE FUNCTION public.notify_financial_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      NEW.psychologist_id,'financeiro','payment',
      'Novo lançamento financeiro',
      COALESCE(v_patient_name||' · ','')||v_amount,
      '/financeiro','Abrir financeiro',
      jsonb_build_object('transaction_id', NEW.id,'event','created')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'paid' THEN
        PERFORM public.dispatch_notification_async(
          NEW.psychologist_id,'financeiro','payment',
          'Pagamento recebido',
          COALESCE(v_patient_name||' · ','')||v_amount,
          '/financeiro','Abrir financeiro',
          jsonb_build_object('transaction_id', NEW.id,'event','paid')
        );
      ELSIF NEW.status = 'overdue' THEN
        PERFORM public.dispatch_notification_async(
          NEW.psychologist_id,'financeiro','alert',
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
$function$;