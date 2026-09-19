-- Supabase wiring for the schema in 0000_init.sql.
--
-- Two things Drizzle cannot express, because they live outside our tables:
--   1. the trigger that creates a `profiles` row when someone signs up
--   2. row-level security, which is what actually stops one user reading
--      another's scans
--
-- Run after 0000_init.sql.

-- ─── 0. Link profiles to Supabase Auth ───────────────────────────────────────

-- Drizzle does not manage `auth.users`, so it cannot emit this foreign key.
-- Without it a profile could outlive the account it belongs to.
alter table public.profiles
  drop constraint if exists profiles_id_auth_users_fk;

alter table public.profiles
  add constraint profiles_id_auth_users_fk
  foreign key (id) references auth.users (id) on delete cascade;

-- ─── 1. Profile bootstrap ────────────────────────────────────────────────────

-- Supabase Auth owns `auth.users`; we mirror the parts we need into
-- `public.profiles` so the rest of the schema can foreign-key onto it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Supabase stores anything passed at sign-up under raw_user_meta_data.
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  -- The seed script inserts the admin profile before auth confirms it.
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keep the mirrored email in step if the user changes it.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  execute function public.handle_user_email_change();

-- ─── 2. Helpers ──────────────────────────────────────────────────────────────

-- Used by every admin policy below.
--
-- `security definer` matters: without it, reading `profiles` inside a
-- `profiles` policy would recurse. Defined once here rather than inlined into
-- each policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Does the current user own this scan? Several tables hang off `scans` and
-- need the same check.
create or replace function public.owns_scan(scan uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.scans
    where id = scan and user_id = auth.uid()
  );
$$;

-- ─── 3. Row-level security ───────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.scans            enable row level security;
alter table public.comments         enable row level security;
alter table public.comment_analyses enable row level security;
alter table public.saved_analyses   enable row level security;
alter table public.reports          enable row level security;
alter table public.feedback         enable row level security;
alter table public.model_metrics    enable row level security;
alter table public.usage_events     enable row level security;
alter table public.audit_log        enable row level security;

-- profiles ───────────────────────────────────────────────────────────────────

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- A user may edit their own profile but must not promote themselves.
    and role = (select role from public.profiles where id = auth.uid())
    and is_suspended = (select is_suspended from public.profiles where id = auth.uid())
  );

create policy "profiles_admin_update"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- scans ──────────────────────────────────────────────────────────────────────

create policy "scans_select_own"
  on public.scans for select
  using (user_id = auth.uid() or public.is_admin());

create policy "scans_insert_own"
  on public.scans for insert
  with check (user_id = auth.uid());

create policy "scans_update_own"
  on public.scans for update
  using (user_id = auth.uid() or public.is_admin());

create policy "scans_delete_own"
  on public.scans for delete
  using (user_id = auth.uid() or public.is_admin());

-- comments ───────────────────────────────────────────────────────────────────

create policy "comments_select_via_scan"
  on public.comments for select
  using (public.owns_scan(scan_id) or public.is_admin());

create policy "comments_insert_via_scan"
  on public.comments for insert
  with check (public.owns_scan(scan_id));

create policy "comments_delete_via_scan"
  on public.comments for delete
  using (public.owns_scan(scan_id) or public.is_admin());

-- comment_analyses ───────────────────────────────────────────────────────────

create policy "analyses_select_via_comment"
  on public.comment_analyses for select
  using (
    exists (
      select 1 from public.comments c
      where c.id = comment_id and public.owns_scan(c.scan_id)
    )
    or public.is_admin()
  );

create policy "analyses_insert_via_comment"
  on public.comment_analyses for insert
  with check (
    exists (
      select 1 from public.comments c
      where c.id = comment_id and public.owns_scan(c.scan_id)
    )
  );

-- saved_analyses ─────────────────────────────────────────────────────────────

create policy "saved_select_own"
  on public.saved_analyses for select
  using (user_id = auth.uid() or public.is_admin());

create policy "saved_insert_own"
  on public.saved_analyses for insert
  with check (user_id = auth.uid() and public.owns_scan(scan_id));

create policy "saved_update_own"
  on public.saved_analyses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "saved_delete_own"
  on public.saved_analyses for delete
  using (user_id = auth.uid() or public.is_admin());

-- reports ────────────────────────────────────────────────────────────────────

create policy "reports_select_own"
  on public.reports for select
  using (user_id = auth.uid() or public.is_admin());

create policy "reports_insert_own"
  on public.reports for insert
  with check (user_id = auth.uid() and public.owns_scan(scan_id));

create policy "reports_delete_own"
  on public.reports for delete
  using (user_id = auth.uid() or public.is_admin());

-- feedback ───────────────────────────────────────────────────────────────────

create policy "feedback_select_own"
  on public.feedback for select
  using (user_id = auth.uid() or public.is_admin());

create policy "feedback_insert_own"
  on public.feedback for insert
  with check (user_id = auth.uid());

-- A user may correct their own report; only an admin may triage it, so the
-- review columns are guarded by the separate admin policy below.
create policy "feedback_update_own"
  on public.feedback for update
  using (user_id = auth.uid() and status = 'open')
  with check (user_id = auth.uid());

create policy "feedback_admin_update"
  on public.feedback for update
  using (public.is_admin())
  with check (public.is_admin());

-- model_metrics ──────────────────────────────────────────────────────────────

-- Aggregate and anonymous: every signed-in user may read it, so the About page
-- can show real performance figures. Only the service role writes.
create policy "metrics_select_all"
  on public.model_metrics for select
  using (auth.role() = 'authenticated');

-- usage_events ───────────────────────────────────────────────────────────────

create policy "usage_select_own"
  on public.usage_events for select
  using (user_id = auth.uid() or public.is_admin());

create policy "usage_insert_own"
  on public.usage_events for insert
  with check (user_id = auth.uid());

-- audit_log ──────────────────────────────────────────────────────────────────

-- Admin-readable only. Nobody writes through this policy: entries are inserted
-- by the service role so a compromised session cannot forge or erase history.
create policy "audit_select_admin"
  on public.audit_log for select
  using (public.is_admin());

-- ─── 4. Storage ──────────────────────────────────────────────────────────────

-- Generated reports. Private: downloads go through signed URLs issued by the
-- server after it has checked ownership.
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Paths are `<user_id>/<report_id>.<ext>`, so the first segment is the owner.
create policy "reports_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "reports_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "reports_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
