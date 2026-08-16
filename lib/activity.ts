import type {
  ActivityItem,
  CurrencyCode,
  Expense,
  Goal,
  Member,
  SavingsMovement,
  Repayment,
} from './types'
import { CATEGORIES } from './categories'

interface BuildArgs {
  expenses: Expense[]
  goals: Goal[]
  savings: SavingsMovement[]
  repayments: Repayment[]
  members: Member[]
  baseCurrency: CurrencyCode
}

// Builds a unified, date-sorted activity feed for a given scope.
export function buildActivity(
  { expenses, goals, savings, repayments, members, baseCurrency }: BuildArgs,
  filter: { scope: 'household'; householdId: string } | { scope: 'personal'; ownerId: string },
): ActivityItem[] {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? 'Alguien'
  const items: ActivityItem[] = []

  const inScopeExpense = (e: Expense) =>
    filter.scope === 'household'
      ? e.scope === 'household' && e.householdId === filter.householdId
      : e.scope === 'personal' && e.ownerId === filter.ownerId

  for (const e of expenses.filter(inScopeExpense)) {
    items.push({
      id: e.id,
      kind: 'gasto',
      memberId: e.payerId,
      title: e.description,
      subtitle:
        filter.scope === 'household'
          ? `${CATEGORIES[e.category].label} · pagó ${name(e.payerId)}`
          : CATEGORIES[e.category].label,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
      category: e.category,
      direction: 'out',
    })
  }

  const inScopeGoal = (g: Goal) =>
    filter.scope === 'household'
      ? g.scope === 'household' && g.householdId === filter.householdId
      : g.scope === 'personal' && g.ownerId === filter.ownerId

  for (const g of goals.filter(inScopeGoal)) {
    for (const c of g.contributions) {
      items.push({
        id: `${g.id}-${c.id}`,
        kind: 'aporte',
        memberId: c.memberId,
        title: `Aporte a ${g.name}`,
        subtitle: `${name(c.memberId)} sumó al objetivo`,
        amount: c.amount,
        currency: g.currency,
        date: c.date,
        direction: 'in',
      })
    }
  }

  const inScopeSaving = (s: SavingsMovement) =>
    filter.scope === 'household'
      ? s.scope === 'household' && s.householdId === filter.householdId
      : s.scope === 'personal' && s.memberId === filter.ownerId

  for (const s of savings.filter(inScopeSaving)) {
    items.push({
      id: s.id,
      kind: 'ahorro',
      memberId: s.memberId,
      title: s.type === 'deposito' ? 'Depósito a ahorros' : 'Retiro de ahorros',
      subtitle: s.note ? `${name(s.memberId)} · ${s.note}` : name(s.memberId),
      amount: s.amount,
      currency: baseCurrency,
      date: s.date,
      direction: s.type === 'deposito' ? 'in' : 'out',
    })
  }

  if (filter.scope === 'household') {
    for (const r of repayments.filter((item) => item.householdId === filter.householdId)) {
      items.push({
        id: r.id,
        kind: 'pago',
        memberId: r.fromId,
        title: `${name(r.fromId)} le pagó a ${name(r.toId)}`,
        subtitle: r.note ? `Pago real · ${r.note}` : 'Pago real registrado',
        amount: r.amount,
        currency: r.currency,
        date: r.date,
        direction: 'out',
      })
    }
  }

  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}
