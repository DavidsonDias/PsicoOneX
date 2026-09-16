
-- Phase 4: Telehealth Enterprise

-- 1) Permanent room per patient: reuse same room_token across sessions
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS permanent_room_token text UNIQUE;

-- 2) Track patient arrival in waiting room (for psychologist notification)
ALTER TABLE public.telehealth_sessions
  ADD COLUMN IF NOT EXISTS patient_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS host_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS live_notes text;

-- 3) Trigger: reuse patient's permanent_room_token; generate & persist on first session
CREATE OR REPLACE FUNCTION public.telehealth_assign_permanent_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_token text;
BEGIN
  IF NEW.patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT permanent_room_token INTO existing_token
  FROM public.patients
  WHERE id = NEW.patient_id;

  IF existing_token IS NOT NULL AND existing_token <> '' THEN
    NEW.room_token := existing_token;
  ELSE
    -- room_token already defaulted at column level; persist it as the patient's permanent room
    UPDATE public.patients
    SET permanent_room_token = NEW.room_token
    WHERE id = NEW.patient_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_telehealth_assign_permanent_room ON public.telehealth_sessions;
CREATE TRIGGER trg_telehealth_assign_permanent_room
  BEFORE INSERT ON public.telehealth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.telehealth_assign_permanent_room();

-- 4) Backfill: for existing patients with at least one session, use the most recent room_token
UPDATE public.patients p
SET permanent_room_token = sub.room_token
FROM (
  SELECT DISTINCT ON (patient_id) patient_id, room_token
  FROM public.telehealth_sessions
  WHERE patient_id IS NOT NULL
  ORDER BY patient_id, created_at DESC
) sub
WHERE p.id = sub.patient_id
  AND (p.permanent_room_token IS NULL OR p.permanent_room_token = '');

-- 5) Realtime on telehealth_sessions for waiting-room notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'telehealth_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.telehealth_sessions';
  END IF;
END $$;

ALTER TABLE public.telehealth_sessions REPLICA IDENTITY FULL;
