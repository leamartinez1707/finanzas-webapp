-- ============================================================
-- Tighten policy roles from `public` to `authenticated` where the
-- USING/WITH CHECK logic already depends on auth.uid()/auth.email()
-- (so an anon request always failed the condition anyway — this
-- closes the gap in role scoping itself, belt-and-suspenders, no
-- behavior change for real users). Flagged as lower-priority
-- cleanup in the same live-DB inspection that found the open
-- households/household_members/household_invites/profiles reads
-- fixed in 006_fix_open_access_policies.sql.
--
-- ALTER POLICY ... TO ... only rebinds the role — it does not
-- touch the existing USING/WITH CHECK expressions.
-- ============================================================

alter policy "expenses_insert" on public.expenses to authenticated;

alter policy "contributions_insert" on public.goal_contributions to authenticated;
alter policy "contributions_delete" on public.goal_contributions to authenticated;

alter policy "goals_insert" on public.goals to authenticated;

alter policy "invites_delete" on public.household_invites to authenticated;

alter policy "members_delete" on public.household_members to authenticated;

alter policy "households_delete" on public.households to authenticated;

alter policy "savings_mov_insert" on public.savings_movements to authenticated;
alter policy "savings_mov_update" on public.savings_movements to authenticated;
alter policy "savings_mov_delete" on public.savings_movements to authenticated;
