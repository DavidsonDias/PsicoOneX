
-- Create subscription status and plan enums
CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'expired', 'blocked', 'suspended', 'cancelled');
CREATE TYPE public.plan_type AS ENUM ('trial', 'basic', 'pro', 'enterprise');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan public.plan_type NOT NULL DEFAULT 'trial',
  status public.subscription_status NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_end_date TIMESTAMP WITH TIME ZONE,
  plan_started_at TIMESTAMP WITH TIME ZONE,
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own subscription (limited)
CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Super admins can view all
CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can update all
CREATE POLICY "Super admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can insert
CREATE POLICY "Super admins can insert subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Function to calculate trial end date (7 business days)
CREATE OR REPLACE FUNCTION public.calculate_trial_end(start_date TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result_date DATE;
  business_days_added INT := 0;
  current_date_iter DATE := start_date::DATE;
BEGIN
  WHILE business_days_added < 7 LOOP
    current_date_iter := current_date_iter + 1;
    IF EXTRACT(DOW FROM current_date_iter) NOT IN (0, 6) THEN
      business_days_added := business_days_added + 1;
    END IF;
  END LOOP;
  RETURN current_date_iter::TIMESTAMP WITH TIME ZONE + INTERVAL '23 hours 59 minutes 59 seconds';
END;
$$;

-- Auto-create subscription on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  trial_end := public.calculate_trial_end(now());
  INSERT INTO public.subscriptions (user_id, plan, status, trial_start_date, trial_end_date)
  VALUES (NEW.id, 'trial', 'trial', now(), trial_end);
  RETURN NEW;
END;
$$;

-- Trigger: create subscription after profile is created
CREATE TRIGGER on_profile_created_create_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_subscription();

-- Function to check if subscription is active (used in RLS/app logic)
CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
    AND status IN ('active', 'trial')
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
