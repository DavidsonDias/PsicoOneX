
-- ============ Wave 2: Patient Lifecycle ============
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lifecycle_reason text,
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz DEFAULT now(),
  ADD CONSTRAINT patients_lifecycle_status_check
    CHECK (lifecycle_status IN ('active','paused','discharged','referred','dropout','closed','archived'));

CREATE TABLE IF NOT EXISTS public.patient_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  psychologist_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.patient_status_history TO authenticated;
GRANT ALL ON public.patient_status_history TO service_role;

ALTER TABLE public.patient_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read status history"
  ON public.patient_status_history FOR SELECT
  TO authenticated
  USING (psychologist_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "owners insert status history"
  ON public.patient_status_history FOR INSERT
  TO authenticated
  WITH CHECK (psychologist_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_patient_status_history_patient
  ON public.patient_status_history(patient_id, created_at DESC);

-- ============ Wave 1 extra: username on profiles ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- ============ Wave 4: Push subscriptions ============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push subs"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- ============ Wave 4: Notification category for filters ============
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system';
