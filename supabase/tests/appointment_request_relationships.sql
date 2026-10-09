-- Administrative regression test; temporary requests are rolled back.
begin;
do $setup$ declare v jsonb; begin
select jsonb_build_object('user',p.user_id,'patient',p.id,'owner',p.psychologist_id,'appointment',a.id,'other_appointment',b.id,'other_owner',b.psychologist_id) into v
from public.patients p join public.appointments a on a.patient_id=p.id and a.psychologist_id=p.psychologist_id
cross join public.appointments b where p.user_id is not null and b.psychologist_id<>p.psychologist_id limit 1;
if v is null then raise exception 'Missing fixture'; end if;
perform set_config('audit.request_context',v::text,true);
perform set_config('request.jwt.claims',jsonb_build_object('sub',v->>'user','role','authenticated')::text,true);
end $setup$;
set local role authenticated;
do $test$ declare c jsonb:=current_setting('audit.request_context')::jsonb; rid uuid; n integer; begin
insert into public.appointment_requests(patient_id,appointment_id,psychologist_id,request_type,status)
values((c->>'patient')::uuid,(c->>'appointment')::uuid,(c->>'owner')::uuid,'reschedule','pending') returning id into rid;
begin
insert into public.appointment_requests(patient_id,appointment_id,psychologist_id,request_type,status)
values((c->>'patient')::uuid,(c->>'other_appointment')::uuid,(c->>'owner')::uuid,'reschedule','pending');
raise exception 'Foreign appointment accepted';
exception when insufficient_privilege then null; end;
begin
insert into public.appointment_requests(patient_id,appointment_id,psychologist_id,request_type,status)
values((c->>'patient')::uuid,(c->>'appointment')::uuid,(c->>'other_owner')::uuid,'reschedule','pending');
raise exception 'Foreign professional accepted';
exception when insufficient_privilege then null; end;
perform set_config('request.jwt.claims',jsonb_build_object('sub',c->>'owner','role','authenticated')::text,true);
update public.appointment_requests set psychologist_response='Synthetic rollback test' where id=rid;
get diagnostics n=row_count; if n<>1 then raise exception 'Valid response rejected'; end if;
begin
update public.appointment_requests set appointment_id=(c->>'other_appointment')::uuid where id=rid;
raise exception 'Foreign appointment update accepted';
exception when insufficient_privilege then null; end;
begin
update public.appointment_requests set psychologist_id=(c->>'other_owner')::uuid where id=rid;
raise exception 'Owner reassignment accepted';
exception when insufficient_privilege then null; end;
end $test$;
reset role;
rollback;
