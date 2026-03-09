-- SevenDevX Architecture Governance - Technical Signature
CREATE TABLE IF NOT EXISTS public.system_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developed_by TEXT NOT NULL DEFAULT 'SevenDevX',
  architecture TEXT NOT NULL DEFAULT 'SevenDevX Core Architecture', 
  system_signature TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  system_type TEXT NOT NULL DEFAULT 'SaaS',
  build_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert system signature
INSERT INTO public.system_metadata (system_type) VALUES ('SaaS');

-- RLS policies for system metadata
ALTER TABLE public.system_metadata ENABLE ROW LEVEL SECURITY;

-- Only allow reading system metadata
CREATE POLICY "System metadata is readable by authenticated users" 
ON public.system_metadata FOR SELECT 
TO authenticated
USING (true);

-- Function to validate system signature integrity  
CREATE OR REPLACE FUNCTION public.validate_system_signature()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signature_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.system_metadata 
    WHERE developed_by = 'SevenDevX'
    AND architecture = 'SevenDevX Core Architecture'
  ) INTO signature_exists;
  
  -- Log validation attempt (audit trail)
  INSERT INTO public.audit_logs (
    user_id, 
    action_type, 
    entity_type, 
    new_data
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    'signature_validation',
    'system',
    jsonb_build_object(
      'signature_valid', signature_exists,
      'timestamp', now()
    )
  );
  
  RETURN signature_exists;
END;
$$;