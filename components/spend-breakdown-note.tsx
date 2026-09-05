import { formatMoney } from '@/lib/format'
import type { CurrencyCode } from '@/lib/types'

interface Contributor {
  label: string
  amount: number
}

// Desglosa un total en sus partes ("Personal $X · Hogar A $Y") para que no
// sea una caja negra. Si solo hay un contribuyente con plata, no aporta nada
// mostrarlo por separado — no renderiza nada en ese caso.
export function SpendBreakdownNote({ contributors, currency }: { contributors: Contributor[]; currency: CurrencyCode }) {
  const visible = contributors.filter((c) => c.amount !== 0)
  if (visible.length <= 1) return null

  return (
    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
      {visible.map((c, i) => (
        <span key={c.label}>
          {i > 0 && ' · '}
          {c.label} {formatMoney(c.amount, currency)}
        </span>
      ))}
    </p>
  )
}
