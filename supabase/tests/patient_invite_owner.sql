-- Administrative regression test; temporary invitations are rolled back.
begin;
do $setup$ declare c jsonb; begin
select jsonb_build_object('owner',p.psychologist_id,'patient',p.id,'other_patient',q.id,'other_owner',q.psychologist_id) into c
from public.patients p cross join public.patients q where p.psychologist_id<>q.psychologist_id limit 1;
if c is null then raise exception 'Missing fixture'; end if;
perform set_config('audit.invite_context',c::text,true);
perform set_config('request.jwt.claims',jsonb_build_object('sub',c->>'owner','role','authenticated')::text,true);
end $setup$;
set local role authenticated;
do $test$ declare c jsonb:=current_setting('audit.invite_context')::jsonb; rid uuid; n int; begin
insert into public.patient_invites(patient_id,psychologist_id,email) values((c->>'patient')::uuid,(c->>'owner')::uuid,'synthetic@example.invalid') returning id into rid;
update public.patient_invites set is_revoked=true where id=rid;
get diagnostics n=row_count; if n<>1 then raise exception 'Valid revocation failed'; end if;
begin
insert into public.patient_invites(patient_id,psychologist_id,email) values((c->>'other_patient')::uuid,(c->>'owner')::uuid,'synthetic@example.invalid');
raise exception 'Cross-owner insert accepted';
exception when insufficient_privilege then null; end;
begin
update public.patient_invites set patient_id=(c->>'other_patient')::uuid where id=rid;
raise exception 'Cross-owner update accepted';
exception when insufficient_privilege then null; end;
begin
update public.patient_invites set psychologist_id=(c->>'other_owner')::uuid where id=rid;
raise exception 'Reassignment accepted';
exception when insufficient_privilege then null; end;
end $test$;
reset role;
rollback;
