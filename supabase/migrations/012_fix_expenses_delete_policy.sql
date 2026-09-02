-- ============================================================
-- Fix expenses RLS gap found by inspecting the LIVE policy:
--
--   expenses_delete: qual was `user_id = auth.uid()` only — the
--     person who logged a household expense was the only one who
--     could ever delete it, even though expenses_update already
--     lets any household member edit it. A different household
--     member's delete silently affected 0 rows (no RLS error), the
--     client's optimistic UI removed it anyway, and it reappeared
--     on the next refresh.
--
-- Brings expenses_delete in line with expenses_update's permission
-- model: the creator, or any active member of the expense's
-- household when it's household-scoped.
-- ============================================================

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (
    user_id = (select auth.uid())
    or (scope = 'household' and private.is_household_member(household_id))
  );
