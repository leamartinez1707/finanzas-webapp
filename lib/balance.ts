import type { CurrencyCode, Expense, Member, Repayment } from './types'

export interface MemberBalance {
  memberId: string
  currency: CurrencyCode
  paid: number
  share: number
  outgoing: number
  incoming: number
  net: number // paid - share + outgoing - incoming; positive => le deben
}

export interface Settlement {
  fromId: string
  toId: string
  amount: number
  currency: CurrencyCode
}

function filterByMonth<T extends { date: string }>(items: T[], month: { year: number; month: number }): T[] {
  return items.filter((item) => {
    const d = new Date(item.date)
    return d.getFullYear() === month.year && d.getMonth() === month.month
  })
}

export function computeBalances(
  members: Member[],
  expenses: Expense[],
  repayments: Repayment[],
  month?: { year: number; month: number },
) {
  const filteredExpenses = month ? filterByMonth(expenses, month) : expenses
  const filteredRepayments = month ? filterByMonth(repayments, month) : repayments

  const currencies = new Set<CurrencyCode>()
  filteredExpenses.filter((e) => e.scope === 'household').forEach((e) => currencies.add(e.currency))
  filteredRepayments.forEach((r) => currencies.add(r.currency))

  const balances = [...currencies].flatMap((currency) => members.map((member) => {
    const currencyExpenses = filteredExpenses.filter((e) => e.scope === 'household' && e.currency === currency)
    const currencyRepayments = filteredRepayments.filter((r) => r.currency === currency)
    const paid = currencyExpenses.filter((e) => e.payerId === member.id).reduce((s, e) => s + e.amount, 0)
    const share = currencyExpenses.reduce((s, e) => s + e.amount / Math.max(members.length, 1), 0)
    const outgoing = currencyRepayments.filter((r) => r.fromId === member.id).reduce((s, r) => s + r.amount, 0)
    const incoming = currencyRepayments.filter((r) => r.toId === member.id).reduce((s, r) => s + r.amount, 0)
    return { memberId: member.id, currency, paid, share, outgoing, incoming, net: paid - share + outgoing - incoming }
  }))

  return { balances, currencies: [...currencies] }
}

export function expenseShare(expense: Expense, memberCount: number): number {
  return memberCount > 1 ? Math.round(expense.amount / memberCount) : expense.amount
}

export function sumByCurrency<T extends { amount: number; currency: CurrencyCode }>(
  items: T[],
): Partial<Record<CurrencyCode, number>> {
  const result: Partial<Record<CurrencyCode, number>> = {}
  for (const item of items) {
    result[item.currency] = (result[item.currency] ?? 0) + item.amount
  }
  return result
}

// Greedy settlement: minimize transfers
export function computeSettlements(balances: MemberBalance[], currency: CurrencyCode): Settlement[] {
  const currencyBalances = balances.filter((b) => b.currency === currency)
  const debtors = currencyBalances
    .filter((b) => b.net < -0.5)
    .map((b) => ({ id: b.memberId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = currencyBalances
    .filter((b) => b.net > 0.5)
    .map((b) => ({ id: b.memberId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    settlements.push({
      fromId: debtors[i].id,
      toId: creditors[j].id,
      amount: Math.round(pay * 100) / 100,
      currency,
    })
    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount < 0.5) i++
    if (creditors[j].amount < 0.5) j++
  }
  return settlements
}
