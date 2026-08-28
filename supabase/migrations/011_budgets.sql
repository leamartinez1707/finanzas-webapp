-- ============================================================
-- Category budgets ("presupuestos por categoría"): a monthly cap per
-- category, checked client-side against that month's expenses (no
-- server-side alerting/cron — same "no edge functions" posture as the
-- rest of this project). No DB-level uniqueness on (scope, category):
-- lib/supabase/queries.ts does the "one row per category" upsert at
-- the app level, same criterion already used elsewhere in this repo.
--
-- RLS mirrors the LIVE policy pattern on `recurring_expenses`
-- (009_recurring_expenses.sql) — short policy names,
-- `private.is_household_member()`, `to authenticated`. There's no
-- separate payer here (no `payer_id`), so the creator-must-be-active-
-- member check applies to `owner_id` directly instead of a `payer_id`.
-- ============================================================

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('household','personal')),
  household_id uuid references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  category public.expense_category not null,
  monto numeric(12,2) not null check (monto > 0),
  moneda text not null check (moneda in ('UYU','USD','ARS','EUR')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (scope = 'personal' or household_id is not null),
  check (scope = 'household' or household_id is null)
);

create index idx_budgets_household on public.budgets(household_id);
create index idx_budgets_owner on public.budgets(owner_id, scope);

-- ─── RLS ────────────────────────────────────────────────────────────

alter table public.budgets enable row level security;

create policy "budgets_select" on public.budgets
  for select to authenticated using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "budgets_insert" on public.budgets
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
          where hm.household_id = budgets.household_id
            and hm.user_id = budgets.owner_id
            and hm.activo = true
        )
      )
    )
  );

create policy "budgets_update" on public.budgets
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
          where hm.household_id = budgets.household_id
            and hm.user_id = budgets.owner_id
            and hm.activo = true
        )
      )
    )
  );

create policy "budgets_delete" on public.budgets
  for delete to authenticated using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );
