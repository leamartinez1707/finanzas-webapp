-- ============================================================
-- Closes anonymous/unauthenticated data exposure found live in
-- production (via direct inspection through the Supabase MCP —
-- this database's actual RLS history diverged from this repo's
-- migration files long ago, see CLAUDE.md / session notes):
--
--   - households_select had a stray `OR true` at the end of its
--     condition — always true, readable by anyone with no login.
--   - household_invites_select and profiles_select were
--     `qual: true` for roles {anon, authenticated} — readable by
--     anyone with no login (invites includes the `token` column).
--   - household_members_insert only checked `user_id = auth.uid()`
--     with no check on `household_id` — any authenticated user
--     (trivial to sign up for) could join ANY household with no
--     invitation at all.
--
-- Uses security definer helper functions in a private (non-exposed)
-- schema to avoid "infinite recursion detected in policy" errors
-- from cross-table policy checks — same approach as
-- supabase/migrations/004_rls_core_tables.sql (designed in a prior
-- session but never applied here, since this database already had
-- an independent, mostly-correct RLS history under different
-- policy names).
-- ============================================================

create schema if not exists private;

create or replace function private.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = (select auth.uid())
      and hm.activo = true
  );
$$;

revoke execute on function private.is_household_member(uuid) from public, anon;
grant execute on function private.is_household_member(uuid) to authenticated;

create or replace function private.is_household_creator(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from households h
    where h.id = p_household_id
      and h.creado_por = (select auth.uid())
  );
$$;

revoke execute on function private.is_household_creator(uuid) from public, anon;
grant execute on function private.is_household_creator(uuid) to authenticated;

create or replace function private.has_pending_invite(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_invites hi
    where hi.household_id = p_household_id
      and hi.estado = 'pendiente'
      and hi.expira_en > now()
      and lower(hi.email_invitado) = lower((select auth.email()))
  );
$$;

revoke execute on function private.has_pending_invite(uuid) from public, anon;
grant execute on function private.has_pending_invite(uuid) to authenticated;

-- ─── households_select: remove the stray `OR true` and anon access ───

drop policy if exists "households_select" on public.households;

create policy "households_select" on public.households
  for select to authenticated using (
    creado_por = (select auth.uid())
    or private.is_household_member(id)
  );

-- ─── household_members_insert: real authorization to join ────────────

drop policy if exists "members_insert" on public.household_members;

create policy "members_insert" on public.household_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      private.is_household_creator(household_id)
      or private.has_pending_invite(household_id)
    )
  );

-- ─── household_invites_select: remove anon access + unconditional `true` ───

drop policy if exists "invites_select" on public.household_invites;

create policy "invites_select" on public.household_invites
  for select to authenticated using (
    private.is_household_member(household_id)
    or lower(email_invitado) = lower((select auth.email()))
  );

-- ─── profiles_select: remove anon access + unconditional `true` ──────

drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select to authenticated using (
    id = (select auth.uid())
    or exists (
      select 1 from household_members hm1
      join household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.user_id = (select auth.uid()) and hm1.activo
        and hm2.user_id = profiles.id and hm2.activo
    )
  );

-- ─── get_invite_preview: anonymous invite preview by token ────────────
-- Required now that invites_select no longer allows anon reads —
-- app/(auth)/invitacion/[token]/page.tsx already calls this RPC.

create or replace function public.get_invite_preview(p_token text)
returns table (
  invite_id uuid,
  household_id uuid,
  household_name text,
  email_invitado text,
  estado public.invite_status,
  expira_en timestamptz,
  inviter_name text,
  inviter_color text,
  members jsonb
)
language sql
security definer
set search_path = public
as $$
  select hi.id, hi.household_id, h.nombre, hi.email_invitado, hi.estado, hi.expira_en,
         p.nombre, p.color,
         coalesce((
           select jsonb_agg(jsonb_build_object('nombre', pr.nombre, 'color', pr.color))
           from household_members hm
           join profiles pr on pr.id = hm.user_id
           where hm.household_id = hi.household_id and hm.activo = true
         ), '[]'::jsonb)
  from household_invites hi
  join households h on h.id = hi.household_id
  left join profiles p on p.id = hi.invitado_por
  where hi.token = p_token;
$$;

revoke execute on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;
