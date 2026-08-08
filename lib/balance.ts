import type { Expense, Member } from './types'
import { isThisMonth } from './format'

export interface MemberBalance {
  memberId: string
  paid: number
  share: number
  net: number // paid - share; positive => le deben
}

export interface Settlement {
  fromId: string
  toId: string
  amount: number
}

export function computeBalances(members: Member[], expenses: Expense[]) {
  const monthExpenses = expenses.filter(
    (e) => e.scope === 'household' && isThisMonth(e.date),
  )
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const share = members.length ? total / members.length : 0

  const balances: MemberBalance[] = members.map((m) => {
    const paid = monthExpenses
      .filter((e) => e.payerId === m.id)
      .reduce((s, e) => s + e.amount, 0)
    return { memberId: m.id, paid, share, net: paid - share }
  })

  return { balances, total, share }
}

// Greedy settlement: minimize transfers
export function computeSettlements(balances: MemberBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.net < -0.5)
    .map((b) => ({ id: b.memberId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = balances
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
      amount: Math.round(pay),
    })
    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount < 0.5) i++
    if (creditors[j].amount < 0.5) j++
  }
  return settlements
}
