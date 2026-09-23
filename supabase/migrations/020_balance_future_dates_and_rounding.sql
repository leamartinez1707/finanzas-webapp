-- ============================================================
-- Dos bugs de saldos, reportados juntos:
--
-- 1) Un gasto con fecha FUTURA (cargado en septiembre pero fechado en
--    octubre) contaba en la deuda de hoy: los agregados de 018 suman
--    todo el historial sin tope de fecha. Peor aún, la línea "Saldo
--    anterior" del BalanceCard sale de `total - loDeEsteMes`, así que
--    ese gasto de octubre aparecía como saldo arrastrado de agosto.
--    Ahora todo lo que responde "cuánto se debe HOY" corta en la fecha
--    de hoy; el gasto empieza a contar solo cuando llega su mes.
--
-- 2) La parte de cada miembro se redondeaba por separado, así que las
--    partes no sumaban el monto del gasto: con 2 personas y un monto
--    impar los dos redondeaban para arriba ($4.567 → $2.284 c/u =
--    $4.568). La suma de los netos del hogar dejaba de dar 0 y cada
--    miembro veía un total de deuda distinto al del otro ($1 de
--    diferencia por cada gasto impar, acumulativo). Ahora el que pagó
--    absorbe el resto del redondeo y las partes suman exacto.
--
-- De paso, el cálculo de la parte estaba copiado en TRES funciones de
-- 018 (get_household_balances, get_unsettled_expense_ids,
-- get_my_household_expense_share_totals) — que es exactamente por qué
-- se desincronizan. Acá se extrae a private.expense_share() y las tres
-- pasan a llamarla. Su gemelo client-side es expenseShare() en
-- lib/balance.ts: si cambia una, cambia la otra.
-- ============================================================

-- ─── helpers ────────────────────────────────────────────────────────

-- "Hoy" en hora local de Uruguay, no en UTC: con current_date (UTC) un
-- gasto fechado mañana empezaría a contar hoy a las 21:00 local.
create or replace function private.today_local()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Montevideo')::date;
$$;

revoke execute on function private.today_local() from public, anon;
grant execute on function private.today_local() to authenticated;

-- Equivalente SQL de expenseShare() (lib/balance.ts): shares (override
-- manual) > split_snapshot (congelado al crear el gasto) > 1/N parejo.
-- Ambos jsonb con claves camelCase ([{memberId, amount}] /
-- [{memberId, percent}]), tal cual las guarda addExpense() en
-- queries.ts — NO son snake_case.
--
-- En los dos caminos que redondean, el pagador recibe el monto menos la
-- suma de las partes (redondeadas) del resto, así las partes cierran
-- exacto. Si el pagador no figura en el split_snapshot, el resto suma
-- ~100% y le queda ~0, que es lo correcto.
create or replace function private.expense_share(
  p_amount         numeric,
  p_payer_id       uuid,
  p_shares         jsonb,
  p_split_snapshot jsonb,
  p_member_id      uuid,
  p_member_count   int
)
returns numeric
language sql
immutable
as $$
  select case
    when p_shares is not null then coalesce((
      select (elem->>'amount')::numeric
      from jsonb_array_elements(p_shares) elem
      where elem->>'memberId' = p_member_id::text
    ), 0)

    when p_split_snapshot is not null then
      case when p_member_id = p_payer_id
        then p_amount - coalesce((
          select sum(round(p_amount * (elem->>'percent')::numeric / 100))
          from jsonb_array_elements(p_split_snapshot) elem
          where elem->>'memberId' <> p_payer_id::text
        ), 0)
        else round(p_amount * coalesce((
          select (elem->>'percent')::numeric
          from jsonb_array_elements(p_split_snapshot) elem
          where elem->>'memberId' = p_member_id::text
        ), 0) / 100)
      end

    when p_member_count > 1 then
      case when p_member_id = p_payer_id
        then p_amount - round(p_amount / p_member_count) * (p_member_count - 1)
        else round(p_amount / p_member_count)
      end

    else p_amount
  end;
$$;

revoke execute on function private.expense_share(numeric, uuid, jsonb, jsonb, uuid, int) from public, anon;
grant execute on function private.expense_share(numeric, uuid, jsonb, jsonb, uuid, int) to authenticated;

-- ─── get_household_balances ─────────────────────────────────────────
-- Igual que en 018, pero cortando en la fecha de hoy y delegando el
-- cálculo de la parte en private.expense_share().
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
    select e.*
    from expenses e
    where e.household_id = p_household_id
      and e.scope = 'household'
      and e.fecha <= private.today_local()
  ),
  hh_repayments as (
    select r.*
    from repayments r
    where r.household_id = p_household_id
      and r.date <= private.today_local()
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
      private.expense_share(
        e.monto, e.payer_id, e.shares, e.split_snapshot,
        m.user_id, (select n from member_count)
      ) as share
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
-- Igual que en 018 (cuenta corriente: los pagos ya hechos se descuentan
-- de los gastos más viejos primero), pero con el mismo corte de fecha y
-- private.expense_share(). Un gasto que todavía no pasó no se puede
-- saldar, así que tampoco se ofrece como "gasto relacionado".
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
      private.expense_share(
        e.monto, e.payer_id, e.shares, e.split_snapshot,
        p_debtor_id, (select n from member_count)
      ) as share
    from expenses e
    where e.household_id = p_household_id
      and e.scope = 'household'
      and e.moneda = p_currency
      and e.payer_id = p_creditor_id
      and e.payer_id <> p_debtor_id
      and e.fecha <= private.today_local()
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
      and date <= private.today_local()
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
-- Mismo corte: un ingreso fechado la semana que viene no puede inflar
-- el "Disponible" de hoy.

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
  where scope = 'personal'
    and user_id = (select auth.uid())
    and fecha <= private.today_local()
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
  where sm.scope = 'household'
    and sm.household_id = p_household_id
    and sm.fecha <= private.today_local()
  group by sm.user_id, sm.bucket;
end;
$$;

revoke execute on function public.get_household_savings_totals(uuid) from public, anon;
grant execute on function public.get_household_savings_totals(uuid) to authenticated;

-- ─── Totales para "Disponible" ──────────────────────────────────────
-- Igual que en 018 (incluido el corte por `ingresos_start`: desde tu
-- primer movimiento de Ingresos, no desde el principio de los tiempos),
-- más el corte por fecha de hoy.

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
    and fecha <= private.today_local()
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
    where e.scope = 'household'
      and e.fecha >= ingresos_start.fecha
      and e.fecha <= private.today_local()
  )
  select
    e.moneda as currency,
    sum(private.expense_share(
      e.monto, e.payer_id, e.shares, e.split_snapshot,
      (select auth.uid()), mc.n
    )) as total
  from hh_expenses e
  join member_count mc on mc.household_id = e.household_id
  group by e.moneda;
end;
$$;

revoke execute on function public.get_my_household_expense_share_totals() from public, anon;
grant execute on function public.get_my_household_expense_share_totals() to authenticated;
