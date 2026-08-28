-- ============================================================
-- Recurring expenses ("gastos recurrentes"): a template that the
-- client regenerates into a normal `expenses` row once per calendar
-- month, once its `dia_mes` is reached. No cron/edge functions in
-- this project — generation happens client-side in lib/store.tsx's
-- loadData(). The real duplicate-prevention barrier is the partial
-- unique index below, not the client logic: a duplicate insert hits
-- it and is caught (Postgres 23505) and ignored.
--
-- RLS mirrors the LIVE policy pattern on `expenses` — short policy
-- names, `private.is_household_member()`, `to authenticated` — per
-- 006_fix_open_access_policies.sql / 007_tighten_public_policy_roles.sql
-- / 008_fix_member_removal_and_visibility.sql, not the divergent
-- 004_rls_core_tables.sql.
-- ============================================================

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('household','personal')),
  household_id uuid references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payer_id uuid not null references auth.users(id) on delete cascade,
  descripcion text not null,
  categoria public.expense_category not null,
  monto numeric(12,2) not null check (monto > 0),
  moneda text not null check (moneda in ('UYU','USD','ARS','EUR')),
  dia_mes smallint not null check (dia_mes between 1 and 28),
  activo boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (scope = 'personal' or household_id is not null),
  check (scope = 'household' or household_id is null)
);

create index idx_recurring_expenses_household on public.recurring_expenses(household_id);
create index idx_recurring_expenses_owner on public.recurring_expenses(owner_id, scope);

alter table public.expenses
  add column recurring_expense_id uuid references public.recurring_expenses(id) on delete set null;

-- one generated expense per template per calendar month
-- (cast to `timestamp`, not `timestamptz`, so Postgres picks the
-- IMMUTABLE date_trunc overload — the timestamptz one is only STABLE,
-- since its result depends on the session timezone, and index
-- expressions must be IMMUTABLE)
create unique index expenses_recurring_month_uq
  on public.expenses (recurring_expense_id, (date_trunc('month', fecha::timestamp)::date))
  where recurring_expense_id is not null;

-- ─── RLS ────────────────────────────────────────────────────────────

alter table public.recurring_expenses enable row level security;

create policy "recurring_expenses_select" on public.recurring_expenses
  for select to authenticated using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "recurring_expenses_insert" on public.recurring_expenses
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and created_by = (select auth.uid())
    and (
      (scope = 'personal' and owner_id = (select auth.uid()))
      or (
        scope = 'household'
        and private.is_household_member(household_id)
        and exists (
          select 1 from household_members hm
          where hm.household_id = recurring_expenses.household_id
            and hm.user_id = recurring_expenses.payer_id
            and hm.activo = true
        )
      )
    )
  );

create policy "recurring_expenses_update" on public.recurring_expenses
  for update to authenticated
  using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  )
  with check (
    owner_id = (select auth.uid())
    and (
      (scope = 'personal' and owner_id = (select auth.uid()))
      or (
        scope = 'household'
        and private.is_household_member(household_id)
        and exists (
          select 1 from household_members hm
          where hm.household_id = recurring_expenses.household_id
            and hm.user_id = recurring_expenses.payer_id
            and hm.activo = true
        )
      )
    )
  );

create policy "recurring_expenses_delete" on public.recurring_expenses
  for delete to authenticated using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );
