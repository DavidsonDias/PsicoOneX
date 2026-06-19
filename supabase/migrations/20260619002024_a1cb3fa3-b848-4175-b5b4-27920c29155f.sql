ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_emails text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.notification_emails IS
  'Lista de e-mails adicionais que recebem notificações do sistema (além do e-mail principal).';