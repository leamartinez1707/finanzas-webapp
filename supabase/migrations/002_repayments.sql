-- Hand-authored fallback: the Supabase CLI is unavailable in this environment.
create table if not exists public.repayments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('UYU', 'USD', 'ARS', 'EUR')),
  date date not null default current_date,
  note text,
  expense_id uuid references public.expenses(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);

create index if not exists idx_repayments_household_date on public.repayments(household_id, date desc);
create index if not exists idx_repayments_from on public.repayments(from_id, currency);
create index if not exists idx_repayments_to on public.repayments(to_id, currency);
create index if not exists idx_repayments_expense on public.repayments(expense_id);

alter table public.repayments enable row level security;

create policy "Household members can view repayments" on public.repayments
  for select to authenticated using (exists (
    select 1 from public.household_members hm
    where hm.household_id = repayments.household_id and hm.user_id = (select auth.uid()) and hm.activo = true
  ));

create policy "Household members can create repayments" on public.repayments
  for insert to authenticated with check (
    exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = (select auth.uid()) and hm.activo = true)
    and exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = repayments.from_id and hm.activo = true)
    and exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = repayments.to_id and hm.activo = true)
    and created_by = (select auth.uid())
    and (repayments.expense_id is null or exists (
      select 1 from public.expenses e
      where e.id = repayments.expense_id
        and e.household_id = repayments.household_id
        and e.scope = 'household'
        and e.moneda = repayments.currency
    ))
  );

create policy "Household members can update repayments" on public.repayments
  for update to authenticated
  using (exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = (select auth.uid()) and hm.activo = true))
  with check (
    exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = (select auth.uid()) and hm.activo = true)
    and exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = repayments.from_id and hm.activo = true)
    and exists (select 1 from public.household_members hm where hm.household_id = repayments.household_id and hm.user_id = repayments.to_id and hm.activo = true)
    and (repayments.expense_id is null or exists (
      select 1 from public.expenses e
      where e.id = repayments.expense_id
        and e.household_id = repayments.household_id
        and e.scope = 'household'
        and e.moneda = repayments.currency
    ))
  );

create policy "Household members can delete repayments" on public.repayments
  for delete to authenticated using (exists (
    select 1 from public.household_members hm
    where hm.household_id = repayments.household_id and hm.user_id = (select auth.uid()) and hm.activo = true
  ));
