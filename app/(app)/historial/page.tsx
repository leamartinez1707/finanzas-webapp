'use client'

import { useMemo, useState } from 'react'
import { Clock3, ListFilter, X, ReceiptText, Target, PiggyBank } from 'lucide-react'
import { useApp } from '@/lib/store'
import { buildActivity } from '@/lib/activity'
import { ScreenHeader } from '@/components/screen-header'
import { ActivityRow } from '@/components/activity-row'
import { EmptyState } from '@/components/empty-state'
import { PersonAvatar } from '@/components/person-avatar'
import { CATEGORY_LIST } from '@/lib/categories'
import { monthKey, monthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActivityKind, CategoryId } from '@/lib/types'

const KIND_LABELS: Record<ActivityKind, { label: string; icon: typeof ReceiptText }> = {
  gasto: { label: 'Gastos', icon: ReceiptText },
  aporte: { label: 'Aportes', icon: Target },
  ahorro: { label: 'Ahorros', icon: PiggyBank },
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
  } = useApp()

  const [kindFilter, setKindFilter] = useState<ActivityKind | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | null>(null)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)

  const scopeFilter = useMemo(() => {
    if (isPersonal) return { scope: 'personal' as const, ownerId: currentUser!.id }
    return { scope: 'household' as const, householdId: activeHousehold!.id }
  }, [isPersonal, currentUser?.id, activeHousehold])

  const allActivity = useMemo(
    () => buildActivity({ expenses, goals, savings, members, baseCurrency: activeCurrency }, scopeFilter),
    [expenses, goals, savings, members, activeCurrency, scopeFilter],
  )

  const filtered = useMemo(() => {
    let list = allActivity
    if (kindFilter) list = list.filter((a) => a.kind === kindFilter)
    if (categoryFilter) list = list.filter((a) => a.category === categoryFilter)
    if (memberFilter) list = list.filter((a) => a.memberId === memberFilter)
    return list
  }, [allActivity, kindFilter, categoryFilter, memberFilter])

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
    <div className="space-y-5">
      <ScreenHeader title="Historial" subtitle="Todos los movimientos" />

      {/* --- kind filters --- */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['gasto', 'aporte', 'ahorro'] as ActivityKind[]).map((kind) => {
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

        {/* category filter (only for gastos) */}
        {(!kindFilter || kindFilter === 'gasto') && (
          <div className="flex gap-1.5 border-l border-border pl-2">
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
          </div>
        )}

        {/* person filter */}
        {peopleInActivity.length > 1 && (
          <div className="flex gap-1.5 border-l border-border pl-2">
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
          </div>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <X className="size-3" />
            Limpiar
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
              : 'Cuando registres gastos, aportes o ahorros, van a aparecer acá.'
          }
        />
      )}
    </div>
  )
}
