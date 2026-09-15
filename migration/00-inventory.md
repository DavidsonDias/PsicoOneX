# 00 — Inventário do estado atual (Lovable Cloud)

Auditoria somente-leitura. Nada foi alterado. Data: 2026-09-15.
Projeto de origem (ref interno): `jlnpehjlfwejwshvxwhs` (região/host Supabase gerenciado pela Lovable).

## 1. Banco — tabelas e registros (contagem exata)

| Tabela (schema public) | Registros |
|---|---|
| audit_logs | 4854 |
| financial_transactions | 763 |
| appointments | 650 |
| telehealth_sessions | 489 |
| email_send_log | 432 |
| notifications | 354 |
| medical_records | 228 |
| patients | 205 |
| patient_access_links | 174 |
| patient_onboarding_tokens | 58 |
| email_unsubscribe_tokens | 22 |
| medical_record_attachments | 20 |
| patient_status_history | 16 |
| user_roles | 15 |
| profiles | 14 |
| subscriptions | 14 |
| medical_record_versions | 12 |
| drafts | 11 |
| patient_onboarding_drafts | 11 |
| whatsapp_logs | 9 |
| patient_invites | 5 |
| suppressed_emails | 4 |
| patient_billing_plans | 3 |
| push_subscriptions | 2 |
| appointment_requests | 1 |
| automation_rules | 1 |
| email_send_state | 1 |
| google_calendar_tokens | 1 |
| patient_portal_audit | 1 |
| system_metadata | 1 |
| user_preferences | 1 |
| whatsapp_config | 1 |
| appointment_messages | 0 |
| integration_configs | 0 |
| recurring_billings | 0 |

**Total: 35 tabelas / 7.750 registros** em `public`.

Auth/Storage:
- `auth.users`: **14**
- `auth.identities`: **15** (google: 8, email: 7)
- `auth.sessions`: 117 (descartáveis — não migrar)
- `storage.buckets`: 4
- `storage.objects`: 29 objetos / ~91,6 MB

## 2. Estrutura

- **Colunas/tipos/PKs/FKs/índices/uniques/checks**: fonte da verdade = `supabase/migrations/` (59 arquivos, de `20251011140443` a `20260630015326`) + `pg_dump --schema-only` do preflight (`01-preflight.sql` gera os arquivos de verificação). Não há schema divergente conhecido fora das migrations, exceto correções aplicadas via ferramenta de migração (todas versionadas).
- **Enums**: `app_role` (admin, psychologist, secretary, super_admin, patient), `plan_type` (trial, basic, pro, enterprise), `subscription_status` (active, trial, expired, blocked, suspended, cancelled).
- **Sequences em `public`**: nenhuma (todas as PKs são `uuid default gen_random_uuid()`). Sequences existentes pertencem a `auth`, `cron`, `net` (gerenciadas pelas extensões).
- **Views / materialized views em `public`**: nenhuma.
- **Extensions**: `plpgsql`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pg_cron` 1.6.4, `pg_net` 0.19.5, `pgmq` 1.5.1, `supabase_vault` 0.3.1.

## 3. Funções, RPCs e triggers

31 funções em `public` (lista completa em `08-validation.sql`, item 3). Destaques:

- **Segurança/RLS**: `has_role`, `is_admin`, `is_super_admin`, `is_subscription_active`, `enforce_patient_self_update_columns`.
- **Auth/onboarding**: `handle_new_user`, `assign_default_role`, `handle_new_subscription`, `get_email_by_username`, `accept_patient_invite`.
- **Negócio**: `sync_appointment_financial`, `calculate_trial_end`, `auto_create_telehealth_session`, `telehealth_assign_permanent_room`, `prune_record_versions`, `restore_deleted_record`, `get_appointment_email_status`, `validate_system_signature`.
- **Fila de e-mail (pgmq)**: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`, `email_queue_wake`, `email_queue_dispatch`.
- **Notificações**: `dispatch_notification_async`, `notify_appointment_event`, `notify_financial_event`, `notify_medical_record_event`, `notify_whatsapp_appointment`, `log_audit_change`, `handle_updated_at`.

**Triggers**: 2 em `auth.users` (`on_auth_user_created` → `handle_new_user`; `on_auth_user_created_assign_role` → `assign_default_role`) + ~50 em `public` (auditoria, updated_at, financeiro, notificações, teleatendimento).

> ⚠️ `pg_dump` de `public` **não** traz os triggers de `auth.users`. Recriar manualmente (ver `03-auth-plan.md`).

## 4. RLS, policies e grants

