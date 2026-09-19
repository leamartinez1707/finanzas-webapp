-- ============================================================
-- Track WHO completed a task and WHEN, not just the `completed`
-- boolean added in 015_tareas.sql. Without this, a completed task
-- whose due date is in the past disappears from every view on
-- app/(app)/tareas/page.tsx (it's excluded from "Atrasadas" for being
-- completed, and from "Hoy"/"Próximas" for having a past due date) —
-- there was no way to answer "who did the tasks this month" once a
-- day passed. This is the data these two new columns exist to
-- support: a Historial section on the tareas page.
--
-- `completed` (boolean) stays the source of truth the existing
-- toggle()/RLS already key off of; completed_by_id/completed_at are
-- kept in lockstep with it via the check constraints below, so
-- there's no way for "completed = true" and "completed_at is null" to
-- drift apart.
-- ============================================================

alter table public.tasks
  add column completed_by_id uuid references auth.users(id) on delete set null,
  add column completed_at timestamptz;

alter table public.tasks
  add constraint tasks_completed_by_id_consistency check ((completed = false) = (completed_by_id is null)),
  add constraint tasks_completed_at_consistency check ((completed = false) = (completed_at is null));

create index idx_tasks_completed_at on public.tasks(completed_at desc);

-- ─── RLS: pin completed_by_id to the caller ──────────────────────────
-- Same policy as 015_tareas.sql's "tasks_update", plus one more `with
-- check` clause so nobody can record someone else as having completed
-- a task they didn't do themselves.

drop policy if exists "tasks_update" on public.tasks;

create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    (scope = 'personal' and owner_id = (select auth.uid()))
    or (scope = 'household' and private.is_household_member(household_id))
  )
  with check (
    (completed_by_id is null or completed_by_id = (select auth.uid()))
    and (
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
