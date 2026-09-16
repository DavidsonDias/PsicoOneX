
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS preferred_notification_channel text NOT NULL DEFAULT 'email'
    CHECK (preferred_notification_channel IN ('email','whatsapp','both','none'));

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  patient_id uuid,
  appointment_id uuid,
  phone text NOT NULL,
  template text,
  message_type text NOT NULL DEFAULT 'template',
  body_preview text,
  status text NOT NULL DEFAULT 'queued',
  wa_message_id text,
  error text,
  payload jsonb,
  response jsonb,
  attempts int NOT NULL DEFAULT 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_psy ON public.whatsapp_logs(psychologist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_logs_patient ON public.whatsapp_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_logs_wa_msg ON public.whatsapp_logs(wa_message_id);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Psychologists view their wa logs"
  ON public.whatsapp_logs FOR SELECT TO authenticated
  USING (psychologist_id = auth.uid());

CREATE POLICY "Psychologists insert their wa logs"
  ON public.whatsapp_logs FOR INSERT TO authenticated
  WITH CHECK (psychologist_id = auth.uid());

CREATE POLICY "Service role full access wa logs"
  ON public.whatsapp_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Super admins view all wa logs"
  ON public.whatsapp_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER wa_logs_updated_at
  BEFORE UPDATE ON public.whatsapp_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
