-- ============================================================
-- Split del hogar: proporción por defecto + excepción por gasto.
--
-- Three nullable jsonb columns, no RLS changes, no triggers — they
-- live on tables already covered by existing RLS policies, and all
-- balance math stays 100% client-side (lib/balance.ts).
--
-- Hierarchy of "how much does each member owe" for a given expense,
-- most to least specific, resolved entirely from the expense row
-- itself (never by re-reading the household's current config):
--   1. expenses.shares          — manual override for THAT expense (fixed amounts).
--   2. expenses.split_snapshot  — frozen copy of the household's split,
--                                  taken at the moment the expense was created.
--   3. 1/N even split           — today's behavior, final fallback.
--
-- households.default_split is only read when a NEW expense is created
-- (to freeze into its split_snapshot) — changing it later never
-- touches existing expenses, so old balances never get reordered.
-- ============================================================

alter table public.households add column default_split jsonb; -- [{ member_id, percent }], config vigente del hogar
alter table public.expenses add column shares jsonb;           -- [{ member_id, amount }], override manual de ESE gasto
alter table public.expenses add column split_snapshot jsonb;   -- [{ member_id, percent }], copia congelada al crear el gasto
