alter policy "Psychologists manage their invites" on public.patient_invites
using ((select auth.uid())=psychologist_id)
with check ((select auth.uid())=psychologist_id and exists (
select 1 from public.patients p where p.id=patient_invites.patient_id and p.psychologist_id=(select auth.uid())));
