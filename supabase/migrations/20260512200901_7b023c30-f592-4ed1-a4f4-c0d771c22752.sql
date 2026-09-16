
CREATE POLICY "Patients update own preferences"
  ON public.patients FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
