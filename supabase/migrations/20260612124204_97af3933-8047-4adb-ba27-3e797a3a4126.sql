
-- 1. Versions table
CREATE TABLE public.medical_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  content jsonb NOT NULL,
  title text,
  change_reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_id, version_number)
);

GRANT SELECT, INSERT, DELETE ON public.medical_record_versions TO authenticated;
GRANT ALL ON public.medical_record_versions TO service_role;

ALTER TABLE public.medical_record_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read versions"
  ON public.medical_record_versions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.medical_records mr
    WHERE mr.id = medical_record_versions.record_id
      AND mr.psychologist_id = auth.uid()
  ));

CREATE POLICY "Owners can insert versions"
  ON public.medical_record_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.medical_records mr
      WHERE mr.id = record_id AND mr.psychologist_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete versions"
  ON public.medical_record_versions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.medical_records mr
    WHERE mr.id = medical_record_versions.record_id
      AND mr.psychologist_id = auth.uid()
  ));

CREATE INDEX idx_mrv_record_version
  ON public.medical_record_versions(record_id, version_number DESC);

CREATE INDEX idx_medical_records_patient_updated
  ON public.medical_records(patient_id, updated_at DESC);

-- 2. Pruning trigger: keep last 50 versions per record
CREATE OR REPLACE FUNCTION public.prune_record_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.medical_record_versions
  WHERE record_id = NEW.record_id
    AND id NOT IN (
      SELECT id FROM public.medical_record_versions
      WHERE record_id = NEW.record_id
      ORDER BY version_number DESC
      LIMIT 50
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prune_record_versions
  AFTER INSERT ON public.medical_record_versions
  FOR EACH ROW EXECUTE FUNCTION public.prune_record_versions();

-- 3. Audit triggers on medical_records and patients (function already exists: log_audit_change)
DROP TRIGGER IF EXISTS trg_audit_medical_records ON public.medical_records;
CREATE TRIGGER trg_audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_patients ON public.patients;
CREATE TRIGGER trg_audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
