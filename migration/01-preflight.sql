-- =====================================================================
-- 01-preflight.sql  —  SOMENTE LEITURA
-- Rodar na ORIGEM (Lovable Cloud) antes do backup final.
-- Nenhuma instrução altera dados ou estrutura. Nada de DDL/DML.
-- Salve a saída de cada bloco para comparar depois com o destino.
-- =====================================================================

-- 1) Contagem exata por tabela --------------------------------------------------
select table_name,
       (xpath('/row/c/text()',
         query_to_xml(format('select count(*) as c from public.%I', table_name),
                      false, true, '')))[1]::text::bigint as rows
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

-- 2) Identidade / Auth ---------------------------------------------------------
select (select count(*) from auth.users)      as auth_users,
       (select count(*) from auth.identities) as identities,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from public.user_roles) as user_roles;

select id, email, created_at, last_sign_in_at,
       (email_confirmed_at is not null) as email_confirmed
from auth.users order by created_at;

select user_id, provider from auth.identities order by user_id;

-- 3) Órfãos (deve retornar 0 linhas em todas) ----------------------------------
select 'profiles sem auth.user' as check, count(*) from public.profiles p
  where not exists (select 1 from auth.users u where u.id = p.id)
union all select 'user_roles órfão', count(*) from public.user_roles r
  where not exists (select 1 from auth.users u where u.id = r.user_id)
union all select 'patients sem psicologo', count(*) from public.patients x
  where not exists (select 1 from public.profiles p where p.id = x.psychologist_id)
union all select 'appointments sem paciente', count(*) from public.appointments a
  where not exists (select 1 from public.patients p where p.id = a.patient_id)
union all select 'medical_records sem paciente', count(*) from public.medical_records m
  where not exists (select 1 from public.patients p where p.id = m.patient_id)
union all select 'financial sem paciente', count(*) from public.financial_transactions f
  where not exists (select 1 from public.patients p where p.id = f.patient_id);

-- 4) Assinatura estrutural (comparar hash origem x destino) --------------------
select md5(string_agg(sig, '|' order by sig)) as schema_fingerprint
from (
  select table_name||'.'||column_name||':'||data_type||':'||is_nullable as sig
  from information_schema.columns where table_schema = 'public'
) s;

select count(*) as fks from information_schema.table_constraints
  where table_schema='public' and constraint_type='FOREIGN KEY';
select count(*) as pks from information_schema.table_constraints
  where table_schema='public' and constraint_type='PRIMARY KEY';
select count(*) as uniques from information_schema.table_constraints
  where table_schema='public' and constraint_type='UNIQUE';
select count(*) as checks from information_schema.table_constraints
  where table_schema='public' and constraint_type='CHECK';
select count(*) as indexes from pg_indexes where schemaname='public';
select count(*) as public_policies from pg_policies where schemaname='public';
select count(*) as storage_policies from pg_policies where schemaname='storage';
select count(*) as triggers_public from information_schema.triggers where trigger_schema='public';
select count(*) as functions_public from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';

-- 5) Objetos que o dump de `public` NÃO carrega -------------------------------
select tgname, relname from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='auth' and not t.tgisinternal;           -- triggers de auth.users
select jobname, schedule, command from cron.job order by jobname;
select name from vault.secrets order by name;              -- só nomes
select extname, extversion from pg_extension order by extname;
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by name;
select bucket_id, count(*) objects, sum((metadata->>'size')::bigint) bytes
  from storage.objects group by 1 order by 1;
select bucket_id, name from storage.objects order by bucket_id, name;  -- lista de paths a copiar

-- 6) Enums ---------------------------------------------------------------------
select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder)
from pg_type t join pg_enum e on e.enumtypid=t.oid
join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'
group by t.typname order by 1;

-- 7) Grants relevantes ---------------------------------------------------------
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated','service_role')
group by 1,2 order by 1,2;

select p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join (select rolname from pg_roles where rolname in ('anon','authenticated')) r
where n.nspname='public' and p.prosecdef
order by 1,2;
