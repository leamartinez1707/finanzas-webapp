'use client'

import { useMemo, useState } from 'react'
import { Clock3, ListFilter, ReceiptText, Target, Wallet, PiggyBank, HandCoins } from 'lucide-react'
import { useApp } from '@/lib/store'
import { buildActivity } from '@/lib/activity'
import { ScreenHeader } from '@/components/screen-header'
import { ActivityRow } from '@/components/activity-row'
import { EmptyState } from '@/components/empty-state'
import { PersonAvatar } from '@/components/person-avatar'
import { Sheet } from '@/components/sheet'
import { FilterTrigger, ActiveFilterPills, FilterSection } from '@/components/filter-sheet'
import { MonthNav } from '@/components/month-nav'
import { CATEGORY_LIST } from '@/lib/categories'
import { currentMonthCursor, monthCursorKey, monthKey, monthLabel, type MonthCursor } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActivityKind, CategoryId } from '@/lib/types'

const KIND_LABELS: Record<ActivityKind, { label: string; icon: typeof ReceiptText }> = {
  gasto: { label: 'Gastos', icon: ReceiptText },
  aporte: { label: 'Aportes', icon: Target },
  ingreso: { label: 'Ingresos', icon: Wallet },
  ahorro: { label: 'Ahorros', icon: PiggyBank },
  pago: { label: 'Pagos', icon: HandCoins },
}

export default function HistorialPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    loading,
    members,
    expenses,
    goals,
    savings,
    repayments,
    ensureMonthLoaded,
    loadFullHistory,
  } = useApp()

  const [kindFilter, setKindFilter] = useState<ActivityKind | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | null>(null)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<MonthCursor | null>(currentMonthCursor())
  const [filtersOpen, setFiltersOpen] = useState(false)

  function handleMonthChange(month: MonthCursor) {
    void ensureMonthLoaded(month)
    setMonthFilter(month)
  }

  async function showFullHistory() {
    await loadFullHistory()
    setMonthFilter(null)
  }

  const scopeFilter = useMemo(() => {
    if (isPersonal) return { scope: 'personal' as const, ownerId: currentUser?.id ?? '' }
    return { scope: 'household' as const, householdId: activeHousehold?.id ?? '' }
  }, [isPersonal, currentUser?.id, activeHousehold])

  const allActivity = useMemo(
    () => buildActivity({ expenses, goals, savings, repayments, members, baseCurrency: activeCurrency }, scopeFilter),
    [expenses, goals, savings, repayments, members, activeCurrency, scopeFilter],
  )

  const filtered = useMemo(() => {
    let list = allActivity
    if (kindFilter) list = list.filter((a) => a.kind === kindFilter)
    if (categoryFilter) list = list.filter((a) => a.category === categoryFilter)
    if (memberFilter) list = list.filter((a) => a.memberId === memberFilter)
    if (monthFilter) list = list.filter((a) => monthKey(a.date) === monthCursorKey(monthFilter))
    return list
  }, [allActivity, kindFilter, categoryFilter, memberFilter, monthFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const item of filtered) {
      const k = monthKey(item.date)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(item)
    }
    return [...map.entries()]
  }, [filtered])

  // People to filter by (members involved in activities)
  const peopleInActivity = useMemo(() => {
    const ids = new Set(allActivity.map((a) => a.memberId))
    return [...ids].map((id) => members.find((m) => m.id === id)).filter(Boolean)
  }, [allActivity, members])

  const hasFilters = kindFilter !== null || categoryFilter !== null || memberFilter !== null

  function clearFilters() {
    setKindFilter(null)
    setCategoryFilter(null)
    setMemberFilter(null)
  }

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader title="Historial" subtitle="Todos los movimientos" />

      {/* --- filters --- */}
      <FilterTrigger
        onClick={() => setFiltersOpen(true)}
        activeCount={(kindFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (memberFilter ? 1 : 0)}
      />

      {hasFilters && (
        <ActiveFilterPills
          pills={[
            ...(kindFilter
              ? [{ key: 'kind', label: KIND_LABELS[kindFilter].label, onRemove: () => setKindFilter(null) }]
              : []),
            ...(categoryFilter
              ? [
                  {
                    key: 'category',
                    label: CATEGORY_LIST.find((c) => c.id === categoryFilter)?.label ?? '',
                    onRemove: () => setCategoryFilter(null),
                  },
                ]
              : []),
            ...(memberFilter
              ? [
                  {
                    key: 'member',
                    label:
                      memberFilter === currentUser?.id
                        ? 'Yo'
                        : (peopleInActivity.find((m) => m?.id === memberFilter)?.name.split(' ')[0] ?? ''),
                    onRemove: () => setMemberFilter(null),
                  },
                ]
              : []),
          ]}
          onClearAll={clearFilters}
        />
      )}

      {/* --- month filter --- */}
      <div className="flex flex-col items-center gap-1.5">
        {monthFilter ? (
          <>
            <MonthNav value={monthFilter} onChange={handleMonthChange} />
            <button
              onClick={showFullHistory}
              className="text-xs font-medium text-primary"
            >
              Ver todo el historial
            </button>
          </>
        ) : (
          <button
            onClick={() => setMonthFilter(currentMonthCursor())}
            className="text-xs font-medium text-primary"
          >
            Volver al mes actual
          </button>
        )}
      </div>

      {/* --- count --- */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} movimiento{filtered.length !== 1 && 's'}
        {hasFilters && ' filtrados'}
      </p>

      {/* --- list --- */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(([key, items]) => (
            <section key={key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {monthLabel(key)}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <ActivityRow key={item.id} item={item} baseCurrency={activeCurrency} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={hasFilters ? ListFilter : Clock3}
          title={hasFilters ? 'Sin resultados' : 'Todavía no hay movimientos'}
          description={
            hasFilters
              ? 'Probá con otros filtros.'
              : 'Cuando registres gastos, aportes, ingresos o ahorros, van a aparecer acá.'
          }
        />
      )}

      {/* --- filters sheet --- */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        <div className="space-y-5">
          <FilterSection title="Tipo">
            {(['gasto', 'aporte', 'ingreso', 'ahorro', 'pago'] as ActivityKind[]).map((kind) => {
              const active = kindFilter === kind
              const { label, icon: Icon } = KIND_LABELS[kind]
              return (
                <button
                  key={kind}
                  onClick={() => setKindFilter(active ? null : kind)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              )
            })}
          </FilterSection>

          {(!kindFilter || kindFilter === 'gasto') && (
            <FilterSection title="Categoría">
              {CATEGORY_LIST.map((c) => {
                const active = categoryFilter === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(active ? null : c.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </button>
                )
              })}
            </FilterSection>
          )}

          {peopleInActivity.length > 1 && (
            <FilterSection title="Persona">
              {peopleInActivity.map((m) => {
                if (!m) return null
                const active = memberFilter === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMemberFilter(active ? null : m.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                    )}
                  >
                    <PersonAvatar member={m} size="xs" />
                    {m.id === currentUser?.id ? 'Yo' : m.name.split(' ')[0]}
                  </button>
                )
              })}
            </FilterSection>
          )}
        </div>
      </Sheet>
    </div>
  )
}