- RLS habilitado em todas as 35 tabelas de `public`.
- **121 policies** em `public` + **9 policies** em `storage.objects`.
- Grants explícitos por tabela para `authenticated` / `service_role` (e `anon` apenas onde há política pública). Funções `SECURITY DEFINER` tiveram `EXECUTE` endurecido no hardening de segurança — `has_role`, `is_admin`, `is_super_admin`, `is_subscription_active`, `get_email_by_username` precisam manter `EXECUTE` para `authenticated` (e `anon` no caso de `get_email_by_username`), senão login e RLS quebram.

## 5. Referências a `auth.users` (identidade crítica)

FKs diretas: `profiles.id`, `drafts.user_id`, `patients.user_id`, `patient_invites.accepted_user_id`, `user_preferences.user_id`, `user_roles.user_id`.

Colunas de propriedade sem FK (dependem do mesmo UUID): `psychologist_id` (appointments, patients, medical_records, financial_transactions, telehealth_sessions, whatsapp_logs, automation_rules, patient_billing_plans, patient_invites, patient_onboarding_tokens, patient_status_history, recurring_billings), `user_id` (notifications, push_subscriptions, subscriptions, audit_logs, patient_portal_audit), `created_by`, `deleted_by`, `uploaded_by`, `changed_by`, `responded_by`, `updated_by`, `accepted_user_id`, `sender_user_id`.

## 6. Storage

| Bucket | Público | Objetos | Tamanho |
|---|---|---|---|
| medical-attachments | não | 23 | 52,4 MB |
| patient-documents | não | 5 | 2,7 MB |
| database_export_11_09_26 | não | 1 | 36,6 MB |
| financial-attachments | não | 0 | 0 |

9 policies em `storage.objects` (leitura/upload/delete por dono, super admin em anexos financeiros, service_role em documentos de paciente). Caminhos são referenciados no banco em `medical_record_attachments.file_path`, `financial_transactions.attachment_url` / `receipt_url`, `patients.uploaded_documents` (jsonb), `profiles.avatar_url` / `logo_url`.

## 7. Edge Functions

42 funções em `supabase/functions` (detalhe individual em `05-edge-functions.md`). 26 são invocadas do frontend via `supabase.functions.invoke`; as demais são webhooks públicos ou jobs de cron.

## 8. Cron jobs (pg_cron) — não vêm no dump de `public`

| Job | Schedule |
|---|---|
| send-appointment-reminders-15min | `*/15 * * * *` |
| whatsapp-reminders-15min | `*/15 * * * *` |
| expire-trials-daily | `0 6 * * *` |
| generate-billing-cycle-daily | `0 6 * * *` |
| extend-recurring-appointments-daily | `15 6 * * *` |
| sevendevx-signature-integrity-check | `0 6 * * *` |
| process-email-queue | dinâmico (criado/removido por `email_queue_wake` / `email_queue_dispatch`) |

## 9. Auth, e-mail e integrações

- Providers: **email/senha** e **Google**. Login também aceita username (via `get_email_by_username`).
- Recuperação de senha: `/reset-password`; magic link: `/dashboard`.
- E-mails de autenticação: hook `auth-email-hook` usando `@lovable.dev/email-js` + `@lovable.dev/webhooks-js`.
- E-mails transacionais: fila `pgmq` (`q_auth_emails`, `q_transactional_emails`) → `process-email-queue` → `sendLovableEmail` (endpoint `api.lovable.dev`).
- Vault: 1 segredo — `email_queue_service_role_key`.
- APIs externas: Stripe, Google Calendar (`googleapis.com`, `oauth2.googleapis.com`), WhatsApp Cloud API (`graph.facebook.com`), Web Push (VAPID), Deepgram (opcional), Lovable AI Gateway (`ai.gateway.lovable.dev`), ViaCEP.

## 10. Dependências diretas do Lovable Cloud (resumo)

1. `@lovable.dev/cloud-auth-js` (broker de OAuth do login Google) — `src/integrations/lovable/index.ts`.
2. `@lovable.dev/email-js` + `@lovable.dev/webhooks-js` (todo o envio de e-mail, inclusive de autenticação).
3. `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` (todas as funções de IA — congeladas nesta fase).
4. URL do projeto + anon key **hardcoded** em funções do banco (`dispatch_notification_async`, `notify_whatsapp_appointment`, `email_queue_wake`, `email_queue_dispatch`) e em `src/components/admin/WhatsAppAdminPanel.tsx`.
5. `.env` e `src/integrations/supabase/client.ts` gerados automaticamente pela Lovable.
6. `supabase/config.toml` gerado automaticamente (contém `project_id` divergente: `pnkhogpsadywdbgzqhfi`).
