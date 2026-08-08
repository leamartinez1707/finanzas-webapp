-- ============================================================
-- Schema: finanzas-compartidas
-- Tablas según spec-app-finanzas-hogar.md sección 4
-- ============================================================

-- 4.1 profiles — extiende auth.users
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  color       text not null default 'person-1',
  creado_en   timestamptz not null default now()
);

-- 4.2 households — hogares
create table if not exists public.households (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  moneda_default text not null default 'UYU',
  creado_por    uuid references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now()
);

-- 4.3 household_members
create table if not exists public.household_members (
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  fecha_ingreso timestamptz not null default now(),
  activo        boolean not null default true,
  primary key (household_id, user_id)
);

-- 4.4 household_invites
create type public.invite_status as enum ('pendiente', 'aceptada', 'rechazada', 'expirada');

create table if not exists public.household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  email_invitado text not null,
  invitado_por  uuid references auth.users(id) on delete set null,
  estado        public.invite_status not null default 'pendiente',
  token         text not null default encode(gen_random_bytes(16), 'hex'),
  creado_en     timestamptz not null default now(),
  expira_en     timestamptz not null default (now() + interval '7 days')
);

-- 4.5 expenses — gastos (household_id null = personal)
create type public.expense_category as enum (
  'super', 'comida', 'alquiler', 'servicios',
  'transporte', 'salidas', 'salud', 'casa', 'otros'
);

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households(id) on delete set null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  scope         text not null default 'household' check (scope in ('household', 'personal')),
  payer_id      uuid references auth.users(id) on delete set null,
  descripcion   text not null,
  categoria     public.expense_category not null default 'otros',
  monto         numeric(12,2) not null check (monto > 0),
  moneda        text not null default 'UYU',
  fecha         date not null default current_date,
  notas         text,
  creado_en     timestamptz not null default now()
);

-- 4.6 goals — objetivos (household_id null = personal)
create type public.goal_status as enum ('activo', 'cumplido', 'pausado');

create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid references public.households(id) on delete set null,
  user_id         uuid references auth.users(id) on delete cascade,
  scope           text not null default 'household' check (scope in ('household', 'personal')),
  nombre          text not null,
  moneda          text not null default 'UYU',
  monto_objetivo  numeric(12,2) not null check (monto_objetivo > 0),
  monto_ahorrado  numeric(12,2) not null default 0 check (monto_ahorrado >= 0),
  fecha_limite    date,
  estado          public.goal_status not null default 'activo',
  creado_en       timestamptz not null default now()
);

-- 4.7 goal_contributions — aportes a un objetivo
create table if not exists public.goal_contributions (
  id        uuid primary key default gen_random_uuid(),
  goal_id   uuid not null references public.goals(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  monto     numeric(12,2) not null check (monto > 0),
  fecha     date not null default current_date
);

-- 4.8 savings_accounts — ahorro total de cada persona
create table if not exists public.savings_accounts (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  monto_actual  numeric(12,2) not null default 0,
  moneda        text not null default 'UYU'
);

-- 4.9 savings_movements
create type public.savings_movement_type as enum ('deposito', 'retiro');

create table if not exists public.savings_movements (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  scope     text not null default 'personal' check (scope in ('household', 'personal')),
  household_id uuid references public.households(id) on delete set null,
  tipo      public.savings_movement_type not null,
  monto     numeric(12,2) not null check (monto > 0),
  fecha     date not null default current_date,
  nota      text
);

-- ============================================================
-- Índices
-- ============================================================
create index if not exists idx_expenses_household on public.expenses(household_id, fecha desc);
create index if not exists idx_expenses_user on public.expenses(user_id, scope, fecha desc);
create index if not exists idx_goals_household on public.goals(household_id);
create index if not exists idx_goals_user on public.goals(user_id, scope);
create index if not exists idx_goal_contributions_goal on public.goal_contributions(goal_id, fecha desc);
create index if not exists idx_savings_movements_user on public.savings_movements(user_id, fecha desc);
create index if not exists idx_household_invites_household on public.household_invites(household_id);
create index if not exists idx_household_invites_email on public.household_invites(email_invitado, estado);
