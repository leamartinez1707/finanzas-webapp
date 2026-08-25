-- ============================================================
-- RPC for the invite preview page: with RLS enabled on
-- household_invites/profiles/household_members, an anonymous
-- visitor (the normal case for "I got an invite email") can no
-- longer read those tables directly by token. This function
-- validates the token internally (security definer) and returns
-- only what the preview screen needs.
-- ============================================================

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
