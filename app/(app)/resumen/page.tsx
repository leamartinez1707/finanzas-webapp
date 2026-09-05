'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Download, PieChart } from 'lucide-react'
import { useApp } from '@/lib/store'
import { computeBalances } from '@/lib/balance'
import { ScreenHeader } from '@/components/screen-header'
import { CategoryIcon } from '@/components/category-icon'
import { EmptyState } from '@/components/empty-state'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { MonthNav } from '@/components/month-nav'
import { ProgressBar, SegmentedBar } from '@/components/progress-bar'
import { CATEGORIES, CATEGORY_LIST, personColorVar } from '@/lib/categories'
import {
  currentMonthCursor,
  formatCompact,
  isSameMonthCursor,
  monthCursorKey,
  monthCursorLabel,
  monthKey,
  parseLocalDate,
  prevMonthCursor,
  type MonthCursor,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CategoryId } from '@/lib/types'

export default function ResumenPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    loading,
    members,
    expenses,
    repayments,
    householdBalances,
    ensureMonthLoaded,
    loadFullHistory,
  } = useApp()

  const [monthFilter, setMonthFilter] = useState<MonthCursor | null>(currentMonthCursor())

  function handleMonthChange(month: MonthCursor) {
    void ensureMonthLoaded(month)
    setMonthFilter(month)
  }

  async function showFullHistory() {
    await loadFullHistory()
    setMonthFilter(null)
  }

  // La tendencia de 6 meses (trendMonths, abajo) necesita el mes más viejo
  // de ese rango cargado en memoria — puede caer antes de la ventana actual
  // aunque trendEndCursor mismo ya esté cubierto por ensureMonthLoaded.
  useEffect(() => {
    let cursor = monthFilter ?? currentMonthCursor()
    for (let i = 0; i < 5; i++) cursor = prevMonthCursor(cursor)
    void ensureMonthLoaded(cursor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter?.year, monthFilter?.month, ensureMonthLoaded])

  // --- resolve household members (same as gastos/page.tsx) ---
  const householdMembers = useMemo(() => {
    if (isPersonal || !activeHousehold) return []
    return activeHousehold.memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [isPersonal, activeHousehold, members])

  // --- scoped + filtered expenses (same pattern as gastos/page.tsx) ---
  const scopedExpenses = useMemo(() => {
    const list = isPersonal
      ? expenses.filter((e) => e.scope === 'personal' && e.ownerId === currentUser?.id)
      : expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold?.id)

    return [...list].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
  }, [expenses, isPersonal, currentUser?.id, activeHousehold])

  const filteredExpenses = useMemo(() => {
    if (!monthFilter) return scopedExpenses
    return scopedExpenses.filter((e) => monthKey(e.date) === monthCursorKey(monthFilter))
  }, [scopedExpenses, monthFilter])

  // --- total + delta vs. previous month (only when a specific month is selected) ---
  const total = useMemo(
    () => filteredExpenses.filter((e) => e.currency === activeCurrency).reduce((s, e) => s + e.amount, 0),
    [filteredExpenses, activeCurrency],
  )

  const delta = useMemo(() => {
    if (!monthFilter) return null
    const prevKey = monthCursorKey(prevMonthCursor(monthFilter))
    const prevTotal = scopedExpenses
      .filter((e) => monthKey(e.date) === prevKey && e.currency === activeCurrency)
      .reduce((s, e) => s + e.amount, 0)
    if (prevTotal <= 0) return null
    return ((total - prevTotal) / prevTotal) * 100
  }, [monthFilter, scopedExpenses, total, activeCurrency])

  // --- tendencia: total gastado por mes, últimos 6 meses hasta el mes seleccionado ---
  const trendEndCursor = monthFilter ?? currentMonthCursor()

  const trendMonths = useMemo(() => {
    const cursors: MonthCursor[] = []
    let cursor = trendEndCursor
    for (let i = 0; i < 6; i++) {
      cursors.unshift(cursor)
      cursor = prevMonthCursor(cursor)
    }
    return cursors.map((c) => {
      const key = monthCursorKey(c)
      const total = scopedExpenses
        .filter((e) => e.currency === activeCurrency && monthKey(e.date) === key)
        .reduce((s, e) => s + e.amount, 0)
      return { cursor: c, key, total }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendEndCursor.year, trendEndCursor.month, scopedExpenses, activeCurrency])

  const maxTrendTotal = Math.max(0, ...trendMonths.map((m) => m.total))

  // --- por categoría ---
  const byCategory = useMemo(() => {
    const map = new Map<CategoryId, number>()
    for (const e of filteredExpenses) {
      if (e.currency !== activeCurrency) continue
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    }
    return CATEGORY_LIST
      .map((c) => ({ ...c, total: map.get(c.id) ?? 0 }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filteredExpenses, activeCurrency])

  const maxCategoryTotal = byCategory[0]?.total ?? 0

  // --- por persona (household only) ---
  const householdExpenses = useMemo(() => {
    if (isPersonal || !activeHousehold) return []
    return expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold.id)
  }, [isPersonal, activeHousehold, expenses])

  const householdRepayments = useMemo(() => {
    if (isPersonal || !activeHousehold) return []
    return repayments.filter((r) => r.householdId === activeHousehold.id)
  }, [isPersonal, activeHousehold, repayments])

  const byPerson = useMemo(() => {
    if (isPersonal || !activeHousehold || householdMembers.length === 0) return []
    // Con un mes puntual seleccionado, ese mes siempre está en la ventana
    // cargada (ensureMonthLoaded más arriba) así que computeBalances sobre
    // los arrays en memoria sigue sirviendo. "Ver todo el historial"
    // (monthFilter null) necesita el agregado server-side (all-time),
    // no los arrays ventaneados.
    if (monthFilter) {
      const { balances } = computeBalances(householdMembers, householdExpenses, householdRepayments, monthFilter)
      return householdMembers
        .map((m) => {
          const paid = balances
            .filter((b) => b.memberId === m.id && b.currency === activeCurrency)
            .reduce((s, b) => s + b.paid, 0)
          return { member: m, paid }
        })
        .filter((p) => p.paid > 0)
        .sort((a, b) => b.paid - a.paid)
    }
    return householdMembers
      .map((m) => {
        const paid = householdBalances
          .filter((b) => b.householdId === activeHousehold.id && b.memberId === m.id && b.currency === activeCurrency)
          .reduce((s, b) => s + b.paid, 0)
        return { member: m, paid }
      })
      .filter((p) => p.paid > 0)
      .sort((a, b) => b.paid - a.paid)
  }, [isPersonal, activeHousehold, householdMembers, householdExpenses, householdRepayments, householdBalances, monthFilter, activeCurrency])

  const hasData = filteredExpenses.length > 0

  // --- CSV export ---
  function exportCsv() {
    const header = 'Fecha,Descripcion,Categoria,Monto,Moneda,Pagador'
    const rows = filteredExpenses.map((e) => {
      const payer = members.find((m) => m.id === e.payerId)
      const fecha = e.date
      const descripcion = `"${e.description.replace(/"/g, '""')}"`
      const categoria = CATEGORIES[e.category].label
      return [fecha, descripcion, categoria, e.amount, e.currency, payer?.name ?? ''].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = monthFilter
      ? `nido-gastos-${normalizeFileLabel(monthCursorLabel(monthFilter))}.csv`
      : 'nido-gastos-todos.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Resumen"
        subtitle={isPersonal ? 'Tus finanzas' : activeHousehold?.name}
        action={
          <button
            onClick={exportCsv}
            disabled={!hasData}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Exportar CSV
          </button>
        }
      />

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

      {hasData ? (
        <>
          {/* --- total + delta --- */}
          <div className="rounded-[28px] border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              Total {monthFilter ? 'del mes' : 'del período'}
            </p>
            <Money amount={total} currency={activeCurrency} className="mt-1.5 block text-[40px] leading-none" />
            {delta !== null && (
              <p
                className={cn(
                  'mt-2 inline-flex items-center gap-1 text-sm font-semibold',
                  delta > 0 ? 'text-destructive' : delta < 0 ? 'text-positive' : 'text-muted-foreground',
                )}
              >
                {delta > 0 ? <ArrowUp className="size-3.5" /> : delta < 0 ? <ArrowDown className="size-3.5" /> : null}
                {Math.abs(delta).toFixed(0)}% vs. mes anterior
              </p>
            )}
          </div>

          {/* --- tendencia: últimos 6 meses --- */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tendencia
            </h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-end justify-between gap-1.5">
                {trendMonths.map((m) => {
                  const isSelected = isSameMonthCursor(m.cursor, trendEndCursor)
                  const isMax = maxTrendTotal > 0 && m.total === maxTrendTotal
                  const heightPct =
                    maxTrendTotal > 0 ? Math.max((m.total / maxTrendTotal) * 100, m.total > 0 ? 6 : 3) : 3

                  return (
                    <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="h-3.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {isSelected || isMax ? formatCompact(m.total, activeCurrency) : ''}
                      </span>
                      <div className="flex h-20 w-full items-end justify-center">
                        <div
                          className={cn(
                            'w-full max-w-8 rounded-t-[4px] transition-all duration-500',
                            isSelected ? 'bg-primary' : 'bg-muted-foreground/25',
                          )}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-medium capitalize',
                          isSelected ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {monthCursorLabel(m.cursor).slice(0, 3).toLowerCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* --- por categoría --- */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Por categoría
            </h2>
            <ul className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              {byCategory.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <CategoryIcon category={c.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.label}</span>
                      <Money amount={c.total} currency={activeCurrency} className="shrink-0 text-sm font-semibold" />
                    </div>
                    <ProgressBar
                      value={(c.total / maxCategoryTotal) * 100}
                      color={c.color}
                      className="mt-1.5"
                      height="h-1.5"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* --- por persona (household only) --- */}
          {!isPersonal && byPerson.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Por persona
              </h2>
              <div className="rounded-2xl border border-border bg-card p-4">
                <SegmentedBar
                  segments={byPerson.map((p) => ({
                    value: p.paid,
                    color: personColorVar(p.member.color),
                    label: p.member.name,
                  }))}
                />
                <ul className="mt-4 flex flex-col gap-2.5">
                  {byPerson.map((p) => (
                    <li key={p.member.id} className="flex items-center gap-3">
                      <PersonAvatar member={p.member} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {p.member.id === currentUser?.id ? 'Yo' : p.member.name}
                      </span>
                      <Money amount={p.paid} currency={activeCurrency} className="text-sm font-semibold" />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      ) : (
        <EmptyState
          icon={PieChart}
          title="Nada para mostrar"
          description={
            monthFilter
              ? 'No hay gastos registrados para este mes.'
              : 'Todavía no hay gastos registrados.'
          }
        />
      )}
    </div>
  )
}

function normalizeFileLabel(label: string) {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}
