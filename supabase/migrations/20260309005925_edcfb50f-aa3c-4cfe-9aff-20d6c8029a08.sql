-- Fix search_path security for validate_system_signature function
CREATE OR REPLACE FUNCTION public.validate_system_signature()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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