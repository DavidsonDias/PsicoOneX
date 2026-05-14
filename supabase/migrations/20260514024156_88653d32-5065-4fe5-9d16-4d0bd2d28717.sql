
-- Tabela de configuração WhatsApp Business API (singleton, gerenciada por super admin)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text,
  access_token text,
  verify_token text,
  business_account_id text,
  app_id text,
  display_phone_number text,
  business_name text,
  webhook_subscribed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_status text,
  last_test_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage whatsapp config"
  ON public.whatsapp_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role full access wa config"
  ON public.whatsapp_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_wa_config_updated
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed singleton row
INSERT INTO public.whatsapp_config (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;
