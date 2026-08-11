import { createClient } from './client'
import type { Expense, Goal, Household, Member, SavingsMovement, Contribution, Invite, CurrencyCode, CategoryId, PersonColor } from '../types'

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
    settled: row.settled ?? false,
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

// ─── public API ─────────────────────────────────────────────────────

export function supabase() {
  return createClient()
}

// ─── Auth / Profile ─────────────────────────────────────────────────

export async function getCurrentUser(): Promise<Member | null> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return null

  const { data: profile } = await s
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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

// ─── Households ─────────────────────────────────────────────────────

export async function getMyHouseholds(userId: string): Promise<Household[]> {
  const s = supabase()

  // Get household IDs where user is an active member
  const { data: memberships } = await s
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('activo', true)

  if (!memberships?.length) return []

  const ids = memberships.map((m) => m.household_id)

  // Get households with their members and invites
  const { data: rows } = await s
    .from('households')
    .select('*')
    .in('id', ids)

  if (!rows) return []

  // Get members for all these households
  const { data: allMembers } = await s
    .from('household_members')
    .select('*')
    .in('household_id', ids)

  // Get invites for all these households
  const { data: allInvites } = await s
    .from('household_invites')
    .select('*')
    .in('household_id', ids)

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

export async function getHouseholdMembers(householdId: string): Promise<Member[]> {
  const s = supabase()

  const { data: memberships } = await s
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  if (!memberships?.length) return []

  const ids = memberships.map((m) => m.user_id)

  // Get profiles
  const { data: profiles } = await s
    .from('profiles')
    .select('*')
    .in('id', ids)

  // Get auth users for emails (profiles don't store email)
  const { data: { users } } = await s.auth.admin.listUsers()
  // Note: listUsers requires service_role — for client, we skip emails
  // We need to store email in profiles or use a different approach

  return (profiles ?? []).map((p) => toMember(p))
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

export async function updateHousehold(id: string, patch: Partial<Household>) {
  const s = supabase()
  await s
    .from('households')
    .update({
      ...(patch.name !== undefined && { nombre: patch.name }),
      ...(patch.currency !== undefined && { moneda_default: patch.currency }),
    })
    .eq('id', id)
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

  const { data } = await query
  return (data ?? []).map(toExpense)
}

export async function addExpense(e: Omit<Expense, 'id'>): Promise<Expense> {
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

  await s.from('expenses').update(update).eq('id', id)
}

export async function deleteExpense(id: string) {
  const s = supabase()
  await s.from('expenses').delete().eq('id', id)
}

export async function toggleSettled(id: string, settled: boolean) {
  const s = supabase()
  await s.from('expenses').update({ settled }).eq('id', id)
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

  const { data: goals } = await query
  if (!goals?.length) return []

  // Get contributions for all these goals
  const goalIds = goals.map((g) => g.id)
  const { data: allContributions } = await s
    .from('goal_contributions')
    .select('*')
    .in('goal_id', goalIds)
    .order('fecha', { ascending: false })

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

  await s.from('goals').update(update).eq('id', id)
}

export async function deleteGoal(id: string) {
  const s = supabase()
  await s.from('goal_contributions').delete().eq('goal_id', id)
  await s.from('goals').delete().eq('id', id)
}

export async function addContribution(goalId: string, userId: string, amount: number) {
  const s = supabase()
  await s.from('goal_contributions').insert({
    goal_id: goalId,
    user_id: userId,
    monto: amount,
  })
}

export async function deleteContribution(id: string) {
  const s = supabase()
  await s.from('goal_contributions').delete().eq('id', id)
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

  const { data } = await query
  return (data ?? []).map(toSavings)
}

export async function addSavingsMovement(m: Omit<SavingsMovement, 'id'>) {
  const s = supabase()
  await s.from('savings_movements').insert({
    user_id: m.memberId,
    scope: m.scope,
    household_id: m.householdId ?? null,
    tipo: m.type,
    monto: m.amount,
    fecha: m.date,
    nota: m.note ?? null,
  })
}

export async function updateSavingsMovement(id: string, patch: Partial<SavingsMovement>) {
  const s = supabase()
  const update: Record<string, any> = {}
  if (patch.type !== undefined) update.tipo = patch.type
  if (patch.amount !== undefined) update.monto = patch.amount
  if (patch.date !== undefined) update.fecha = patch.date
  if (patch.note !== undefined) update.nota = patch.note

  await s.from('savings_movements').update(update).eq('id', id)
}

export async function deleteSavingsMovement(id: string) {
  const s = supabase()
  await s.from('savings_movements').delete().eq('id', id)
}

// ─── Invites ────────────────────────────────────────────────────────

async function sendInviteEmail(email: string, householdName: string, token: string, inviterName: string) {
  try {
    await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, householdName, token, inviterName }),
    })
  } catch {
    console.warn('Failed to send invite email')
  }
}

