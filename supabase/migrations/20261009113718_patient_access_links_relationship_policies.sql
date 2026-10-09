alter policy "Psychologists can create access links" on public.patient_access_links with check ((select auth.uid()) = created_by
and exists (select 1 from public.patients p where p.id=patient_access_links.patient_id and p.psychologist_id=(select auth.uid()))
and (appointment_id is null or exists (select 1 from public.appointments a where a.id=patient_access_links.appointment_id and a.patient_id=patient_access_links.patient_id and a.psychologist_id=(select auth.uid()))));
alter policy "Psychologists can update their access links" on public.patient_access_links using ((select auth.uid())=created_by) with check ((select auth.uid()) = created_by
and exists (select 1 from public.patients p where p.id=patient_access_links.patient_id and p.psychologist_id=(select auth.uid()))
and (appointment_id is null or exists (select 1 from public.appointments a where a.id=patient_access_links.appointment_id and a.patient_id=patient_access_links.patient_id and a.psychologist_id=(select auth.uid()))));
