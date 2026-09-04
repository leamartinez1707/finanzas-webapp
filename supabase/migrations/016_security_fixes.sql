-- ============================================================
-- Auditoría de seguridad de políticas RLS (revisión completa de la
-- base pedida por el usuario) — 4 hallazgos, de más a menos grave.
-- Aplicado directo contra producción en su momento vía el MCP de
-- Supabase; este archivo lo documenta en el repo para que no quede
-- el mismo problema que esta misma auditoría encontró en 004_rls_
-- core_tables.sql: código que describe políticas que no son las que
-- están realmente vivas.
-- ============================================================

-- 1) CRÍTICO: household_members.members_update no tenía WITH CHECK.
-- Un usuario podía UPDATE su propia fila de household_members (la
-- USING clause solo pedía user_id = auth.uid()) y reasignarle
-- cualquier household_id — uniéndose a CUALQUIER hogar sin
-- invitación, saltándose por completo la lógica de members_insert
-- (que sí exige ser el creador o tener una invitación pendiente).
-- Todo usuario tiene al menos una fila propia (la que se crea al
-- crear su primer hogar), así que esto era explotable por cualquiera
-- con sesión. El código de la app nunca hace UPDATE sobre
-- household_members (solo INSERT/DELETE/SELECT — confirmado en
-- lib/supabase/queries.ts), así que se puede borrar sin romper nada.
drop policy if exists "members_update" on public.household_members;

-- 2) ALTO: savings_movements.savings_mov_select permitía ver
-- movimientos de bucket 'household' de un usuario si compartías
-- CUALQUIER hogar en común con él, sin verificar que fuera el mismo
-- hogar al que pertenece la fila (comparaba hm1.household_id con
-- hm2.household_id, nunca con savings_movements.household_id). Un
-- usuario en dos hogares distintos (H1 con vos, H3 con otra gente)
-- filtraba sus movimientos de H3 a los miembros de H1. Se reemplaza
-- por el mismo patrón ya usado en expenses/goals/budgets:
-- private.is_household_member(household_id).
drop policy if exists "savings_mov_select" on public.savings_movements;
create policy "savings_mov_select" on public.savings_movements
  for select to authenticated using (
    (user_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

-- 3) MEDIO: repayments — cualquier miembro activo del hogar podía
-- editar CUALQUIER repayment del hogar (monto, fecha, nota, incluso
-- reasignar from_id/to_id), no solo quien lo creó o las dos partes
-- involucradas. El INSERT sí exige created_by = auth.uid(), el
-- UPDATE no exigía nada parecido. Se restringe a: quien lo creó, o
-- cualquiera de las dos partes del pago.
drop policy if exists "Household members can update repayments" on public.repayments;
create policy "Household members can update repayments" on public.repayments
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or from_id = (select auth.uid())
    or to_id = (select auth.uid())
  )
  with check (
    (created_by = (select auth.uid()) or from_id = (select auth.uid()) or to_id = (select auth.uid()))
    and exists (
      select 1 from household_members hm
      where hm.household_id = repayments.household_id and hm.user_id = repayments.from_id and hm.activo = true
    )
    and exists (
      select 1 from household_members hm
      where hm.household_id = repayments.household_id and hm.user_id = repayments.to_id and hm.activo = true
    )
    and (repayments.expense_id is null or exists (
      select 1 from expenses e
      where e.id = repayments.expense_id
        and e.household_id = repayments.household_id
        and e.scope = 'household'
        and e.moneda = repayments.currency
    ))
  );

-- 4) BAJO: handle_new_user es un trigger interno de auth.users (no
-- necesita ser invocable por RPC). anon/authenticated podían
-- ejecutarlo directo vía /rest/v1/rpc/handle_new_user. Los triggers
-- se disparan solos, no dependen de EXECUTE sobre la función — este
-- revoke no afecta el alta de usuarios.
revoke execute on function public.handle_new_user() from anon, authenticated;
