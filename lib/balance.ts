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

export function computeBalances(members: Member[], expenses: Expense[], repayments: Repayment[]) {
  const currencies = new Set<CurrencyCode>()
  expenses.filter((e) => e.scope === 'household').forEach((e) => currencies.add(e.currency))
  repayments.forEach((r) => currencies.add(r.currency))

  const balances = [...currencies].flatMap((currency) => members.map((member) => {
    const currencyExpenses = expenses.filter((e) => e.scope === 'household' && e.currency === currency)
    const currencyRepayments = repayments.filter((r) => r.currency === currency)
    const paid = currencyExpenses.filter((e) => e.payerId === member.id).reduce((s, e) => s + e.amount, 0)
    const share = currencyExpenses.reduce((s, e) => s + e.amount / Math.max(members.length, 1), 0)
    const outgoing = currencyRepayments.filter((r) => r.fromId === member.id).reduce((s, r) => s + r.amount, 0)
    const incoming = currencyRepayments.filter((r) => r.toId === member.id).reduce((s, r) => s + r.amount, 0)
    return { memberId: member.id, currency, paid, share, outgoing, incoming, net: paid - share + outgoing - incoming }
  }))

  return { balances, currencies: [...currencies] }
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
