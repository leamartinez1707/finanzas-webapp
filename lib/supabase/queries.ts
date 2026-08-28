import { createClient } from './client'
import type { Budget, Expense, Goal, Household, Member, SavingsMovement, Contribution, Invite, CurrencyCode, CategoryId, PersonColor, Repayment, RecurringExpense, ExpenseShare, SplitPercent } from '../types'

// ─── helpers ────────────────────────────────────────────────────────

function toExpense(row: any): Expense {
  return {
    id: row.id,
    scope: row.scope,
    householdId: row.household_id ?? undefined,
    ownerId: row.user_id,
    payerId: row.payer_id ?? row.user_id,
    description: row.descripcion,
    category: row.categoria as CategoryId,
    amount: Number(row.monto),
    currency: row.moneda as CurrencyCode,
    date: row.fecha,
    recurringExpenseId: row.recurring_expense_id ?? undefined,
    shares: row.shares ?? undefined,
    splitSnapshot: row.split_snapshot ?? undefined,
  }
}

function toRecurringExpense(row: any): RecurringExpense {
  return {
    id: row.id,
    scope: row.scope,
    householdId: row.household_id ?? undefined,
    ownerId: row.owner_id,
    payerId: row.payer_id,
    description: row.descripcion,
    category: row.categoria as CategoryId,
    amount: Number(row.monto),
    currency: row.moneda as CurrencyCode,
    dayOfMonth: row.dia_mes,
    active: row.activo,
    createdById: row.created_by,
  }
}

function toBudget(row: any): Budget {
  return {
    id: row.id,
    scope: row.scope,
    householdId: row.household_id ?? undefined,
    ownerId: row.owner_id,
    category: row.category as CategoryId,
    amount: Number(row.monto),
    currency: row.moneda as CurrencyCode,
    createdById: row.created_by,
  }
}

function toGoal(row: any, contributions: any[]): Goal {
  return {
    id: row.id,
    scope: row.scope,
    householdId: row.household_id ?? undefined,
    ownerId: row.user_id ?? undefined,
    name: row.nombre,
    target: Number(row.monto_objetivo),
    currency: row.moneda as CurrencyCode,
    deadline: row.fecha_limite ?? undefined,
    contributions: contributions.map(toContribution),
  }
}

function toContribution(row: any): Contribution {
  return {
    id: row.id,
    memberId: row.user_id,
    amount: Number(row.monto),
    date: row.fecha,
  }
}

function toMember(row: any): Member {
  return {
    id: row.id,
    name: row.nombre,
    email: row.email ?? '',
    color: (row.color as PersonColor) ?? 'person-1',
    joinedAt: row.creado_en ?? new Date().toISOString(),
    defaultContext: row.default_context ?? undefined,
  }
}

function toHousehold(row: any): Household {
  return {
    id: row.id,
    name: row.nombre,
    currency: row.moneda_default as CurrencyCode,
    memberIds: row.member_ids ?? [],
    invites: (row.invites ?? []).map((i: any) => ({
      id: i.id,
      email: i.email_invitado,
      status: i.estado,
      sentAt: i.creado_en,
    })),
    ownerId: row.creado_por ?? undefined,
    defaultSplit: row.default_split ?? undefined,
  }
}

function toSavings(row: any): SavingsMovement {
  return {
    id: row.id,
    memberId: row.user_id,
    scope: row.scope ?? 'personal',
    householdId: row.household_id ?? undefined,
    type: row.tipo as 'deposito' | 'retiro',
    amount: Number(row.monto),
    date: row.fecha,
    note: row.nota ?? undefined,
  }
}

function toRepayment(row: any): Repayment {
  return {
    id: row.id,
    householdId: row.household_id,
    fromId: row.from_id,
    toId: row.to_id,
    amount: Number(row.amount),
    currency: row.currency as CurrencyCode,
    date: row.date,
    note: row.note ?? undefined,
    expenseId: row.expense_id ?? undefined,
    createdById: row.created_by,
  }
}

// ─── public API ─────────────────────────────────────────────────────

export function supabase() {
  return createClient()
}

// ─── Auth / Profile ─────────────────────────────────────────────────

