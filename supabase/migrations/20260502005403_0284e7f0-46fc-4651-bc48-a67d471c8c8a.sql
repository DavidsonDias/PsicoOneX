-- ============================================================
-- PORTAL DO PACIENTE 2.0 — Migration
-- ============================================================

-- 1) Add 'patient' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'patient';

-- 2) Link patients to auth.users (optional)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);

-- 3) Patient invites
CREATE TABLE IF NOT EXISTS public.patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  psychologist_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_invites_token ON public.patient_invites(token);
CREATE INDEX IF NOT EXISTS idx_patient_invites_patient ON public.patient_invites(patient_id);

ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Psychologists manage their invites" ON public.patient_invites;
CREATE POLICY "Psychologists manage their invites"
  ON public.patient_invites FOR ALL
  TO authenticated
  USING (psychologist_id = auth.uid())
  WITH CHECK (psychologist_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.patient_invites;
CREATE POLICY "Anyone can read invite by token"
  ON public.patient_invites FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access invites" ON public.patient_invites;
CREATE POLICY "Service role full access invites"
  ON public.patient_invites FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4) Appointment messages
CREATE TABLE IF NOT EXISTS public.appointment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL,
  sender_user_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('patient','psychologist')),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_messages_apt ON public.appointment_messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_messages_created ON public.appointment_messages(created_at DESC);

ALTER TABLE public.appointment_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Psychologists view messages on their appointments" ON public.appointment_messages;
CREATE POLICY "Psychologists view messages on their appointments"
  ON public.appointment_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_messages.appointment_id
      AND a.psychologist_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Psychologists insert messages on their appointments" ON public.appointment_messages;
CREATE POLICY "Psychologists insert messages on their appointments"
  ON public.appointment_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND sender_role = 'psychologist'
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_messages.appointment_id
        AND a.psychologist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Patients view messages on their appointments" ON public.appointment_messages;
CREATE POLICY "Patients view messages on their appointments"
  ON public.appointment_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.patients p ON p.id = a.patient_id
    WHERE a.id = appointment_messages.appointment_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Patients insert messages on their appointments" ON public.appointment_messages;
CREATE POLICY "Patients insert messages on their appointments"
  ON public.appointment_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND sender_role = 'patient'
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.patients p ON p.id = a.patient_id
      WHERE a.id = appointment_messages.appointment_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Patients mark own messages read" ON public.appointment_messages;
CREATE POLICY "Patients mark own messages read"
  ON public.appointment_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.patients p ON p.id = a.patient_id
    WHERE a.id = appointment_messages.appointment_id
      AND p.user_id = auth.uid()
  ));

-- 5) Patient portal audit log
CREATE TABLE IF NOT EXISTS public.patient_portal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_portal_audit_patient ON public.patient_portal_audit(patient_id, created_at DESC);

ALTER TABLE public.patient_portal_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Psychologists view audit of their patients" ON public.patient_portal_audit;
CREATE POLICY "Psychologists view audit of their patients"
  ON public.patient_portal_audit FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_portal_audit.patient_id
      AND p.psychologist_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Patients view own audit" ON public.patient_portal_audit;
CREATE POLICY "Patients view own audit"
  ON public.patient_portal_audit FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_portal_audit.patient_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role and self insert audit" ON public.patient_portal_audit;
CREATE POLICY "Service role and self insert audit"
  ON public.patient_portal_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_portal_audit.patient_id
        AND p.user_id = auth.uid()
    )
  );

-- 6) Patient access policies on existing tables
DROP POLICY IF EXISTS "Patients can view own record" ON public.patients;
CREATE POLICY "Patients can view own record"
  ON public.patients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Patients view own appointments" ON public.appointments;
CREATE POLICY "Patients view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointments.patient_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Patients update own appointment confirm/cancel" ON public.appointments;
CREATE POLICY "Patients update own appointment confirm/cancel"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointments.patient_id
      AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointments.patient_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Patients view own transactions" ON public.financial_transactions;
CREATE POLICY "Patients view own transactions"
  ON public.financial_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = financial_transactions.patient_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Patients create own requests" ON public.appointment_requests;
CREATE POLICY "Patients create own requests"
  ON public.appointment_requests FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointment_requests.patient_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Patients view own requests" ON public.appointment_requests;
CREATE POLICY "Patients view own requests"
  ON public.appointment_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointment_requests.patient_id
      AND p.user_id = auth.uid()
  ));

-- 7) Helper function: accept invite
CREATE OR REPLACE FUNCTION public.accept_patient_invite(_token TEXT, _user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite
  FROM public.patient_invites
  WHERE token = _token
    AND is_revoked = FALSE
    AND accepted_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  UPDATE public.patients
  SET user_id = _user_id,
      portal_activated_at = COALESCE(portal_activated_at, now())
  WHERE id = v_invite.patient_id;

  UPDATE public.patient_invites
  SET accepted_at = now(),
      accepted_user_id = _user_id
  WHERE id = v_invite.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'patient')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.patient_portal_audit (patient_id, user_id, action, metadata)
  VALUES (v_invite.patient_id, _user_id, 'portal_activated', jsonb_build_object('via', 'invite'));

  RETURN v_invite.patient_id;
END;
$$;

-- 8) Realtime for messages (appointment_requests already in publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_messages;
