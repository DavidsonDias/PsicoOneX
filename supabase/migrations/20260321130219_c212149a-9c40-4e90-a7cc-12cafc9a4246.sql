
-- Table for telehealth sessions
CREATE TABLE public.telehealth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  room_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'waiting',
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  chat_messages jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  medical_record_id uuid REFERENCES public.medical_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;

-- Psychologist owns their sessions
CREATE POLICY "Psychologists can manage their sessions" ON public.telehealth_sessions
  FOR ALL TO authenticated
  USING (psychologist_id = auth.uid())
  WITH CHECK (psychologist_id = auth.uid());

-- Public read for patients joining via token (anon role)
CREATE POLICY "Anyone can read session by token" ON public.telehealth_sessions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.telehealth_sessions;

-- Index for token lookup
CREATE INDEX idx_telehealth_sessions_token ON public.telehealth_sessions(room_token);
CREATE INDEX idx_telehealth_sessions_psychologist ON public.telehealth_sessions(psychologist_id);
