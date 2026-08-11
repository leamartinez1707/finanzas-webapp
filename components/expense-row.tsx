'use client'

import { useApp } from '@/lib/store'
import { CATEGORIES } from '@/lib/categories'
import { CategoryIcon } from '@/components/category-icon'
import { Money, CurrencyTag } from '@/components/money'
import { PersonAvatar } from '@/components/person-avatar'
import { formatRelative } from '@/lib/format'
import type { CurrencyCode, Expense } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function ExpenseRow({
  expense,
  baseCurrency,
  members,
  onClick,
}: {
  expense: Expense
  baseCurrency: CurrencyCode
  members: number // number of household members for split calculation
  onClick?: () => void
}) {
  const { getMember, currentUserId, toggleSettled } = useApp()
  const payer = getMember(expense.payerId)

  // Calculate per-person share
  const share = members > 1 ? Math.round(expense.amount / members) : expense.amount
  const isPayer = expense.payerId === currentUserId
  const isSettled = expense.settled

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border border-transparent bg-card p-2.5 text-left transition-colors',
        onClick && 'hover:border-border',
        isSettled && 'opacity-60',
      )}
    >
      <CategoryIcon category={expense.category} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('truncate font-medium', isSettled && 'line-through')}>{expense.description}</p>
          <CurrencyTag currency={expense.currency} base={baseCurrency} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {CATEGORIES[expense.category].label}
          {payer && expense.scope === 'household' && ` · pagó ${payer.name}`}
          {` · ${formatRelative(expense.date)}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* Show per-person share for household expenses */}
        {expense.scope === 'household' && members > 1 && !isPayer && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              toggleSettled(expense.id, !isSettled)
            }}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-colors',
              isSettled
                ? 'bg-muted text-muted-foreground'
                : 'bg-warning/20 text-warning-foreground hover:bg-primary/20 hover:text-primary cursor-pointer',
            )}
            title={isSettled ? 'Click para desmarcar' : 'Click para marcar como saldado'}
          >
            {isSettled ? (
              <>
                <Check className="size-3" />
                Saldado
              </>
            ) : (
              <Money amount={share} currency={expense.currency} className="tnum" />
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
