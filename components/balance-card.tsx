'use client'

import { ArrowRight } from 'lucide-react'
import { useApp } from '@/lib/store'
import { computeBalances, computeSettlements } from '@/lib/balance'
import { Money } from '@/components/money'
import { PersonAvatar } from '@/components/person-avatar'
import { cn } from '@/lib/utils'

export function BalanceCard() {
  const { activeHousehold, members, expenses, currentUserId, getMember } = useApp()
  if (!activeHousehold) return null

  const householdMembers = activeHousehold.memberIds
    .map((id) => members.find((m) => m.id === id)!)
    .filter(Boolean)

  const { balances, total } = computeBalances(householdMembers, expenses)
  const settlements = computeSettlements(balances)
  const me = balances.find((b) => b.memberId === currentUserId)
  const myNet = me?.net ?? 0
  const currency = activeHousehold.currency
  const settled = Math.abs(myNet) < 1

  return (
    <section
      className="rounded-[28px] border border-border bg-card p-6 shadow-sm"
      aria-labelledby="balance-heading"
    >
      <div className="flex items-center justify-between">
        <h2 id="balance-heading" className="text-sm font-medium text-muted-foreground">
          Tu balance en {activeHousehold.name}
        </h2>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            settled
              ? 'bg-muted text-muted-foreground'
              : myNet > 0
                ? 'bg-positive/15 text-positive'
                : 'bg-negative/15 text-negative',
          )}
        >
          {settled ? 'Al día' : myNet > 0 ? 'Te deben' : 'Debés'}
        </span>
      </div>

      <Money
        amount={Math.abs(myNet)}
        currency={currency}
        className={cn(
          'mt-2 block text-[44px] leading-none',
          settled ? 'text-foreground' : myNet > 0 ? 'text-positive' : 'text-negative',
        )}
      />
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        {settled
          ? 'Estás en paz con todos. Nada pendiente por saldar este mes.'
          : myNet > 0
            ? 'Es lo que el resto del hogar te debe en total este mes.'
            : 'Es lo que le debés al resto del hogar en total este mes.'}
      </p>

      {settlements.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2">
          {settlements.map((s, i) => {
            const from = getMember(s.fromId)
            const to = getMember(s.toId)
            if (!from || !to) return null
            return (
              <li
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5"
              >
                <PersonAvatar member={from} size="sm" />
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <PersonAvatar member={to} size="sm" />
                <span className="ml-1 min-w-0 truncate text-sm">
                  <span className="font-semibold">{from.name}</span>
                  {' le paga a '}
                  <span className="font-semibold">{to.name}</span>
                </span>
                <Money
                  amount={s.amount}
                  currency={currency}
                  className="ml-auto text-sm font-semibold"
                />
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Gasto compartido del mes:{' '}
        <Money amount={total} currency={currency} className="text-xs font-semibold text-foreground" />
      </p>
    </section>
  )
}
