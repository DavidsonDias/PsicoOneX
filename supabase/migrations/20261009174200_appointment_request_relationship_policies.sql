alter policy "Patients create own requests" on public.appointment_requests with check (
exists (select 1 from public.patients p join public.appointments a on a.patient_id=p.id
where p.id=appointment_requests.patient_id and p.user_id=(select auth.uid())
and a.id=appointment_requests.appointment_id
and a.psychologist_id=appointment_requests.psychologist_id
and p.psychologist_id=appointment_requests.psychologist_id));
alter policy "Psychologists can update their requests" on public.appointment_requests
using ((select auth.uid())=psychologist_id) with check (
(select auth.uid())=psychologist_id and exists (
select 1 from public.appointments a join public.patients p on p.id=a.patient_id
where a.id=appointment_requests.appointment_id
and a.patient_id=appointment_requests.patient_id
and a.psychologist_id=(select auth.uid()) and p.psychologist_id=(select auth.uid())));
