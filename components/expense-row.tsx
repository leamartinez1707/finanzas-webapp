'use client'

import { useApp } from '@/lib/store'
import { expenseShare } from '@/lib/balance'
import { CATEGORIES } from '@/lib/categories'
import { CategoryIcon } from '@/components/category-icon'
import { Money, CurrencyTag } from '@/components/money'
import { PersonAvatar } from '@/components/person-avatar'
import { formatRelative } from '@/lib/format'
import type { CurrencyCode, Expense, Repayment } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ExpenseRow({
  expense,
  baseCurrency,
  members,
  repayments,
  onClick,
}: {
  expense: Expense
  baseCurrency: CurrencyCode
  members: number
  repayments?: Repayment[]
  onClick?: () => void
}) {
  const { getMember, currentUserId } = useApp()
  const payer = getMember(expense.payerId)

  const share = expenseShare(expense, members)
  const isPayer = expense.payerId === currentUserId

  const expenseDate = new Date(expense.date)
  const expenseMonth = expenseDate.getMonth()
  const expenseYear = expenseDate.getFullYear()

  const paidBack = !isPayer && currentUserId
    ? (repayments ?? [])
        .filter((r) => {
          if (r.fromId !== currentUserId || r.toId !== expense.payerId) return false
          if (r.currency !== expense.currency) return false
          const rd = new Date(r.date)
          return rd.getFullYear() === expenseYear && rd.getMonth() === expenseMonth
        })
        .reduce((s, r) => s + r.amount, 0)
    : 0

  const isFullyPaid = paidBack >= share

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border border-transparent bg-card p-2.5 text-left transition-colors',
        onClick && 'hover:border-border',
      )}
    >
      <CategoryIcon category={expense.category} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{expense.description}</p>
          <CurrencyTag currency={expense.currency} base={baseCurrency} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {CATEGORIES[expense.category].label}
          {payer && expense.scope === 'household' && ` · pagó ${payer.name}`}
          {` · ${formatRelative(expense.date)}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {expense.scope === 'household' && members > 1 && !isPayer && paidBack > 0 && (
          <span className={cn(
            'rounded-full px-2 py-1 text-[10px] font-semibold',
            isFullyPaid ? 'bg-positive/20 text-positive' : 'bg-positive/15 text-positive',
          )}>
            {isFullyPaid ? (
              <span className="flex items-center gap-1">✓ Saldado</span>
            ) : (
              <Money amount={paidBack} currency={expense.currency} className="tnum" />
            )}
          </span>
        )}
        <Money amount={expense.amount} currency={expense.currency} className="text-base" />
        {expense.scope === 'household' && payer && (
          <PersonAvatar member={payer} size="xs" />
        )}
      </div>
    </button>
  )
}
