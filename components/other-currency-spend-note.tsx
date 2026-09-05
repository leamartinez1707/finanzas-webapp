import { Money } from '@/components/money'
import type { HouseholdSpendShare } from '@/lib/balance'

// Hogares en una moneda distinta a la de la vista personal: no se pueden
// sumar a "Disponible"/"Gasto del mes" sin un tipo de cambio (no existe
// conversión de moneda en la app), así que se muestran aparte y bien claros
// — mismo criterio que el bloque de "otras monedas" del balance del hogar.
export function OtherCurrencySpendNote({
  households,
  periodLabel,
}: {
  households: HouseholdSpendShare[]
  periodLabel: string
}) {
  const withSpend = households.filter((h) => h.myShare > 0)
  if (withSpend.length === 0) return null

  return (
    <div className="mt-3 rounded-2xl bg-secondary/40 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">También gastaste en otra moneda {periodLabel}</p>
      <ul className="mt-1 space-y-0.5">
        {withSpend.map((h) => (
          <li key={h.householdId} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">{h.householdName} (tu parte)</span>
            <Money amount={h.myShare} currency={h.currency} className="shrink-0 font-semibold text-foreground" />
          </li>
        ))}
      </ul>
      <p className="mt-1.5">No se suma a Disponible ni a Gasto del mes porque no hay forma de convertirlo automáticamente.</p>
    </div>
  )
}
