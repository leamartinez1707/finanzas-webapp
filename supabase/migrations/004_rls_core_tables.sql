-- ============================================================
-- RLS for core tables: profiles, households, household_members,
-- household_invites, expenses, goals, goal_contributions,
-- savings_accounts, savings_movements.
--
-- Uses security definer helper functions in a private (non-exposed)
-- schema to avoid "infinite recursion detected in policy" errors
-- that inline self-referencing subqueries on household_members /
-- households would otherwise cause.
-- ============================================================

create schema if not exists private;

-- ─── helper functions ──────────────────────────────────────────────

create or replace function private.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.activo = true
  );
$$;

revoke execute on function private.is_household_member(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated;

create or replace function private.is_household_creator(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from households h
    where h.id = p_household_id
      and h.creado_por = (select auth.uid())
  );
$$;

revoke execute on function private.is_household_creator(uuid) from public, anon;
grant execute on function private.is_household_creator(uuid) to authenticated;

create or replace function private.has_pending_invite(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_invites hi
    where hi.household_id = p_household_id
      and hi.estado = 'pendiente'
      and hi.expira_en > now()
      and lower(hi.email_invitado) = lower((select auth.email()))
  );
$$;

revoke execute on function private.has_pending_invite(uuid) from public, anon;
grant execute on function private.has_pending_invite(uuid) to authenticated;

create or replace function private.can_access_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from goals g
    where g.id = p_goal_id
      and (
        (g.scope = 'personal' and g.user_id = (select auth.uid()))
        or (g.scope = 'household' and private.is_household_member(g.household_id))
      )
  );
$$;

revoke execute on function private.can_access_goal(uuid) from public, anon;
grant execute on function private.can_access_goal(uuid) to authenticated;

-- ─── enable RLS ─────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.expenses enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.savings_accounts enable row level security;
alter table public.savings_movements enable row level security;

-- ─── profiles ───────────────────────────────────────────────────────

create policy "Users can view own profile or shared household members" on public.profiles
  for select to authenticated using (
    id = (select auth.uid())
    or exists (
      select 1 from household_members hm1
      join household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.user_id = (select auth.uid()) and hm1.activo
        and hm2.user_id = profiles.id and hm2.activo
    )
  );

create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─── households ─────────────────────────────────────────────────────

create policy "Members and creators can view household" on public.households
  for select to authenticated using (
    private.is_household_member(id) or creado_por = (select auth.uid())
  );

create policy "Users can create households" on public.households
  for insert to authenticated with check (creado_por = (select auth.uid()));

create policy "Members can update household" on public.households
  for update to authenticated
  using (private.is_household_member(id))
  with check (private.is_household_member(id));

-- ─── household_members ──────────────────────────────────────────────

create policy "Members can view household membership" on public.household_members
  for select to authenticated using (private.is_household_member(household_id));

create policy "Creator or invited user can join household" on public.household_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (private.is_household_creator(household_id) or private.has_pending_invite(household_id))
  );

create policy "Members can leave or be removed by creator" on public.household_members
  for delete to authenticated using (
    user_id = (select auth.uid()) or private.is_household_creator(household_id)
  );

-- ─── household_invites ──────────────────────────────────────────────

create policy "Members or invitee can view invite" on public.household_invites
  for select to authenticated using (
    private.is_household_member(household_id)
    or lower(email_invitado) = lower((select auth.email()))
  );

create policy "Members can create invites" on public.household_invites
  for insert to authenticated with check (
    private.is_household_member(household_id) and invitado_por = (select auth.uid())
  );

create policy "Members or invitee can update invite" on public.household_invites
  for update to authenticated
  using (
    private.is_household_member(household_id)
    or lower(email_invitado) = lower((select auth.email()))
  )
  with check (
    private.is_household_member(household_id)
    or lower(email_invitado) = lower((select auth.email()))
  );

create policy "Members can delete invites" on public.household_invites
  for delete to authenticated using (private.is_household_member(household_id));

-- ─── expenses ────────────────────────────────────────────────────────

create policy "Owner or household member can view expenses" on public.expenses
  for select to authenticated using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "Owner or household member can insert expenses" on public.expenses
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      (scope = 'personal' and user_id = (select auth.uid()))
      or (
        scope = 'household'
        and private.is_household_member(household_id)
        and exists (
          select 1 from household_members hm
          where hm.household_id = expenses.household_id
            and hm.user_id = expenses.payer_id
            and hm.activo = true
        )
      )
    )
  );

create policy "Owner or household member can update expenses" on public.expenses
  for update to authenticated
  using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  )
  with check (
    user_id = (select auth.uid())
    and (
      (scope = 'personal' and user_id = (select auth.uid()))
      or (
        scope = 'household'
        and private.is_household_member(household_id)
        and exists (
          select 1 from household_members hm
          where hm.household_id = expenses.household_id
            and hm.user_id = expenses.payer_id
            and hm.activo = true
        )
      )
    )
  );

create policy "Owner or household member can delete expenses" on public.expenses
  for delete to authenticated using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

-- ─── goals ───────────────────────────────────────────────────────────

create policy "Owner or household member can view goals" on public.goals
  for select to authenticated using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "Owner or household member can insert goals" on public.goals
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      (scope = 'personal' and user_id = (select auth.uid()))
      or (scope = 'household' and private.is_household_member(household_id))
    )
  );

create policy "Owner or household member can update goals" on public.goals
  for update to authenticated
  using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  )
  with check (
    user_id = (select auth.uid())
    and (
      (scope = 'personal' and user_id = (select auth.uid()))
      or (scope = 'household' and private.is_household_member(household_id))
    )
  );

create policy "Owner or household member can delete goals" on public.goals
  for delete to authenticated using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

-- ─── goal_contributions ─────────────────────────────────────────────

create policy "Accessible goal contributions can be viewed" on public.goal_contributions
  for select to authenticated using (private.can_access_goal(goal_id));

create policy "Accessible goal contributions can be inserted" on public.goal_contributions
  for insert to authenticated with check (
    private.can_access_goal(goal_id) and user_id = (select auth.uid())
  );

create policy "Accessible goal contributions can be deleted" on public.goal_contributions
  for delete to authenticated using (private.can_access_goal(goal_id));

-- ─── savings_accounts ────────────────────────────────────────────────

create policy "Owner can view savings account" on public.savings_accounts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Owner can insert savings account" on public.savings_accounts
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Owner can update savings account" on public.savings_accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owner can delete savings account" on public.savings_accounts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── savings_movements ───────────────────────────────────────────────

create policy "Owner or household member can view savings movements" on public.savings_movements
  for select to authenticated using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "Owner or household member can insert savings movements" on public.savings_movements
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      (scope = 'personal' and user_id = (select auth.uid()))
      or (scope = 'household' and private.is_household_member(household_id))
    )
  );

create policy "Owner or household member can update savings movements" on public.savings_movements
  for update to authenticated
  using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  )
  with check (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "Owner or household member can delete savings movements" on public.savings_movements
  for delete to authenticated using (
    (scope = 'personal' and user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );
