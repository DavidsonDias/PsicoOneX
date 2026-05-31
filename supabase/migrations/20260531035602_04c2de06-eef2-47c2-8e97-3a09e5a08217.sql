ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_medical_records_favorite 
ON public.medical_records(psychologist_id, is_favorite) 
WHERE is_favorite = true AND deleted_at IS NULL;