export async function getCurrentUser(): Promise<Member | null> {
  const s = supabase()
  const { data: { user }, error: userError } = await s.auth.getUser()
  if (userError) {
    // "No session at all" is the normal, expected state for an anonymous
    // visitor (landing page, login page, invite link, etc.) — Supabase
    // reports it as an error, but it isn't one. Only surface genuinely
    // unexpected auth failures (a session that existed but broke).
    if (userError.name === 'AuthSessionMissingError') return null
    throw userError
  }
  if (!user) return null

  const { data: profile, error } = await s
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!profile) return null
  const member = toMember(profile)
  member.email = user.email ?? ''
  return member
}

export async function upsertProfile(name: string, color: PersonColor) {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await s.from('profiles').upsert({
    id: user.id,
    nombre: name,
    color,
  })
}

export async function updateDefaultContext(userId: string, value: string | null) {
  const s = supabase()
  const { error } = await s
    .from('profiles')
    .update({ default_context: value })
    .eq('id', userId)
  if (error) throw error
}

export async function signOut() {
  const s = supabase()
  const { error } = await s.auth.signOut()
  if (error) throw error
  window.location.href = '/'
}

// ─── Households ─────────────────────────────────────────────────────

export async function getMyHouseholds(userId: string): Promise<Household[]> {
  const s = supabase()

  // Get household IDs where user is an active member
  const { data: memberships, error: membershipsError } = await s
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('activo', true)

  if (membershipsError) throw membershipsError
  if (!memberships?.length) return []

  const ids = memberships.map((m) => m.household_id)

  // Get households with their members and invites
  const { data: rows, error: rowsError } = await s
    .from('households')
    .select('*')
    .in('id', ids)

  if (rowsError) throw rowsError
  if (!rows) return []

  // Get members for all these households
  const { data: allMembers, error: allMembersError } = await s
    .from('household_members')
    .select('*')
    .in('household_id', ids)

  if (allMembersError) throw allMembersError

  // Get invites for all these households
  const { data: allInvites, error: allInvitesError } = await s
    .from('household_invites')
    .select('*')
    .in('household_id', ids)

  if (allInvitesError) throw allInvitesError

  return rows.map((h) => ({
    ...toHousehold(h),
    memberIds: (allMembers ?? [])
      .filter((m) => m.household_id === h.id)
      .map((m) => m.user_id),
    invites: (allInvites ?? [])
      .filter((i) => i.household_id === h.id)
      .map((i) => ({
        id: i.id,
        email: i.email_invitado,
        status: i.estado,
        sentAt: i.creado_en,
      })),
  }))
}

export async function createHousehold(name: string, currency: CurrencyCode): Promise<string> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await s
    .from('households')
    .insert({
      nombre: name,
      moneda_default: currency,
      creado_por: user.id,
    })
    .select('id')
    .single()

  if (error) throw error

  // Add creator as member
  await s.from('household_members').insert({
    household_id: data.id,
    user_id: user.id,
  })

  return data.id
}

// Percentages must sum to 100 (small float tolerance) and every entry must
// point at a real member of the household — but not every member needs an
// entry, so a partial split (e.g. only overriding two of three people) is
// invalid, not "the rest evenly split the remainder".
function validateSplitPercent(memberIds: string[], split: SplitPercent[]) {
  const sum = split.reduce((total, s) => total + s.percent, 0)
  if (Math.abs(sum - 100) > 0.01) throw new Error('Los porcentajes deben sumar 100')
  if (split.some((s) => !memberIds.includes(s.memberId))) {
    throw new Error('La proporción incluye a alguien que no pertenece al hogar')
  }
}

