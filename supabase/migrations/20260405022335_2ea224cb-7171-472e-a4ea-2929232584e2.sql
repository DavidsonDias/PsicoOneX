
-- Create automation rules table
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psychologist_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Psychologists can view their own rules"
  ON public.automation_rules FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can create their own rules"
  ON public.automation_rules FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update their own rules"
  ON public.automation_rules FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete their own rules"
  ON public.automation_rules FOR DELETE
  USING (auth.uid() = psychologist_id);

-- Timestamp trigger
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
