'use client'

import { useApp } from '@/lib/store'
import { CATEGORIES } from '@/lib/categories'
import { CategoryIcon } from '@/components/category-icon'
import { Money, CurrencyTag } from '@/components/money'
import { PersonAvatar } from '@/components/person-avatar'
import { formatRelative } from '@/lib/format'
import type { CurrencyCode, Expense } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ExpenseRow({
  expense,
  baseCurrency,
  onClick,
}: {
  expense: Expense
  baseCurrency: CurrencyCode
  onClick?: () => void
}) {
  const { getMember } = useApp()
  const payer = getMember(expense.payerId)

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border border-transparent bg-card p-3 text-left transition-colors',
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
      <div className="flex items-center gap-2.5">
        <Money amount={expense.amount} currency={expense.currency} className="text-base" />
        {expense.scope === 'household' && payer && (
          <PersonAvatar member={payer} size="xs" />
        )}
      </div>
    </button>
  )
}
