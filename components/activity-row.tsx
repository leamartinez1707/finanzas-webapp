'use client'

import { Wallet, Target, ArrowDownLeft } from 'lucide-react'
import { useApp } from '@/lib/store'
import { CategoryIcon } from '@/components/category-icon'
import { Money, CurrencyTag } from '@/components/money'
import { PersonAvatar } from '@/components/person-avatar'
import { formatRelative } from '@/lib/format'
import type { ActivityItem, CurrencyCode } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ActivityRow({
  item,
  baseCurrency,
  onClick,
}: {
  item: ActivityItem
  baseCurrency: CurrencyCode
  onClick?: () => void
}) {
  const { getMember } = useApp()
  const member = getMember(item.memberId)
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <li>
      <Wrapper
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl bg-card p-2.5 text-left transition-colors',
          onClick && 'hover:bg-muted/60 active:scale-[0.99]',
        )}
      >
      {item.kind === 'gasto' && item.category ? (
        <CategoryIcon category={item.category} size="md" />
      ) : (
        <span
          className={cn(
            'inline-flex size-10 items-center justify-center rounded-xl',
            item.kind === 'aporte'
              ? 'bg-primary/12 text-primary'
              : item.direction === 'in'
                ? 'bg-positive/12 text-positive'
                : 'bg-negative/12 text-destructive',
          )}
        >
          {item.kind === 'aporte' ? (
            <Target className="size-4.5" />
          ) : item.direction === 'in' ? (
            <Wallet className="size-4.5" />
          ) : (
            <ArrowDownLeft className="size-4.5" />
          )}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{item.title}</p>
          <CurrencyTag currency={item.currency} base={baseCurrency} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
        <p className="truncate text-xs text-muted-foreground">{formatRelative(item.date, item.createdAt)}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <Money
          amount={item.direction === 'out' && item.kind !== 'gasto' ? -item.amount : item.amount}
          currency={item.currency}
          sign={item.direction === 'in'}
          className={cn(
            'text-base',
            item.kind === 'gasto'
              ? 'text-foreground'
              : item.direction === 'in'
                ? 'text-positive'
                : 'text-destructive',
          )}
        />
        {member && <PersonAvatar member={member} size="xs" />}
      </div>
      </Wrapper>
    </li>
  )
}
