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
- **State**: a single React Context (`lib/store.tsx`, `AppProvider` / `useApp`). On mount it eager-loads *all* of the user's data at once — households, members, expenses, goals, savings, repayments, across the personal scope and every household the user belongs to. There's no per-page/per-route fetching. Every mutation calls into `lib/supabase/queries.ts` and then patches Context state directly (no separate cache/query layer).
- **Data layer**: `lib/supabase/queries.ts` holds every DB query and mutation. `client.ts` is the browser Supabase client, `server.ts` the server-side client, `middleware.ts` handles session refresh for `proxy.ts`.
- **Domain model** (`lib/types.ts`): `Expense`, `Goal`, and `SavingsMovement` all carry `scope: 'household' | 'personal'`; personal items omit `householdId`. Each carries its own `CurrencyCode` independently — there is no automatic currency conversion anywhere in the app.
- **Balance logic** (`lib/balance.ts`): computes per-member, per-currency balances from expenses + repayments, then a greedy settlement algorithm to minimize the number of payments needed to zero everyone out. Expense splitting is currently always equal (1/N of household member count) — no per-expense/percentage split yet.
- **Authorization**: enforced entirely through Supabase Row Level Security. There is no client-side permission/role logic — if a query returns nothing, RLS silently denied it by design; don't add frontend gating for data access.
- **UI**: shadcn/ui (`style: "base-nova"`, see `components.json`) + Tailwind v4, primitives in `components/ui/`. Path alias `@/*` → repo root (`tsconfig.json`).
- **Migrations**: plain SQL files in `supabase/migrations/`, applied in numeric order (`001_schema.sql`, `002_repayments.sql`, `003_protect_repayment_identity.sql`) via the Supabase SQL editor or `supabase db push` — no ORM/migration tool.
