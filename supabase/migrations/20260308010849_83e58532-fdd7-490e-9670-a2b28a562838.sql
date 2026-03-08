ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';