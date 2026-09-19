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
--
-- Written idempotent (if not exists / if exists everywhere) so it's
-- safe to re-run after a partial failure, which is exactly what
-- happened the first time: any task completed BEFORE this migration
-- has completed = true with the new columns defaulting to null, which
-- violates the check constraints below unless backfilled first.
-- ============================================================

alter table public.tasks
  add column if not exists completed_by_id uuid references auth.users(id) on delete set null,
  add column if not exists completed_at timestamptz;

-- Backfill tasks completed before this migration existed — there's no
-- real "who/when" for them, so approximate: assignee_id is the most
-- likely person who actually did it, and created_at is the closest
-- timestamp on hand. Only touches rows the constraints below would
-- otherwise reject.
update public.tasks
set completed_by_id = coalesce(completed_by_id, assignee_id),
    completed_at = coalesce(completed_at, created_at, now())
where completed = true and (completed_by_id is null or completed_at is null);

alter table public.tasks
  drop constraint if exists tasks_completed_by_id_consistency,
  drop constraint if exists tasks_completed_at_consistency;

alter table public.tasks
  add constraint tasks_completed_by_id_consistency check ((completed = false) = (completed_by_id is null)),
  add constraint tasks_completed_at_consistency check ((completed = false) = (completed_at is null));

create index if not exists idx_tasks_completed_at on public.tasks(completed_at desc);

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
