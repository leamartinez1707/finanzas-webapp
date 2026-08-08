import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'
import type { CurrencyCode } from '@/lib/types'

export function Money({
  amount,
  currency,
  className,
  sign = false,
  decimals = false,
}: {
  amount: number
  currency: CurrencyCode
  className?: string
  sign?: boolean
  decimals?: boolean
}) {
  return (
    <span className={cn('font-display tnum tracking-tight', className)}>
      {formatMoney(amount, currency, { sign, decimals })}
    </span>
  )
}

// Highlight when a currency differs from the context's default currency
export function CurrencyTag({
  currency,
  base,
  className,
}: {
  currency: CurrencyCode
  base: CurrencyCode
  className?: string
}) {
  if (currency === base) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-warning/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-foreground ring-1 ring-warning/40',
        className,
      )}
    >
      {currency}
    </span>
  )
}
