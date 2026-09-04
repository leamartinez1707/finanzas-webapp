-- ============================================================
-- savings_movements pasa a poder vivir en dos "cajas" separadas:
--   - 'ingresos': la plata con la que se pagan los gastos del mes
--     (todo lo que había en la tabla hasta ahora).
--   - 'ahorro': plata apartada, fuera del circuito de gasto.
-- Se agrega `bucket` con default 'ingresos' para no romper las filas
-- existentes, y una función que mueve plata de una caja a la otra en
-- un solo paso atómico (un retiro de 'ingresos' + un depósito en
-- 'ahorro', misma fecha).
-- ============================================================

alter table public.savings_movements
  add column if not exists bucket text not null default 'ingresos'
    check (bucket in ('ingresos', 'ahorro'));

create index if not exists idx_savings_movements_bucket
  on public.savings_movements(user_id, bucket, fecha desc);

-- No es security definer: corre con los mismos permisos que el
-- cliente, así que las policies de savings_movements se siguen
-- aplicando fila por fila, igual que si fueran dos inserts sueltos.
-- Los dos inserts corren dentro del mismo llamado a función, así que
-- son atómicos (si el segundo falla, el primero también se revierte).
create or replace function public.transferir_a_ahorro(
  p_monto numeric,
  p_fecha date,
  p_scope text,
  p_household_id uuid,
  p_nota text default null
)
returns setof public.savings_movements
language plpgsql
set search_path = public
as $$
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  return query
  with retiro as (
    insert into public.savings_movements (user_id, scope, household_id, bucket, tipo, monto, fecha, nota)
    values (
      (select auth.uid()), p_scope, p_household_id, 'ingresos', 'retiro',
      p_monto, p_fecha, coalesce(p_nota, 'Transferencia a ahorro')
    )
    returning *
  ), deposito as (
    insert into public.savings_movements (user_id, scope, household_id, bucket, tipo, monto, fecha, nota)
    values (
      (select auth.uid()), p_scope, p_household_id, 'ahorro', 'deposito',
      p_monto, p_fecha, coalesce(p_nota, 'Transferencia desde ingresos')
    )
    returning *
  )
  select * from retiro
  union all
  select * from deposito;
end;
$$;

revoke execute on function public.transferir_a_ahorro(numeric, date, text, uuid, text) from public;
grant execute on function public.transferir_a_ahorro(numeric, date, text, uuid, text) to authenticated;