export async function updateHousehold(id: string, patch: Partial<Household>) {
  const s = supabase()

  if (patch.defaultSplit) {
    const { data, error: membersError } = await s
      .from('household_members')
      .select('user_id')
      .eq('household_id', id)
    if (membersError) throw membersError
    validateSplitPercent((data ?? []).map((m) => m.user_id), patch.defaultSplit)
  }

  const { error } = await s
    .from('households')
    .update({
      ...(patch.name !== undefined && { nombre: patch.name }),
      ...(patch.currency !== undefined && { moneda_default: patch.currency }),
      ...(patch.defaultSplit !== undefined && { default_split: patch.defaultSplit }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function leaveHousehold(householdId: string) {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await s
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .select('user_id')
  if (error) throw error
  // RLS can silently filter a DELETE down to 0 rows without ever raising
  // `error` — check the affected rows explicitly so a denied delete surfaces
  // as a real error instead of a false "success".
  if (!data?.length) throw new Error('No se pudo salir del hogar.')
}

export async function removeMember(householdId: string, memberId: string) {
  const s = supabase()
  const { data, error } = await s
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', memberId)
    .select('user_id')
  if (error) throw error
  if (!data?.length) throw new Error('No se pudo sacar al miembro del hogar.')
}

// ─── Expenses ───────────────────────────────────────────────────────

export type ExpenseFilter =
  | { scope: 'personal'; ownerId: string }
  | { scope: 'household'; householdId: string }

export async function getExpenses(filter: ExpenseFilter): Promise<Expense[]> {
  const s = supabase()
  let query = s.from('expenses').select('*').order('fecha', { ascending: false })

  if (filter.scope === 'personal') {
    query = query.eq('scope', 'personal').eq('user_id', filter.ownerId)
  } else {
    query = query.eq('scope', 'household').eq('household_id', filter.householdId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toExpense)
}

// Sum of `shares` amounts must equal the expense's own amount (small
// currency-rounding tolerance) — same molde as validateRepaymentExpense.
function validateShares(amount: number, shares: ExpenseShare[]) {
  const sum = shares.reduce((total, s) => total + s.amount, 0)
  if (Math.abs(sum - amount) > 0.01) {
    throw new Error('La suma de las partes debe ser igual al monto del gasto')
  }
}

export async function addExpense(e: Omit<Expense, 'id'>): Promise<Expense> {
  if (e.shares) validateShares(e.amount, e.shares)

  const s = supabase()
  const { data, error } = await s
    .from('expenses')
    .insert({
      scope: e.scope,
      household_id: e.householdId ?? null,
      user_id: e.ownerId,
      payer_id: e.payerId,
      descripcion: e.description,
      categoria: e.category,
      monto: e.amount,
      moneda: e.currency,
      fecha: e.date,
      shares: e.shares ?? null,
      split_snapshot: e.splitSnapshot ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return toExpense(data)
}

export async function updateExpense(id: string, patch: Partial<Expense>) {
  const s = supabase()
  const update: Record<string, any> = {}
  if (patch.description !== undefined) update.descripcion = patch.description
  if (patch.category !== undefined) update.categoria = patch.category
  if (patch.amount !== undefined) update.monto = patch.amount
  if (patch.currency !== undefined) update.moneda = patch.currency
  if (patch.payerId !== undefined) update.payer_id = patch.payerId
  if (patch.date !== undefined) update.fecha = patch.date
  if (patch.shares !== undefined) update.shares = patch.shares
  if (patch.splitSnapshot !== undefined) update.split_snapshot = patch.splitSnapshot

  if (patch.shares) {
    let amount = patch.amount
    if (amount === undefined) {
      const { data, error: currentError } = await s
        .from('expenses')
        .select('monto')
        .eq('id', id)
        .maybeSingle()
      if (currentError) throw currentError
      if (!data) throw new Error('Gasto no encontrado')
      amount = Number(data.monto)
    }
    validateShares(amount, patch.shares)
  }

  const { error } = await s.from('expenses').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id: string) {
  const s = supabase()
  const { error } = await s.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// ─── Recurring expenses ─────────────────────────────────────────────

export async function getRecurringExpenses(filter: ExpenseFilter): Promise<RecurringExpense[]> {
  const s = supabase()
  let query = s.from('recurring_expenses').select('*').order('created_at', { ascending: false })

  if (filter.scope === 'personal') {
    query = query.eq('scope', 'personal').eq('owner_id', filter.ownerId)
  } else {
    query = query.eq('scope', 'household').eq('household_id', filter.householdId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toRecurringExpense)
}

export async function addRecurringExpense(
  r: Omit<RecurringExpense, 'id' | 'createdById'>,
): Promise<RecurringExpense> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await s
    .from('recurring_expenses')
    .insert({
      scope: r.scope,
      household_id: r.householdId ?? null,
      owner_id: r.ownerId,
      payer_id: r.payerId,
      descripcion: r.description,
      categoria: r.category,
      monto: r.amount,
      moneda: r.currency,
      dia_mes: r.dayOfMonth,
      activo: r.active,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw error
  return toRecurringExpense(data)
}

export async function updateRecurringExpense(id: string, patch: Partial<RecurringExpense>) {
  const s = supabase()
  const update: Record<string, any> = {}
  if (patch.description !== undefined) update.descripcion = patch.description
  if (patch.category !== undefined) update.categoria = patch.category
  if (patch.amount !== undefined) update.monto = patch.amount
  if (patch.currency !== undefined) update.moneda = patch.currency
  if (patch.payerId !== undefined) update.payer_id = patch.payerId
  if (patch.dayOfMonth !== undefined) update.dia_mes = patch.dayOfMonth
  if (patch.active !== undefined) update.activo = patch.active

  const { error } = await s.from('recurring_expenses').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteRecurringExpense(id: string) {
  const s = supabase()
  const { error } = await s.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error
}

// Generates this month's expense for a recurring template. The client-side
// due-check in lib/store.tsx is only an optimization — the real guard
// against duplicates (two household members loading the app at once) is
// the `expenses_recurring_month_uq` partial unique index in
// supabase/migrations/009_recurring_expenses.sql. If this insert loses that
// race, Postgres reports it as a unique-violation (23505); treat that as
// "already generated" rather than an error.
export async function generateRecurringExpense(
  template: RecurringExpense,
  date: string,
): Promise<Expense | null> {
  const s = supabase()
  const { data, error } = await s
    .from('expenses')
    .insert({
      scope: template.scope,
      household_id: template.householdId ?? null,
      user_id: template.ownerId,
      payer_id: template.payerId,
      descripcion: template.description,
      categoria: template.category,
      monto: template.amount,
      moneda: template.currency,
      fecha: date,
      recurring_expense_id: template.id,
    })
    .select('*')
    .single()

  if (error) {
    if ((error as { code?: string }).code === '23505') return null
    throw error
  }
  return toExpense(data)
}

// ─── Budgets ──────────────────────────────────────────────────────

export async function getBudgets(filter: ExpenseFilter): Promise<Budget[]> {
  const s = supabase()
  let query = s.from('budgets').select('*').order('created_at', { ascending: false })

  if (filter.scope === 'personal') {
    query = query.eq('scope', 'personal').eq('owner_id', filter.ownerId)
  } else {
    query = query.eq('scope', 'household').eq('household_id', filter.householdId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toBudget)
}

export async function addBudget(b: Omit<Budget, 'id' | 'createdById'>): Promise<Budget> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await s
    .from('budgets')
    .insert({
      scope: b.scope,
      household_id: b.householdId ?? null,
      owner_id: b.ownerId,
      category: b.category,
      monto: b.amount,
      moneda: b.currency,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw error
  return toBudget(data)
}

export async function updateBudget(id: string, patch: Partial<Budget>) {
  const s = supabase()
  const update: Record<string, any> = {}
  if (patch.category !== undefined) update.category = patch.category
  if (patch.amount !== undefined) update.monto = patch.amount
  if (patch.currency !== undefined) update.moneda = patch.currency

  const { error } = await s.from('budgets').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteBudget(id: string) {
  const s = supabase()
  const { error } = await s.from('budgets').delete().eq('id', id)
  if (error) throw error
}

export async function getRepayments(householdId: string): Promise<Repayment[]> {
  const { data, error } = await supabase().from('repayments').select('*').eq('household_id', householdId).order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toRepayment)
}

async function validateRepaymentExpense(
  s: ReturnType<typeof supabase>,
  householdId: string,
  expenseId: string | null | undefined,
  currency: CurrencyCode,
) {
  if (!expenseId) return

  const { data, error } = await s
    .from('expenses')
    .select('household_id, scope, moneda')
    .eq('id', expenseId)
    .maybeSingle()

  if (error) throw error
  if (!data || data.household_id !== householdId || data.scope !== 'household' || data.moneda !== currency) {
    throw new Error('El gasto relacionado no pertenece al hogar o no coincide con la moneda')
  }
}

export async function addRepayment(r: Omit<Repayment, 'id' | 'createdById'>): Promise<Repayment> {
  const s = supabase()
  const { data: { user }, error: userError } = await s.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Not authenticated')
  await validateRepaymentExpense(s, r.householdId, r.expenseId, r.currency)
  const { data, error } = await s.from('repayments').insert({
    household_id: r.householdId,
    from_id: r.fromId,
    to_id: r.toId,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    note: r.note ?? null,
    expense_id: r.expenseId ?? null,
    created_by: user.id,
  }).select('*').single()
  if (error) throw error
  return toRepayment(data)
}

export async function updateRepayment(id: string, patch: Partial<Repayment>) {
  const s = supabase()
  const { data: current, error: currentError } = await s
    .from('repayments')
    .select('household_id, currency, expense_id')
    .eq('id', id)
    .maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new Error('Repayment not found or not accessible')

  const update: Record<string, unknown> = {}
  if (patch.fromId !== undefined) update.from_id = patch.fromId
  if (patch.toId !== undefined) update.to_id = patch.toId
  if (patch.amount !== undefined) update.amount = patch.amount
  if (patch.currency !== undefined) update.currency = patch.currency
  if (patch.date !== undefined) update.date = patch.date
  if (patch.note !== undefined) update.note = patch.note ?? null
  if (patch.expenseId !== undefined) update.expense_id = patch.expenseId
  await validateRepaymentExpense(
    s,
    current.household_id,
    patch.expenseId === undefined ? current.expense_id ?? undefined : patch.expenseId,
    patch.currency ?? current.currency,
  )
  const { data, error } = await s.from('repayments').update(update).eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Repayment not found or not accessible')
}

export async function deleteRepayment(id: string) {
  const { data, error } = await supabase().from('repayments').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Repayment not found or not accessible')
}

// ─── Goals ──────────────────────────────────────────────────────────

export async function getGoals(filter: ExpenseFilter): Promise<Goal[]> {
  const s = supabase()
  let query = s.from('goals').select('*').order('creado_en', { ascending: false })

  if (filter.scope === 'personal') {
    query = query.eq('scope', 'personal').eq('user_id', filter.ownerId)
  } else {
    query = query.eq('scope', 'household').eq('household_id', filter.householdId)
  }

  const { data: goals, error: goalsError } = await query
  if (goalsError) throw goalsError
  if (!goals?.length) return []

  // Get contributions for all these goals
  const goalIds = goals.map((g) => g.id)
  const { data: allContributions, error: contributionsError } = await s
    .from('goal_contributions')
    .select('*')
    .in('goal_id', goalIds)
    .order('fecha', { ascending: false })

  if (contributionsError) throw contributionsError

  return goals.map((g) =>
    toGoal(g, (allContributions ?? []).filter((c) => c.goal_id === g.id)),
  )
}

export async function addGoal(g: Omit<Goal, 'id' | 'contributions'>): Promise<Goal> {
  const s = supabase()
  const { data, error } = await s
    .from('goals')
    .insert({
      scope: g.scope,
      household_id: g.householdId ?? null,
      user_id: g.ownerId ?? null,
      nombre: g.name,
      monto_objetivo: g.target,
      moneda: g.currency,
      fecha_limite: g.deadline ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return toGoal(data, [])
}

export async function updateGoal(id: string, patch: Partial<Goal>) {
  const s = supabase()
  const update: Record<string, any> = {}
  if (patch.name !== undefined) update.nombre = patch.name
  if (patch.target !== undefined) update.monto_objetivo = patch.target
  if (patch.currency !== undefined) update.moneda = patch.currency
  if (patch.deadline !== undefined) update.fecha_limite = patch.deadline ?? null

  const { error } = await s.from('goals').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteGoal(id: string) {
  const s = supabase()
  const { error: contributionsError } = await s.from('goal_contributions').delete().eq('goal_id', id)
  if (contributionsError) throw contributionsError
  const { error } = await s.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function addContribution(goalId: string, userId: string, amount: number): Promise<Contribution> {
  const s = supabase()
  const { data, error } = await s.from('goal_contributions').insert({
    goal_id: goalId,
    user_id: userId,
    monto: amount,
  }).select('*').single()
  if (error) throw error
  return toContribution(data)
}

export async function deleteContribution(id: string) {
  const s = supabase()
  const { error } = await s.from('goal_contributions').delete().eq('id', id)
  if (error) throw error
}

// ─── Savings ────────────────────────────────────────────────────────

export async function getSavings(
  filter: ExpenseFilter,
  memberIds: string[],
): Promise<SavingsMovement[]> {
  const s = supabase()
  let query = s.from('savings_movements').select('*').order('fecha', { ascending: false })

  if (filter.scope === 'personal') {
    query = query.eq('scope', 'personal').in('user_id', memberIds)
  } else {
    query = query
      .eq('scope', 'household')
      .eq('household_id', filter.householdId)
      .in('user_id', memberIds)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toSavings)
}

export async function addSavingsMovement(m: Omit<SavingsMovement, 'id'>): Promise<SavingsMovement> {
  const s = supabase()
  const { data, error } = await s.from('savings_movements').insert({
    user_id: m.memberId,
    scope: m.scope,
    household_id: m.householdId ?? null,
    tipo: m.type,
    monto: m.amount,
    fecha: m.date,
    nota: m.note ?? null,
  }).select('*').single()
  if (error) throw error
  return toSavings(data)
}

export async function updateSavingsMovement(id: string, patch: Partial<SavingsMovement>) {
  const s = supabase()
  const update: Record<string, any> = {}
  if (patch.type !== undefined) update.tipo = patch.type
  if (patch.amount !== undefined) update.monto = patch.amount
  if (patch.date !== undefined) update.fecha = patch.date
  if (patch.note !== undefined) update.nota = patch.note

  const { error } = await s.from('savings_movements').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteSavingsMovement(id: string) {
  const s = supabase()
  const { error } = await s.from('savings_movements').delete().eq('id', id)
  if (error) throw error
}

// ─── Invites ────────────────────────────────────────────────────────

async function sendInviteEmail(email: string, householdName: string, token: string, inviterName: string) {
  const response = await fetch('/api/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, householdName, token, inviterName }),
  })
  if (!response.ok) {
    throw new Error(`Invite email failed: ${response.status}`)
  }
}

export async function addInvite(householdId: string, email: string): Promise<{ token: string; householdName: string; inviterName: string } | { error: string }> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check for existing pending invite to this email in this household
  const { data: existing, error: existingError } = await s
    .from('household_invites')
    .select('id, token, estado')
    .eq('household_id', householdId)
    .eq('email_invitado', email)
    .order('creado_en', { ascending: false })
    .limit(1)

  if (existingError) throw existingError
  if (existing?.length && existing[0].estado === 'pendiente') {
    return { error: 'Ya hay una invitación pendiente para este email. Usá reenviar.' }
  }

  // Get inviter name
  const { data: profile, error: profileError } = await s.from('profiles').select('nombre').eq('id', user.id).single()
  if (profileError) throw profileError
  const inviterName = profile?.nombre ?? 'Alguien'

  // Get household name
  const { data: hh, error: hhError } = await s.from('households').select('nombre').eq('id', householdId).single()
  if (hhError) throw hhError
  const householdName = hh?.nombre ?? 'un hogar'

  // Insert invite
  const { data: invite, error: inviteError } = await s.from('household_invites').insert({
    household_id: householdId,
    email_invitado: email,
    invitado_por: user.id,
  }).select('id, token').single()
  if (inviteError) throw inviteError

  const token = invite.token

  try {
    await sendInviteEmail(email, householdName, token, inviterName)
  } catch (emailError) {
    try {
      await s.from('household_invites').delete().eq('id', invite.id)
    } catch {
      // Keep the original email error so the UI can show the right message.
    }
    throw emailError
  }

  return { token, householdName, inviterName }
}

export async function resendInvite(inviteId: string) {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get invite details
  const { data: invite, error: inviteError } = await s
    .from('household_invites')
    .select('*, household:households(nombre)')
    .eq('id', inviteId)
    .single()

  if (inviteError) throw inviteError
  if (!invite) throw new Error('Invite not found')

  // Get inviter name
  const { data: profile, error: profileError } = await s.from('profiles').select('nombre').eq('id', user.id).single()
  if (profileError) throw profileError
  const inviterName = profile?.nombre ?? 'Alguien'

  const householdName = (invite.household as any)?.nombre ?? 'un hogar'

  await sendInviteEmail(invite.email_invitado, householdName, invite.token, inviterName)

  const { error } = await s
    .from('household_invites')
    .update({ expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', inviteId)
  if (error) throw error
}

export async function updateInvite(householdId: string, inviteId: string, status: string) {
  const s = supabase()
  const { error } = await s
    .from('household_invites')
    .update({ estado: status })
    .eq('id', inviteId)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function removeInvite(inviteId: string) {
  const s = supabase()
  const { error } = await s.from('household_invites').delete().eq('id', inviteId)
  if (error) throw error
}

export async function getMyPendingInvites(): Promise<any[]> {
  const s = supabase()
  const { data: { user }, error: userError } = await s.auth.getUser()
  if (userError) throw userError
  if (!user?.email) return []

  const { data, error } = await s
    .from('household_invites')
    .select('*, household:households(nombre)')
    .eq('email_invitado', user.email)
    .eq('estado', 'pendiente')
    .gt('expira_en', new Date().toISOString())

  if (error) throw error
  return data ?? []
}

// ─── Members / Profiles ────────────────────────────────────────────

export async function getAllMembers(userIds: string[]): Promise<Member[]> {
  if (!userIds.length) return []
  const s = supabase()
  const { data, error } = await s.from('profiles').select('*').in('id', userIds)
  if (error) throw error
  return (data ?? []).map(toMember)
}
