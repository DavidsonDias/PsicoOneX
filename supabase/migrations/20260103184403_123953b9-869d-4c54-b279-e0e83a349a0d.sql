-- Create storage bucket for medical record attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-attachments', 'medical-attachments', false);

-- Create policies for the storage bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'medical-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'medical-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'medical-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track attachments metadata
CREATE TABLE public.medical_record_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_record_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view attachments for their records"
ON public.medical_record_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.medical_records mr
    WHERE mr.id = medical_record_id AND mr.psychologist_id = auth.uid()
  )
);

CREATE POLICY "Users can create attachments for their records"
ON public.medical_record_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medical_records mr
    WHERE mr.id = medical_record_id AND mr.psychologist_id = auth.uid()
  )
);

CREATE POLICY "Users can delete attachments for their records"
ON public.medical_record_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.medical_records mr
    WHERE mr.id = medical_record_id AND mr.psychologist_id = auth.uid()
  )
);