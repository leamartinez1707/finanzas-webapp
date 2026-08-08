import Link from 'next/link'
import { CalendarDays, House, User } from 'lucide-react'
import type { CurrencyCode, Goal } from '@/lib/types'
import { Money, CurrencyTag } from '@/components/money'
import { ProgressBar } from '@/components/progress-bar'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function goalSaved(goal: Goal) {
  return goal.contributions.reduce((s, c) => s + c.amount, 0)
}

export function GoalCard({
  goal,
  baseCurrency,
  showScope = false,
}: {
  goal: Goal
  baseCurrency: CurrencyCode
  showScope?: boolean
}) {
  const saved = goalSaved(goal)
  const pct = goal.target > 0 ? (saved / goal.target) * 100 : 0
  const done = pct >= 100

  return (
    <Link
      href={`/objetivos/${goal.id}`}
      className="block rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{goal.name}</h3>
            <CurrencyTag currency={goal.currency} base={baseCurrency} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {showScope && (
              <span className="inline-flex items-center gap-1">
                {goal.scope === 'household' ? (
                  <House className="size-3" />
                ) : (
                  <User className="size-3" />
                )}
                {goal.scope === 'household' ? 'Hogar' : 'Personal'}
              </span>
            )}
            {goal.deadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDate(goal.deadline)}
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
            done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {Math.min(100, Math.round(pct))}%
        </span>
      </div>

      <div className="mt-3">
        <ProgressBar value={pct} />
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <Money amount={saved} currency={goal.currency} className="text-lg font-bold" />
        <span className="text-sm text-muted-foreground">
          de <Money amount={goal.target} currency={goal.currency} className="tnum" />
        </span>
      </div>
    </Link>
  )
}
