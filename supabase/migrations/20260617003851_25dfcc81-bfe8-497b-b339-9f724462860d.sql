-- Bloco 3: Sincronização automática Agenda <-> Financeiro

CREATE OR REPLACE FUNCTION public.sync_appointment_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_type text;
  v_amount numeric;
  v_has_active_plan boolean := false;
BEGIN
  -- Buscar plano de cobrança ativo do paciente
  SELECT pbp.billing_type
    INTO v_billing_type
  FROM public.patient_billing_plans pbp
  WHERE pbp.patient_id = COALESCE(NEW.patient_id, OLD.patient_id)
    AND pbp.active = true
    AND pbp.deleted_at IS NULL
  LIMIT 1;

  v_has_active_plan := v_billing_type IS NOT NULL AND v_billing_type <> 'per_session';

  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
    IF v_has_active_plan THEN RETURN NEW; END IF;

    v_amount := COALESCE(NEW.session_value, 0);
    IF v_amount <= 0 THEN
      SELECT default_session_value INTO v_amount FROM public.patients WHERE id = NEW.patient_id;
      v_amount := COALESCE(v_amount, 0);
    END IF;
    IF v_amount <= 0 THEN RETURN NEW; END IF;

    INSERT INTO public.financial_transactions (
      psychologist_id, patient_id, appointment_id,
      type, status, category, amount, due_date, description
    ) VALUES (
      NEW.psychologist_id, NEW.patient_id, NEW.id,
      'income', 'pending', 'session', v_amount,
      (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date,
      'Sessão de ' || to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft delete do appointment -> soft delete da transação pendente
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE public.financial_transactions
         SET deleted_at = now(), deleted_reason = 'Agendamento excluído'
       WHERE appointment_id = NEW.id AND status = 'pending' AND deleted_at IS NULL;
      RETURN NEW;
    END IF;

    -- Cancelamento -> cancela transação pendente
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      UPDATE public.financial_transactions
         SET status = 'cancelled'
       WHERE appointment_id = NEW.id AND status = 'pending' AND deleted_at IS NULL;
      RETURN NEW;
    END IF;

    -- Atualização de horário ou valor -> atualiza transação pendente
    IF (NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at)
       OR (NEW.session_value IS DISTINCT FROM OLD.session_value) THEN
      UPDATE public.financial_transactions
         SET due_date = (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date,
             amount = CASE WHEN NEW.session_value IS NOT NULL AND NEW.session_value > 0
                           THEN NEW.session_value ELSE amount END,
             description = 'Sessão de ' || to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')
       WHERE appointment_id = NEW.id AND status = 'pending' AND deleted_at IS NULL;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.financial_transactions
       SET deleted_at = now(), deleted_reason = 'Agendamento excluído'
     WHERE appointment_id = OLD.id AND status = 'pending' AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_appointment_financial ON public.appointments;
CREATE TRIGGER trg_sync_appointment_financial
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_financial();

CREATE INDEX IF NOT EXISTS idx_financial_tx_appointment ON public.financial_transactions(appointment_id);