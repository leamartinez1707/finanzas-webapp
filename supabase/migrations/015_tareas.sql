-- ============================================================
-- Tareas ("control del hogar"): una agenda de tareas domésticas y
-- personales — descripción, quién la tiene que hacer, fecha límite y
-- hora opcional. Mismo patrón de scope que budgets/recurring_expenses
-- (household_id nullable + los dos check de consistencia), con el
-- mismo "asignado distinto del creador" que ya usa recurring_expenses
-- (payer_id) — acá es assignee_id.
--
-- Sin recurrencia en esta v1 (queda para después, el patrón de
-- recurring_expenses es reusable el día que se agregue).
-- ============================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('household','personal')),
  household_id uuid references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,      -- quién la creó
  assignee_id uuid not null references auth.users(id) on delete cascade,   -- quién la tiene que hacer
  descripcion text not null,
  fecha_limite date not null,
  hora_limite time,           -- opcional
  completed boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (scope = 'personal' or household_id is not null),
  check (scope = 'household' or household_id is null)
);

create index idx_tasks_household on public.tasks(household_id);
create index idx_tasks_owner on public.tasks(owner_id, scope);
create index idx_tasks_assignee on public.tasks(assignee_id);

-- ─── RLS ────────────────────────────────────────────────────────────
--
-- Deliberadamente distinto del patrón "solo el creador edita" de
-- budgets/recurring_expenses: acá el asignado también puede actualizar
-- (incluido completar) una tarea de hogar aunque no la haya creado él
-- — es la persona que tiene que hacerla la que necesita poder tocar
-- el checkbox. En personal, el asignado siempre sos vos mismo.

alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks
  for select to authenticated using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );

create policy "tasks_insert" on public.tasks
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and created_by = (select auth.uid())
    and (
      (scope = 'personal' and owner_id = (select auth.uid()) and assignee_id = (select auth.uid()))
      or (
        scope = 'household'
        and private.is_household_member(household_id)
        and exists (
          select 1 from household_members hm
          where hm.household_id = tasks.household_id
            and hm.user_id = tasks.assignee_id
            and hm.activo = true
        )
      )
    )
  );

create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  )
  with check (
    -- quién puede editar: el creador, o (en hogar) el asignado ACTUAL
    -- de la fila resultante — así el asignado puede completar/editar
    -- sin ser el creador, pero no puede reasignársela a otro sin ser
    -- también el creador (eso sigue siendo cosa de quien la creó)
    (
      owner_id = (select auth.uid())
      or (
        scope = 'household'
        and assignee_id = (select auth.uid())
        and exists (
          select 1 from household_members hm
          where hm.household_id = tasks.household_id
            and hm.user_id = (select auth.uid())
            and hm.activo = true
        )
      )
    )
    -- y el assignee_id resultante siempre tiene que ser válido, sin
    -- importar quién hizo el update (mismo chequeo que en el insert)
    and (
      (scope = 'personal' and assignee_id = (select auth.uid()))
      or (
        scope = 'household'
        and exists (
          select 1 from household_members hm
          where hm.household_id = tasks.household_id
            and hm.user_id = tasks.assignee_id
            and hm.activo = true
        )
      )
    )
  );

create policy "tasks_delete" on public.tasks
  for delete to authenticated using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  );
