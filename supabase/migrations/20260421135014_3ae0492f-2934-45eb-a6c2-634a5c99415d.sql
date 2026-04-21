-- 1) Add appointment_id index for fast lookup of telehealth sessions by appointment
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_appointment 
  ON public.telehealth_sessions(appointment_id) 
  WHERE appointment_id IS NOT NULL;

-- 2) Trigger function: auto-create telehealth_session when appointment is online
CREATE OR REPLACE FUNCTION public.auto_create_telehealth_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_token TEXT;
  existing_id UUID;
BEGIN
  -- Only act on online appointments
  IF NEW.type IS DISTINCT FROM 'online' THEN
    RETURN NEW;
  END IF;

  -- Skip if a session already exists for this appointment
  SELECT id INTO existing_id
  FROM public.telehealth_sessions
  WHERE appointment_id = NEW.id
  LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Recurrence: reuse parent's room_token (fixed room per recurring series)
  IF NEW.recurrence_parent_id IS NOT NULL THEN
    SELECT room_token INTO parent_token
    FROM public.telehealth_sessions
    WHERE appointment_id = NEW.recurrence_parent_id
    LIMIT 1;
  END IF;

  IF parent_token IS NOT NULL THEN
    INSERT INTO public.telehealth_sessions (
      psychologist_id, patient_id, appointment_id, room_token, status
    ) VALUES (
      NEW.psychologist_id, NEW.patient_id, NEW.id, parent_token, 'waiting'
    );
  ELSE
    INSERT INTO public.telehealth_sessions (
      psychologist_id, patient_id, appointment_id, status
    ) VALUES (
      NEW.psychologist_id, NEW.patient_id, NEW.id, 'waiting'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger on appointments insert
DROP TRIGGER IF EXISTS trg_auto_create_telehealth_session ON public.appointments;
CREATE TRIGGER trg_auto_create_telehealth_session
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_telehealth_session();

-- 4) Backfill: create telehealth_sessions for existing online appointments without one
INSERT INTO public.telehealth_sessions (psychologist_id, patient_id, appointment_id, status)
SELECT a.psychologist_id, a.patient_id, a.id, 'waiting'
FROM public.appointments a
LEFT JOIN public.telehealth_sessions s ON s.appointment_id = a.id
WHERE a.type = 'online'
  AND a.deleted_at IS NULL
  AND s.id IS NULL;