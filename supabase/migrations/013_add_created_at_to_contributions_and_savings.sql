-- ============================================================
-- goal_contributions y savings_movements nunca guardaron cuándo se
-- cargó el registro (solo `fecha`, la fecha lógica del movimiento,
-- sin hora). Se agrega `creado_en` para poder mostrar "cargado a las
-- HH:MM" en la UI, igual que ya se puede con expenses/repayments
-- (creado_en/created_at). Las filas existentes quedan con el momento
-- en que corre esta migración — no hay forma de recuperar su hora
-- real de carga retroactivamente.
-- ============================================================

alter table public.goal_contributions
  add column if not exists creado_en timestamptz not null default now();

alter table public.savings_movements
  add column if not exists creado_en timestamptz not null default now();
