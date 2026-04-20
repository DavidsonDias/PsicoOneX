-- Add fields to appointments for patient interactions and telehealth flow
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS patient_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS patient_cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create appointment_requests table for patient-driven actions
CREATE TABLE IF NOT EXISTS public.appointment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  psychologist_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('cancel', 'reschedule', 'message', 'confirm')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'acknowledged')),
  proposed_date TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  message TEXT,
  psychologist_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_requests_psychologist ON public.appointment_requests(psychologist_id, status);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_appointment ON public.appointment_requests(appointment_id);

ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

-- Psychologists can view requests for their patients
CREATE POLICY "Psychologists can view their requests"
ON public.appointment_requests FOR SELECT
USING (auth.uid() = psychologist_id);

-- Psychologists can update (approve/reject) their requests
CREATE POLICY "Psychologists can update their requests"
ON public.appointment_requests FOR UPDATE
USING (auth.uid() = psychologist_id);

-- Service role (used by patient-portal edge function) can do anything
CREATE POLICY "Service role full access"
ON public.appointment_requests FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Super admins
CREATE POLICY "Super admins view all requests"
ON public.appointment_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_appointment_requests_updated_at
BEFORE UPDATE ON public.appointment_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for appointment_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_requests;
ALTER TABLE public.appointment_requests REPLICA IDENTITY FULL;

-- Enable realtime for appointments (so patient portal sees status changes)
ALTER TABLE public.appointments REPLICA IDENTITY FULL;