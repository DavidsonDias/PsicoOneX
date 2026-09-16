
-- Add google_event_id to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_event_id text;

-- Create google_calendar_tokens table to store OAuth tokens securely
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  google_email text,
  calendar_id text DEFAULT 'primary',
  sync_enabled boolean DEFAULT true,
  auto_create boolean DEFAULT true,
  auto_update boolean DEFAULT true,
  sync_new_only boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own tokens
CREATE POLICY "Users can view own google tokens"
  ON public.google_calendar_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google tokens"
  ON public.google_calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google tokens"
  ON public.google_calendar_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google tokens"
  ON public.google_calendar_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
