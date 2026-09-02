-- ============================================================
-- Premium waitlist ("avisame cuando salga"): a willingness-to-pay
-- signal, not a paywall. One row per user recording that they want to
-- be notified when a premium tier ships, plus which of a small,
-- growing set of feature ids they'd care about most. No server-side
-- notification/cron here — same "no edge functions" posture as the
-- rest of this project; a future job reads this table to actually
-- notify people.
--
-- `interested_features` is deliberately a plain `text[]`, not backed
-- by a check constraint or enum — the valid feature ids
-- (conversion_moneda, exportar_excel_pdf, notificaciones_presupuesto,
-- tendencia_categoria) are validated at the application level in
-- lib/supabase/queries.ts so the list can grow without a migration.
--
-- `unique (user_id)` also gives the row-level lookup its index for
-- free — `select`/`update`/`delete` all filter on
-- `user_id = (select auth.uid())`, which is exactly the column the
-- unique constraint already indexes, so no separate index is needed
-- on a table this small (one row per user).
--
-- RLS mirrors the LIVE policy pattern on `budgets`
-- (011_budgets.sql) — short policy names, `to authenticated`,
-- `(select auth.uid())`. There's no scope/household split here at
-- all (this is always personal to the user), so the policies are
-- simpler than budgets/recurring_expenses.
-- ============================================================

create table public.premium_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interested_features text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- ─── RLS ────────────────────────────────────────────────────────────

alter table public.premium_waitlist enable row level security;

create policy "premium_waitlist_select" on public.premium_waitlist
  for select to authenticated using (
    user_id = (select auth.uid())
  );

create policy "premium_waitlist_insert" on public.premium_waitlist
  for insert to authenticated with check (
    user_id = (select auth.uid())
  );

create policy "premium_waitlist_update" on public.premium_waitlist
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "premium_waitlist_delete" on public.premium_waitlist
  for delete to authenticated using (
    user_id = (select auth.uid())
  );
