
-- Function to fetch latest email status per appointment for the calling psychologist.
-- Returns one row per appointment_id with the most recent email send status.
CREATE OR REPLACE FUNCTION public.get_appointment_email_status(_appointment_ids uuid[])
RETURNS TABLE (
  appointment_id uuid,
  status text,
  template_name text,
  sent_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH owned AS (
    -- Restrict to appointments owned by the caller
    SELECT a.id
    FROM public.appointments a
    WHERE a.id = ANY(_appointment_ids)
      AND a.psychologist_id = auth.uid()
  ),
  latest AS (
    SELECT DISTINCT ON ((l.metadata->>'appointment_id')::uuid)
      (l.metadata->>'appointment_id')::uuid AS appointment_id,
      l.status,
      l.template_name,
      l.created_at AS sent_at
    FROM public.email_send_log l
    WHERE (l.metadata->>'appointment_id') IS NOT NULL
      AND (l.metadata->>'appointment_id')::uuid IN (SELECT id FROM owned)
    ORDER BY (l.metadata->>'appointment_id')::uuid, l.created_at DESC
  )
  SELECT * FROM latest;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointment_email_status(uuid[]) TO authenticated;
