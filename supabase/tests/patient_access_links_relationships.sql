-- Run as an administrative test session; all inserted links are rolled back.
-- Uses existing relationships without changing patients or appointments.
begin;
do $setup$ declare v jsonb; begin
select jsonb_build_object('owner',a.psychologist_id,'patient',a.patient_id,'appointment',a.id,'other_patient',p.id,'other_owner',p.psychologist_id,'mismatch_patient',(select p2.id from public.patients p2 where p2.psychologist_id=a.psychologist_id and p2.id<>a.patient_id limit 1)) into v
from public.appointments a join public.patients own on own.id=a.patient_id and own.psychologist_id=a.psychologist_id
cross join public.patients p where p.psychologist_id<>a.psychologist_id and own.deleted_at is null and a.deleted_at is null and exists(select 1 from public.patients p2 where p2.psychologist_id=a.psychologist_id and p2.id<>a.patient_id) limit 1;
if v is null then raise exception 'Missing test fixture'; end if;
perform set_config('audit.link_context',v::text,true);
perform set_config('request.jwt.claims',jsonb_build_object('sub',v->>'owner','role','authenticated')::text,true);
end $setup$;
set local role authenticated;
do $test$ declare c jsonb:=current_setting('audit.link_context')::jsonb; link_id uuid; n int; begin
insert into public.patient_access_links(patient_id,appointment_id,created_by,expires_at)
values((c->>'patient')::uuid,(c->>'appointment')::uuid,(c->>'owner')::uuid,now()+interval '1 hour') returning id into link_id;
update public.patient_access_links set is_revoked=true where id=link_id;
get diagnostics n=row_count; if n<>1 then raise exception 'Valid update rejected'; end if;
begin
insert into public.patient_access_links(patient_id,created_by,expires_at) values((c->>'other_patient')::uuid,(c->>'owner')::uuid,now()+interval '1 hour');
raise exception 'Cross-owner insert accepted';
exception when insufficient_privilege then null; end;
begin
update public.patient_access_links set patient_id=(c->>'other_patient')::uuid where id=link_id;
raise exception 'Cross-owner update accepted';
exception when insufficient_privilege then null; end;
begin
update public.patient_access_links set created_by=(c->>'other_owner')::uuid where id=link_id;
raise exception 'Creator reassignment accepted';
exception when insufficient_privilege then null; end;
insert into public.patient_access_links(patient_id,created_by,expires_at)
values((c->>'patient')::uuid,(c->>'owner')::uuid,now()+interval '1 hour');
begin
insert into public.patient_access_links(patient_id,appointment_id,created_by,expires_at)
values((c->>'mismatch_patient')::uuid,(c->>'appointment')::uuid,(c->>'owner')::uuid,now()+interval '1 hour');
raise exception 'Mismatched appointment accepted';
exception when insufficient_privilege then null; end;
begin
update public.patient_access_links set patient_id=(c->>'mismatch_patient')::uuid where id=link_id;
raise exception 'Mismatched appointment update accepted';
exception when insufficient_privilege then null; end;
end $test$;
reset role;
rollback;
