-- Supabase Storage for compliance proof files (Phase 5).
--
-- A PRIVATE bucket holding the actual filing document (challan/receipt PDF or
-- image) for each compliance deadline. Files live at `<ownerId>/<deadlineId>/<file>`.
-- Access goes through the Supabase client as the authenticated user, so the RLS
-- below (keyed to auth.uid() = the first path folder) confines each account to
-- its own files. The app's tabular data still goes through Prisma (postgres).
-- Re-runnable (idempotent).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compliance-proofs', 'compliance-proofs', false, 5242880,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg'];

-- Per-owner access: the first folder of the object path must be the caller's uid.
drop policy if exists "compliance_proofs_select" on storage.objects;
create policy "compliance_proofs_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'compliance-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "compliance_proofs_insert" on storage.objects;
create policy "compliance_proofs_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'compliance-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "compliance_proofs_update" on storage.objects;
create policy "compliance_proofs_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'compliance-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'compliance-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "compliance_proofs_delete" on storage.objects;
create policy "compliance_proofs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'compliance-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
