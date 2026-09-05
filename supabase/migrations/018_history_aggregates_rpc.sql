-- ============================================================
-- Agregados server-side para saldos/totales que hoy se calculan
-- client-side sumando el historial COMPLETO de expenses/repayments/
-- savings_movements (lib/balance.ts, ahorros/page.tsx, ingresos/page.tsx).
--
-- Esto habilita que loadData() (lib/store.tsx) deje de traer el
-- historial entero: los totales (que necesitan TODO el historial
-- para ser correctos) se calculan acá; el cliente solo pide una
-- ventana reciente de filas crudas para listar/mostrar.
--
-- Como toda función nueva en este proyecto, EXECUTE se otorga a
-- PUBLIC por default al crearla — hay que revocarlo explícitamente
-- de public/anon además de otorgarlo a authenticated (mismo gotcha
-- ya documentado en 014_ahorros_bucket.sql y 017).
-- ============================================================

-- Índice nuevo: los agregados por hogar (get_household_savings_totals)
-- filtran por household_id + bucket; el único índice existente en
-- savings_movements es por user_id (013/014).
create index if not exists idx_savings_movements_household
  on public.savings_movements(household_id, bucket)
  where scope = 'household';

-- ─── get_household_balances ─────────────────────────────────────────
-- Equivalente SQL de computeBalances() sin filtro de mes (lib/balance.ts).
-- Replica expenseShare(): shares (override manual) > split_snapshot
-- (congelado al crear el gasto) > 1/N parejo. Ambas columnas son jsonb
-- con claves camelCase ([{memberId, amount}] / [{memberId, percent}]),
-- tal cual las guarda addExpense() en queries.ts — NO son snake_case.
--
-- member_count NO filtra household_members.activo, a propósito: así
-- arma memberIds.length el cliente hoy (getMyHouseholds no filtra
-- activo en el segundo query). Si eso cambia en el cliente, cambiar
-- acá también o el share calculado va a divergir.
create or replace function public.get_household_balances(p_household_id uuid)
returns table(
  member_id uuid,
  currency  text,
  paid      numeric,
  share     numeric,
  outgoing  numeric,
  incoming  numeric,
  net       numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_household_member(p_household_id) then
    return;
  end if;

  return query
  with member_count as (
    select count(*)::int as n
    from household_members
    where household_id = p_household_id
  ),
  hm as (
    select user_id from household_members where household_id = p_household_id
  ),
  hh_expenses as (
    select * from expenses where household_id = p_household_id and scope = 'household'
  ),
  hh_repayments as (
    select * from repayments where household_id = p_household_id
  ),
  currencies as (
    select moneda as currency from hh_expenses
    union
    select hh_repayments.currency from hh_repayments
  ),
  paid_totals as (
    select payer_id as member_id, moneda as currency, sum(monto) as paid
    from hh_expenses
    group by payer_id, moneda
  ),
  share_rows as (
    select
      m.user_id as member_id,
      e.moneda as currency,
      case
        when e.shares is not null then coalesce((
          select (elem->>'amount')::numeric
          from jsonb_array_elements(e.shares) elem
          where elem->>'memberId' = m.user_id::text
        ), 0)
        when e.split_snapshot is not null then round(e.monto * coalesce((
          select (elem->>'percent')::numeric
          from jsonb_array_elements(e.split_snapshot) elem
          where elem->>'memberId' = m.user_id::text
        ), 0) / 100)
        else case
          when (select n from member_count) > 1 then round(e.monto / (select n from member_count))
          else e.monto
        end
      end as share
    from hh_expenses e
    cross join hm m
  ),
  -- `currency` sin calificar acá sería ambiguo: esta función es plpgsql y
  -- `returns table(..., currency text, ...)` convierte `currency` en una
  -- variable de la función, que choca con la columna real de share_rows/
  -- hh_repayments si no se la califica con el nombre de la CTE/tabla.
  share_totals as (
    select share_rows.member_id, share_rows.currency, sum(share_rows.share) as share
    from share_rows
    group by share_rows.member_id, share_rows.currency
  ),
  outgoing_totals as (
    select hh_repayments.from_id as member_id, hh_repayments.currency, sum(hh_repayments.amount) as outgoing
    from hh_repayments
    group by hh_repayments.from_id, hh_repayments.currency
  ),
  incoming_totals as (
    select hh_repayments.to_id as member_id, hh_repayments.currency, sum(hh_repayments.amount) as incoming
    from hh_repayments
    group by hh_repayments.to_id, hh_repayments.currency
  )
  select
    m.user_id,
    c.currency,
    coalesce(pt.paid, 0),
    coalesce(st.share, 0),
    coalesce(ot.outgoing, 0),
    coalesce(it.incoming, 0),
    coalesce(pt.paid, 0) - coalesce(st.share, 0) + coalesce(ot.outgoing, 0) - coalesce(it.incoming, 0)
  from hm m
  cross join currencies c
  left join paid_totals pt on pt.member_id = m.user_id and pt.currency = c.currency
  left join share_totals st on st.member_id = m.user_id and st.currency = c.currency
  left join outgoing_totals ot on ot.member_id = m.user_id and ot.currency = c.currency
  left join incoming_totals it on it.member_id = m.user_id and it.currency = c.currency;
end;
$$;

revoke execute on function public.get_household_balances(uuid) from public, anon;
grant execute on function public.get_household_balances(uuid) to authenticated;

-- ─── get_unsettled_expense_ids ──────────────────────────────────────
-- Equivalente SQL de unsettledExpenseIds() (lib/balance.ts) — trata la
-- deuda entre debtor/creditor como cuenta corriente: se descuentan los
-- pagos ya hechos de los gastos más viejos primero. El JS original hace
-- esto con un loop que resta `alreadyPaid -= share` en orden cronológico;
-- acá es equivalente a una window function: un gasto queda "impago" si
-- la suma acumulada de shares hasta ese gasto (inclusive, ordenado por
-- fecha/id) supera lo ya pagado. Como running_total es estrictamente
-- creciente (solo se consideran shares > 0), una vez que un gasto queda
-- impago todos los posteriores en la cuenta corriente también quedan
-- impagos — no hace falta loop procedural.
--
-- Se llama on-demand (RepaymentForm), nunca desde loadData(), así el
-- resultado nunca queda acotado por la ventana de historial cargada.
create or replace function public.get_unsettled_expense_ids(
  p_household_id uuid,
  p_debtor_id    uuid,
  p_creditor_id  uuid,
  p_currency     text
)
returns table(expense_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_household_member(p_household_id) then
    return;
  end if;

  return query
  with member_count as (
    select count(*)::int as n
    from household_members
    where household_id = p_household_id
  ),
  owed as (
    select
      e.id,
      e.fecha,
      case
        when e.shares is not null then coalesce((
          select (elem->>'amount')::numeric
          from jsonb_array_elements(e.shares) elem
          where elem->>'memberId' = p_debtor_id::text
        ), 0)
        when e.split_snapshot is not null then round(e.monto * coalesce((
          select (elem->>'percent')::numeric
          from jsonb_array_elements(e.split_snapshot) elem
          where elem->>'memberId' = p_debtor_id::text
        ), 0) / 100)
        else case
          when (select n from member_count) > 1 then round(e.monto / (select n from member_count))
          else e.monto
        end
      end as share
    from expenses e
    where e.household_id = p_household_id
      and e.scope = 'household'
      and e.moneda = p_currency
      and e.payer_id = p_creditor_id
      and e.payer_id <> p_debtor_id
  ),
  owed_positive as (
    select id, fecha, share from owed where share > 0
  ),
  paid as (
    select coalesce(sum(amount), 0) as total
    from repayments
    where household_id = p_household_id
      and from_id = p_debtor_id
      and to_id = p_creditor_id
      and currency = p_currency
  ),
  ordered as (
    select
      id,
      sum(share) over (order by fecha, id rows between unbounded preceding and current row) as running_total
    from owed_positive
  )
  select ordered.id
  from ordered, paid
  where paid.total < ordered.running_total - 0.01;
end;
$$;

revoke execute on function public.get_unsettled_expense_ids(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.get_unsettled_expense_ids(uuid, uuid, uuid, text) to authenticated;

-- ─── Totales de Ahorros/Ingresos ────────────────────────────────────
-- bucket 'ingresos' o 'ahorro' (014_ahorros_bucket.sql); balance =
-- suma de depósitos menos retiros, todo el historial.

create or replace function public.get_personal_savings_totals()
returns table(bucket text, balance numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    bucket,
    sum(case when tipo = 'deposito' then monto else -monto end) as balance
  from savings_movements
  where scope = 'personal' and user_id = (select auth.uid())
  group by bucket;
$$;

revoke execute on function public.get_personal_savings_totals() from public, anon;
grant execute on function public.get_personal_savings_totals() to authenticated;

create or replace function public.get_household_savings_totals(p_household_id uuid)
returns table(user_id uuid, bucket text, balance numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_household_member(p_household_id) then
    return;
  end if;

  return query
  select
    sm.user_id,
    sm.bucket,
    sum(case when sm.tipo = 'deposito' then sm.monto else -sm.monto end) as balance
  from savings_movements sm
  where sm.scope = 'household' and sm.household_id = p_household_id
  group by sm.user_id, sm.bucket;
end;
$$;

revoke execute on function public.get_household_savings_totals(uuid) from public, anon;
grant execute on function public.get_household_savings_totals(uuid) to authenticated;

-- ─── get_personal_expense_totals / get_my_household_expense_share_totals ──
-- Para "Disponible" en /inicio: personal + tu parte en cada household,
-- sobre TODO el historial — pero no desde el principio de los tiempos,
-- sino desde `ingresos_start` (la fecha de tu primer movimiento de
-- Ingresos personal). Sin este corte, un usuario que recién empieza a
-- cargar Ingresos vería restado el gasto de meses en los que ni siquiera
-- trackeaba su plata acá (ver discusión en el PR: comparar un Ingresos de
-- un mes contra un historial de gastos del hogar de varios meses no
-- cierra). El corte es automático por usuario (no una fecha hardcodeada)
-- y NO se resetea cada mes — evita el bug de "se olvida lo gastado" que
-- tendría una versión mes a mes.
--
-- Importante: esto es solo para el número personal de "Disponible". NO
-- toca get_household_balances/get_unsettled_expense_ids — la deuda real
-- entre miembros del hogar (quién pagó, quién debe) sigue calculándose
-- sobre todo el historial siempre, sin este corte, porque esa deuda es
-- real independientemente de cuándo cada uno empezó a trackear su propio
-- presupuesto personal acá.
--
-- Si el usuario nunca cargó Ingresos, ingresos_start cae a '1900-01-01'
-- (se comporta como "todo el historial", no rompe nada).

create or replace function public.get_personal_expense_totals()
returns table(currency text, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select moneda as currency, sum(monto) as total
  from expenses
  where scope = 'personal'
    and user_id = (select auth.uid())
    and fecha >= (
      select coalesce(min(fecha), '1900-01-01'::date)
      from savings_movements
      where scope = 'personal' and user_id = (select auth.uid()) and bucket = 'ingresos'
    )
  group by moneda;
$$;

revoke execute on function public.get_personal_expense_totals() from public, anon;
grant execute on function public.get_personal_expense_totals() to authenticated;

create or replace function public.get_my_household_expense_share_totals()
returns table(currency text, total numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with ingresos_start as (
    select coalesce(min(fecha), '1900-01-01'::date) as fecha
    from savings_movements
    where scope = 'personal' and user_id = (select auth.uid()) and bucket = 'ingresos'
  ),
  my_households as (
    select household_id
    from household_members
    where user_id = (select auth.uid())
  ),
  member_count as (
    select household_id, count(*)::int as n
    from household_members
    group by household_id
  ),
  hh_expenses as (
    select e.*
    from expenses e
    join my_households mh on mh.household_id = e.household_id
    cross join ingresos_start
    where e.scope = 'household' and e.fecha >= ingresos_start.fecha
  )
  select
    e.moneda as currency,
    sum(
      case
        when e.shares is not null then coalesce((
          select (elem->>'amount')::numeric
          from jsonb_array_elements(e.shares) elem
          where elem->>'memberId' = (select auth.uid())::text
        ), 0)
        when e.split_snapshot is not null then round(e.monto * coalesce((
          select (elem->>'percent')::numeric
          from jsonb_array_elements(e.split_snapshot) elem
          where elem->>'memberId' = (select auth.uid())::text
        ), 0) / 100)
        else case
          when mc.n > 1 then round(e.monto / mc.n)
          else e.monto
        end
      end
    ) as total
  from hh_expenses e
  join member_count mc on mc.household_id = e.household_id
  group by e.moneda;
end;
$$;

revoke execute on function public.get_my_household_expense_share_totals() from public, anon;
grant execute on function public.get_my_household_expense_share_totals() to authenticated;