export async function addInvite(householdId: string, email: string): Promise<{ token: string; householdName: string; inviterName: string } | { error: string }> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check for existing pending invite to this email in this household
  const { data: existing } = await s
    .from('household_invites')
    .select('id, token, estado')
    .eq('household_id', householdId)
    .eq('email_invitado', email)
    .order('creado_en', { ascending: false })
    .limit(1)

  if (existing?.length && existing[0].estado === 'pendiente') {
    return { error: 'Ya hay una invitación pendiente para este email. Usá reenviar.' }
  }

  // Get inviter name
  const { data: profile } = await s.from('profiles').select('nombre').eq('id', user.id).single()
  const inviterName = profile?.nombre ?? 'Alguien'

  // Get household name
  const { data: hh } = await s.from('households').select('nombre').eq('id', householdId).single()
  const householdName = hh?.nombre ?? 'un hogar'

  // Insert invite
  const { data: invite } = await s.from('household_invites').insert({
    household_id: householdId,
    email_invitado: email,
    invitado_por: user.id,
  }).select('token').single()

  const token = invite?.token ?? ''

  await sendInviteEmail(email, householdName, token, inviterName)

  return { token, householdName, inviterName }
}

export async function resendInvite(inviteId: string) {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get invite details
  const { data: invite } = await s
    .from('household_invites')
    .select('*, household:households(nombre)')
    .eq('id', inviteId)
    .single()

  if (!invite) throw new Error('Invite not found')

  // Get inviter name
  const { data: profile } = await s.from('profiles').select('nombre').eq('id', user.id).single()
  const inviterName = profile?.nombre ?? 'Alguien'

  const householdName = (invite.household as any)?.nombre ?? 'un hogar'

  await sendInviteEmail(invite.email_invitado, householdName, invite.token, inviterName)
}

export async function updateInvite(householdId: string, inviteId: string, status: string) {
  const s = supabase()
  await s
    .from('household_invites')
    .update({ estado: status })
    .eq('id', inviteId)
    .eq('household_id', householdId)
}

export async function removeInvite(inviteId: string) {
  const s = supabase()
  await s.from('household_invites').delete().eq('id', inviteId)
}

export async function getMyPendingInvites(): Promise<any[]> {
  const s = supabase()
  const { data: { user } } = await s.auth.getUser()
  if (!user?.email) return []

  const { data } = await s
    .from('household_invites')
    .select('*, household:households(nombre)')
    .eq('email_invitado', user.email)
    .eq('estado', 'pendiente')
    .gt('expira_en', new Date().toISOString())

  return data ?? []
}

// ─── Members / Profiles ────────────────────────────────────────────

export async function getAllMembers(userIds: string[]): Promise<Member[]> {
  if (!userIds.length) return []
  const s = supabase()
  const { data } = await s.from('profiles').select('*').in('id', userIds)
  return (data ?? []).map(toMember)
}
