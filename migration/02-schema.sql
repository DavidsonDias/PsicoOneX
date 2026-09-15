-- =====================================================================
-- 02-schema.sql — o que rodar no DESTINO (Supabase externo) ANTES do import
-- NÃO EXECUTAR AGORA. Aguardar autorização da Fase 2.
--
-- Princípio: o schema de `public` NÃO é reescrito aqui. Ele vem de
--   pg_dump --schema-only --schema=public   (fonte primária)
-- ou, alternativamente, da reaplicação ordenada de supabase/migrations/*.sql.
-- Este arquivo contém apenas o que o dump de `public` NÃO carrega.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Extensões (rodar ANTES do dump de schema)
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists pgmq;
-- supabase_vault e pg_stat_statements já vêm habilitados em projetos Supabase.

-- ---------------------------------------------------------------------
-- B) Filas de e-mail (pgmq) — o dump não recria as filas
-- ---------------------------------------------------------------------
select pgmq.create('auth_emails');
select pgmq.create('transactional_emails');
select pgmq.create('auth_emails_dlq');
select pgmq.create('transactional_emails_dlq');

-- ---------------------------------------------------------------------
-- C) Triggers de auth.users (NÃO vêm no dump de `public`)
--    Recriar somente DEPOIS de importar auth.users, para não disparar
--    handle_new_user durante o import.
-- ---------------------------------------------------------------------
-- create trigger on_auth_user_created
--   after insert on auth.users for each row execute function public.handle_new_user();
-- create trigger on_auth_user_created_assign_role
--   after insert on auth.users for each row execute function public.assign_default_role();

-- ---------------------------------------------------------------------
-- D) Funções com URL/anon key HARDCODED do projeto Lovable
--    Recriar no destino trocando <NEW_PROJECT_URL> e <NEW_ANON_KEY>.
--    Corpo integral atual está em supabase/migrations/*.sql — copiar de lá
--    e substituir apenas as duas constantes:
--      dispatch_notification_async   -> url + anon_key
--      notify_whatsapp_appointment   -> url + anon_key
--      email_queue_wake              -> url (functions/v1/process-email-queue)
--      email_queue_dispatch          -> url (functions/v1/process-email-queue)
--    RECOMENDADO: em vez de hardcode, ler de configuração:
--      alter database <db> set app.settings.project_url = '<NEW_PROJECT_URL>';
--    e usar current_setting('app.settings.project_url', true) nas 4 funções.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- E) Vault (segredo usado por email_queue_dispatch)
-- ---------------------------------------------------------------------
-- select vault.create_secret('<SERVICE_ROLE_KEY_DO_DESTINO>', 'email_queue_service_role_key');

-- ---------------------------------------------------------------------
-- F) EXECUTE nas funções SECURITY DEFINER usadas por RLS/login
--    Sem isto: login por username falha e todo RLS baseado em has_role quebra.
-- ---------------------------------------------------------------------
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.is_subscription_active(uuid) to authenticated;
grant execute on function public.get_email_by_username(text) to anon, authenticated;
grant execute on function public.accept_patient_invite(text, uuid) to authenticated;
grant execute on function public.get_appointment_email_status(uuid[]) to authenticated;
grant execute on function public.restore_deleted_record(text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- G) Buckets de Storage (criar antes de copiar objetos; todos privados)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('medical-attachments','medical-attachments', false),
  ('patient-documents','patient-documents', false),
  ('financial-attachments','financial-attachments', false),
  ('database_export_11_09_26','database_export_11_09_26', false)
on conflict (id) do nothing;
-- As 9 policies de storage.objects vêm do dump de `storage` OU devem ser
-- recriadas a partir de supabase/migrations/*.sql (buscar por storage.objects).

-- ---------------------------------------------------------------------
-- H) Cron jobs (recriar por último, já com Edge Functions publicadas)
--    Substituir <NEW_PROJECT_URL> e usar o CRON_SECRET do destino.
-- ---------------------------------------------------------------------
-- select cron.schedule('send-appointment-reminders-15min', '*/15 * * * *', $$ ... $$);
-- select cron.schedule('whatsapp-reminders-15min',        '*/15 * * * *', $$ ... $$);
-- select cron.schedule('expire-trials-daily',              '0 6 * * *',   $$ ... $$);
-- select cron.schedule('generate-billing-cycle-daily',     '0 6 * * *',   $$ ... $$);
-- select cron.schedule('extend-recurring-appointments-daily','15 6 * * *',$$ ... $$);
-- select cron.schedule('sevendevx-signature-integrity-check','0 6 * * *', $$ ... $$);
-- (process-email-queue é agendado dinamicamente por email_queue_wake — não criar)
-- Comandos exatos: copiar de supabase/migrations/*.sql (grep "cron.schedule").
