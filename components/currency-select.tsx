'use client'

import { CURRENCIES } from '@/lib/categories'
import type { CurrencyCode } from '@/lib/types'
import { cn } from '@/lib/utils'

const ORDER: CurrencyCode[] = ['UYU', 'USD', 'ARS', 'EUR']

export function CurrencySelect({
  value,
  onChange,
  compact,
  disabled,
}: {
  value: CurrencyCode
  onChange: (c: CurrencyCode) => void
  compact?: boolean
  disabled?: boolean
}) {
  return (
    <div className={cn('flex gap-2', compact ? 'flex-wrap justify-center' : 'grid grid-cols-2')}>
      {ORDER.map((c) => {
        const selected = value === c
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return
              onChange(c)
            }}
            className={cn(
              'rounded-full border text-left transition-colors',
              compact
                ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs'
                : 'flex items-center gap-2.5 rounded-2xl p-3',
              selected ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted/50',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold',
                compact
                  ? cn(
                      'size-6 text-[10px]',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )
                  : cn(
                      'size-9 text-sm rounded-xl',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    ),
              )}
            >
              {CURRENCIES[c].symbol}
            </span>
            {!compact && (
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{c}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {CURRENCIES[c].label}
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
