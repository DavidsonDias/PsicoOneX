CREATE TABLE public.drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  draft_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  device_id text,
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, draft_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drafts TO authenticated;
GRANT ALL ON public.drafts TO service_role;

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drafts" ON public.drafts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_drafts_user_updated ON public.drafts (user_id, updated_at DESC);

CREATE TRIGGER trg_drafts_updated_at
BEFORE UPDATE ON public.drafts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();