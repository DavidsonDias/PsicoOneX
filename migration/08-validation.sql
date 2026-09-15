-- =====================================================================
-- 08-validation.sql — SOMENTE LEITURA. Rodar no DESTINO após o import e
-- comparar linha por linha com a saída de 01-preflight.sql na ORIGEM.
-- =====================================================================

-- 1) Row counts (comparar com o preflight; devem ser idênticos) ---------------
select table_name,
       (xpath('/row/c/text()',
         query_to_xml(format('select count(*) as c from public.%I', table_name),
                      false, true, '')))[1]::text::bigint as rows
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE'
order by table_name;

-- Valores esperados (origem, 2026-09-15):
-- audit_logs 4854 | financial_transactions 763 | appointments 650
-- telehealth_sessions 489 | email_send_log 432 | notifications 354
-- medical_records 228 | patients 205 | patient_access_links 174
-- patient_onboarding_tokens 58 | email_unsubscribe_tokens 22
-- medical_record_attachments 20 | patient_status_history 16 | user_roles 15
-- profiles 14 | subscriptions 14 | medical_record_versions 12 | drafts 11
-- patient_onboarding_drafts 11 | whatsapp_logs 9 | patient_invites 5
-- suppressed_emails 4 | patient_billing_plans 3 | push_subscriptions 2
-- appointment_requests 1 | automation_rules 1 | email_send_state 1
-- google_calendar_tokens 1 | patient_portal_audit 1 | system_metadata 1
-- user_preferences 1 | whatsapp_config 1
-- appointment_messages 0 | integration_configs 0 | recurring_billings 0
-- TOTAL public = 7750 ; auth.users = 14 ; auth.identities = 15

-- 2) UUIDs de identidade preservados -----------------------------------------
select md5(string_agg(id::text, ',' order by id)) as users_fingerprint,
       count(*) from auth.users;
select md5(string_agg(id::text, ',' order by id)) as profiles_fingerprint,
       count(*) from public.profiles;
select md5(string_agg(user_id::text||':'||role::text, ',' order by user_id, role))
       as roles_fingerprint from public.user_roles;
select md5(string_agg(id::text, ',' order by id)) as patients_fingerprint,
       count(*) from public.patients;
select md5(string_agg(id::text, ',' order by id)) as appointments_fingerprint,
       count(*) from public.appointments;
select md5(string_agg(id::text, ',' order by id)) as records_fingerprint,
       count(*) from public.medical_records;
select md5(string_agg(id::text, ',' order by id)) as financial_fingerprint,
       count(*) from public.financial_transactions;

-- 3) Integridade referencial (todas devem retornar 0) ------------------------
select 'profiles órfão' k, count(*) v from public.profiles p
  where not exists (select 1 from auth.users u where u.id=p.id)
union all select 'user_roles órfão', count(*) from public.user_roles r
  where not exists (select 1 from auth.users u where u.id=r.user_id)
union all select 'patients sem psicologo', count(*) from public.patients x
  where not exists (select 1 from public.profiles p where p.id=x.psychologist_id)
union all select 'patients.user_id inválido', count(*) from public.patients x
  where x.user_id is not null and not exists (select 1 from auth.users u where u.id=x.user_id)
union all select 'appointments sem paciente', count(*) from public.appointments a
  where not exists (select 1 from public.patients p where p.id=a.patient_id)
union all select 'records sem paciente', count(*) from public.medical_records m
  where not exists (select 1 from public.patients p where p.id=m.patient_id)
union all select 'financial sem paciente', count(*) from public.financial_transactions f
  where not exists (select 1 from public.patients p where p.id=f.patient_id)
union all select 'anexos sem prontuario', count(*) from public.medical_record_attachments a
  where not exists (select 1 from public.medical_records m where m.id=a.medical_record_id)
union all select 'versoes sem prontuario', count(*) from public.medical_record_versions v
  where not exists (select 1 from public.medical_records m where m.id=v.record_id)
union all select 'telehealth sem appointment', count(*) from public.telehealth_sessions t
  where t.appointment_id is not null and not exists
        (select 1 from public.appointments a where a.id=t.appointment_id)
union all select 'financial sem plano', count(*) from public.financial_transactions f
  where f.billing_plan_id is not null and not exists
        (select 1 from public.patient_billing_plans b where b.id=f.billing_plan_id);

-- 4) Estrutura (comparar com o fingerprint do preflight) ---------------------
select md5(string_agg(sig, '|' order by sig)) as schema_fingerprint
from (select table_name||'.'||column_name||':'||data_type||':'||is_nullable as sig
      from information_schema.columns where table_schema='public') s;

select constraint_type, count(*) from information_schema.table_constraints
  where table_schema='public' group by 1 order by 1;
select count(*) as indexes from pg_indexes where schemaname='public';
select count(*) as policies_public from pg_policies where schemaname='public';   -- esperado 121
select count(*) as policies_storage from pg_policies where schemaname='storage'; -- esperado 9
select count(*) as triggers_public from information_schema.triggers where trigger_schema='public';
select count(*) as functions_public from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';          -- esperado 31
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and relkind='r' and relrowsecurity = false;           -- esperado 0 linhas

-- 5) Objetos que não vêm no dump --------------------------------------------
select tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='auth' and not t.tgisinternal;   -- esperado: os 2 triggers de auth.users
select jobname, schedule from cron.job order by 1; -- esperado: os 6 jobs
select name from vault.secrets;                    -- esperado: email_queue_service_role_key
select extname from pg_extension order by 1;       -- conferir pgmq, pg_cron, pg_net, pgcrypto, uuid-ossp

-- 6) Storage -----------------------------------------------------------------
select id, public from storage.buckets order by id;      -- 4 buckets, todos public=false
select bucket_id, count(*) from storage.objects group by 1 order by 1;
-- esperado: medical-attachments 23 | patient-documents 5 | database_export_11_09_26 1
select a.file_path from public.medical_record_attachments a
  where not exists (select 1 from storage.objects o
                    where o.bucket_id='medical-attachments' and o.name=a.file_path);
-- esperado: 0 linhas (todo anexo referenciado existe no bucket)

-- 7) URLs absolutas do host antigo ainda gravadas no banco -------------------
select 'profiles.avatar_url' col, count(*) from public.profiles
  where avatar_url like '%supabase.co%'
union all select 'profiles.logo_url', count(*) from public.profiles
  where logo_url like '%supabase.co%'
union all select 'financial.attachment_url', count(*) from public.financial_transactions
  where attachment_url like '%supabase.co%'
union all select 'financial.receipt_url', count(*) from public.financial_transactions
  where receipt_url like '%supabase.co%'
union all select 'patients.uploaded_documents', count(*) from public.patients
  where uploaded_documents::text like '%supabase.co%';
-- qualquer valor > 0 exige UPDATE controlado trocando o host

-- 8) EXECUTE nas funções críticas (todas devem ser true) --------------------
select p.proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
  ('has_role','is_admin','is_super_admin','is_subscription_active','get_email_by_username');
