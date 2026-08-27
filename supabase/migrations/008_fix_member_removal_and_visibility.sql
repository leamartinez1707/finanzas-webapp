-- ============================================================
-- Fix household_members RLS gaps found by inspecting the LIVE
-- policies (not the ones in 004_rls_core_tables.sql, which — per
-- 006/007 — already diverged from what's actually deployed):
--
--   members_delete: qual was `user_id = auth.uid()` only — a
--     household creator could never actually remove another member;
--     the client-side delete silently affected 0 rows (no RLS error)
--     and the member reappeared on the next refresh.
--   members_select: qual was `true` — any authenticated user could
--     read household_members rows for ANY household, not just their
--     own.
--
-- Also adds profiles.default_context so a user can pick which
-- context (personal or a given household) the app should land on
-- by default, instead of always resetting to personal on load.
--
-- CREATE OR REPLACE POLICY doesn't exist in Postgres, so these are
-- drop + recreate under the same live names.
-- ============================================================

drop policy if exists "members_delete" on public.household_members;
create policy "members_delete" on public.household_members
  for delete to authenticated using (
    user_id = (select auth.uid()) or private.is_household_creator(household_id)
  );

drop policy if exists "members_select" on public.household_members;
create policy "members_select" on public.household_members
  for select to authenticated using (private.is_household_member(household_id));

alter table public.profiles
  add column if not exists default_context text;
