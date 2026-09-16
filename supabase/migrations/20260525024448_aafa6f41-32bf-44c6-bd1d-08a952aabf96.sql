
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  primary_hue INTEGER NOT NULL DEFAULT 217,
  dashboard_layout JSONB NOT NULL DEFAULT '{
    "widgets": [
      {"id":"metrics","visible":true},
      {"id":"revenue","visible":true},
      {"id":"today","visible":true},
      {"id":"quick","visible":true},
      {"id":"insights","visible":true},
      {"id":"automation","visible":true},
      {"id":"weekly","visible":true}
    ]
  }'::jsonb,
  settings JSONB NOT NULL DEFAULT '{
    "session_duration": 50,
    "session_price": 0,
    "reminder_hours": 24,
    "enable_email": true,
    "enable_whatsapp": false,
    "enable_sms": false,
    "terms_of_service": "",
    "privacy_policy": ""
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
