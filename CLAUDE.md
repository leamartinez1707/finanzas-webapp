# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nido — a Next.js 16 (App Router) app for shared household finances: shared expenses with 1/N split, household + personal savings goals, individual savings tracking, and repayments/balances between members. Backend is Supabase (Postgres + Auth + Row Level Security). See `README.md` for the full feature list, stack table, and local setup (env vars, migrations).

## Commands

- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm start` — run production build
- `pnpm lint` — `eslint .`
- Package manager is **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) — don't use npm/yarn.
- No test suite exists in this repo.

## Architecture

- **Routing**: App Router with route groups — `app/(auth)/` for the public flow (`bienvenida`, `crear-hogar`, `invitacion/[token]`, `onboarding`) and `app/(app)/` for the authenticated flow (`inicio`, `gastos`, `objetivos`, `ahorros`, `ajustes`, `historial`), gated by `<AuthGuard>` in `app/(app)/layout.tsx`.
- **Middleware**: the Next.js middleware entrypoint is `proxy.ts` (not `middleware.ts`) — it delegates to `updateSession` in `lib/supabase/middleware.ts` to refresh the auth session on every request.
- **State**: a single React Context (`lib/store.tsx`, `AppProvider` / `useApp`). On mount it eager-loads the user's data — households, members, expenses, goals, savings, repayments, across the personal scope and every household the user belongs to. There's no per-page/per-route fetching. Every mutation calls into `lib/supabase/queries.ts` and then patches Context state directly (no separate cache/query layer).
- **Historical data is windowed, totals are not.** `expenses`, `savings`, and `repayments` are the three entities with unbounded, ever-growing history — `loadData()` only fetches the last `HISTORY_WINDOW_MONTHS` (via the `range: DateRange` param on `getExpenses`/`getSavings`/`getRepayments`), and `ensureMonthLoaded(month)` / `loadFullHistory()` (`lib/store.tsx`) extend that window on demand when the UI navigates to an older period (wired into every `MonthNav` and "Ver todo el historial" button). Any **total that depends on all-time history** (balances/debts between members, Ahorros/Ingresos totals) is therefore *never* summed client-side over these arrays — it's computed in SQL (`get_household_balances`, `get_unsettled_expense_ids`, `get_personal_savings_totals`, `get_household_savings_totals`, `get_personal_expense_totals`, see `supabase/migrations/018_history_aggregates_rpc.sql`) and exposed pre-aggregated on `AppState` (`householdBalances`, `personalSavingsTotals`, `householdSavingsTotals`, `personalExpenseTotals`). When adding a new entity with potentially long history, follow this same split — windowed rows for display, server-side aggregates for anything that must reflect the full history — instead of fetching everything unbounded.
- **Data layer**: `lib/supabase/queries.ts` holds every DB query and mutation. `client.ts` is the browser Supabase client, `server.ts` the server-side client, `middleware.ts` handles session refresh for `proxy.ts`.
- **Domain model** (`lib/types.ts`): `Expense`, `Goal`, and `SavingsMovement` all carry `scope: 'household' | 'personal'`; personal items omit `householdId`. Each carries its own `CurrencyCode` independently — there is no automatic currency conversion anywhere in the app.
- **Balance logic**: `lib/balance.ts`'s `computeBalances()`/`expenseShare()` still do the per-member, per-currency math client-side, but only over data that's already fully in memory for a bounded scope — a single month (`BalanceCard`'s "saldo del mes", `/resumen`'s per-month breakdown) — never over "all expenses ever" (that's `householdBalances`, above). `computeSettlements()` (greedy settlement, minimizes the number of payments to zero everyone out) still runs over whichever balance array it's given. Splitting defaults to equal (1/N), but a household can set a default percentage split (`Household.defaultSplit`, frozen into each expense's `splitSnapshot` at creation time) and any single expense can override it with a manual `shares` split — see `expenseShare()`; the SQL aggregates replicate this same precedence (`shares` jsonb, camelCase keys, > `split_snapshot` > 1/N) and must be kept in sync if it changes.
- **Authorization**: enforced entirely through Supabase Row Level Security. There is no client-side permission/role logic — if a query returns nothing, RLS silently denied it by design; don't add frontend gating for data access.
- **UI**: shadcn/ui (`style: "base-nova"`, see `components.json`) + Tailwind v4, primitives in `components/ui/`. Path alias `@/*` → repo root (`tsconfig.json`).
- **Migrations**: plain SQL files in `supabase/migrations/`, applied in numeric order (`001_schema.sql`, `002_repayments.sql`, `003_protect_repayment_identity.sql`) via the Supabase SQL editor or `supabase db push` — no ORM/migration tool.

## Conventions

- **Blog every major feature.** Whenever a new feature is built that's meaningful enough for users to notice (not a bugfix, not internal refactoring), add a post about it to `lib/blog-posts.ts` (rendered at `/novedades` and `/novedades/[slug]`). This is a standing rule, not optional — treat it as part of "done" for the feature, the same way running lint is.
