'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Plus, ListFilter, ReceiptText, Wallet } from 'lucide-react'
import { useApp } from '@/lib/store'
import { CATEGORY_LIST } from '@/lib/categories'
import { ScreenHeader } from '@/components/screen-header'
import { ExpenseRow } from '@/components/expense-row'
import { ExpenseForm } from '@/components/expense-form'
import { RecurringExpenseForm } from '@/components/recurring-expense-form'
import { CategoryIcon } from '@/components/category-icon'
import { EmptyState } from '@/components/empty-state'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { Sheet } from '@/components/sheet'
import { FilterTrigger, ActiveFilterPills, FilterSection } from '@/components/filter-sheet'
import { MonthNav } from '@/components/month-nav'
import { ProgressBar } from '@/components/progress-bar'
import { currentMonthCursor, monthCursorKey, monthKey, monthLabel, parseLocalDate, type MonthCursor } from '@/lib/format'
import { sumByCurrency } from '@/lib/balance'
import { cn } from '@/lib/utils'
import type { CategoryId, CurrencyCode, Expense, RecurringExpense } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function GastosPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    members,
    expenses,
    recurringExpenses,
    budgets,
    repayments,
    loading,
    busy,
    addExpense,
    updateExpense,
    deleteExpense,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    addBudget,
    updateBudget,
    deleteBudget,
    ensureMonthLoaded,
    loadFullHistory,
  } = useApp()

  // --- filters ---
  const [openCategory, setOpenCategory] = useState<CategoryId | null>(null)
  const [openPayer, setOpenPayer] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<MonthCursor | null>(currentMonthCursor())

  function handleMonthChange(month: MonthCursor) {
    void ensureMonthLoaded(month)
    setMonthFilter(month)
  }

  async function showFullHistory() {
    await loadFullHistory()
    setMonthFilter(null)
  }

  // --- add / edit sheet ---
  const [editing, setEditing] = useState<Expense | undefined>(undefined)
  const [adding, setAdding] = useState(false)

  // --- recurring: own add / edit sheet ---
  const [recurringEditing, setRecurringEditing] = useState<RecurringExpense | undefined>(undefined)
  const [recurringAdding, setRecurringAdding] = useState(false)

  // --- budgets: single sheet with one row per category ---
  const [budgetsOpen, setBudgetsOpen] = useState(false)
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>({})

  // --- filters: sheet with category + payer sections ---
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Coming from a "Nuevo gasto" link elsewhere (e.g. Inicio) — open the
  // sheet straight away instead of making the user click + again.
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      setAdding(true)
      router.replace('/gastos', { scroll: false })
    }
  }, [searchParams, router])

  // --- resolve members for payer filter (household only) ---
  const householdMembers = useMemo(() => {
    if (isPersonal || !activeHousehold) return []
    return activeHousehold.memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean)
  }, [isPersonal, activeHousehold, members])

  // --- filtered + grouped expenses ---
  const scopedExpenses = useMemo(() => {
    let list = isPersonal
      ? expenses.filter((e) => e.scope === 'personal' && e.ownerId === currentUser?.id)
      : expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold?.id)

    if (openCategory) list = list.filter((e) => e.category === openCategory)
    if (openPayer) list = list.filter((e) => e.payerId === openPayer)
    if (monthFilter) list = list.filter((e) => monthKey(e.date) === monthCursorKey(monthFilter))

    return [...list].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
  }, [expenses, isPersonal, currentUser?.id, activeHousehold, openCategory, openPayer, monthFilter])

  const totalsByCurrency = useMemo(() => sumByCurrency(scopedExpenses), [scopedExpenses])

  // --- recurring templates, filtered by scope the same way as expenses ---
  const scopedRecurring = useMemo(() => {
    return isPersonal
      ? recurringExpenses.filter((r) => r.scope === 'personal' && r.ownerId === currentUser?.id)
      : recurringExpenses.filter((r) => r.scope === 'household' && r.householdId === activeHousehold?.id)
  }, [recurringExpenses, isPersonal, currentUser?.id, activeHousehold])

  // --- budgets, filtered by scope the same way as expenses ---
  const scopedBudgets = useMemo(() => {
    return isPersonal
      ? budgets.filter((b) => b.scope === 'personal' && b.ownerId === currentUser?.id)
      : budgets.filter((b) => b.scope === 'household' && b.householdId === activeHousehold?.id)
  }, [budgets, isPersonal, currentUser?.id, activeHousehold])

  // Reset the sheet's draft amounts from the current budgets right when it
  // opens, so a previous edit that wasn't saved doesn't linger.
  function openBudgets() {
    const init: Record<string, string> = {}
    for (const c of CATEGORY_LIST) {
      const existing = scopedBudgets.find((b) => b.category === c.id)
      init[c.id] = existing ? String(existing.amount) : ''
    }
    setBudgetAmounts(init)
    setBudgetsOpen(true)
  }

  // Worst status across budgeted categories this month — colors the
  // "Presupuestos" pill without opening the sheet.
  const budgetStatus = useMemo<'ok' | 'amber' | 'red'>(() => {
    let worst: 'ok' | 'amber' | 'red' = 'ok'
    for (const b of scopedBudgets) {
      if (b.currency !== activeCurrency || b.amount <= 0) continue
      const gastado = scopedExpenses
        .filter((e) => e.category === b.category && e.currency === activeCurrency)
        .reduce((s, e) => s + e.amount, 0)
      const pct = gastado / b.amount
      if (pct >= 1) return 'red'
      if (pct >= 0.8) worst = 'amber'
    }
    return worst
  }, [scopedBudgets, scopedExpenses, activeCurrency])

  async function handleSaveBudgets() {
    try {
      await Promise.all(
        CATEGORY_LIST.map((c) => {
          const raw = (budgetAmounts[c.id] ?? '').trim()
          const amount = Number(raw)
          const hasAmount = raw !== '' && amount > 0
          const existing = scopedBudgets.find((b) => b.category === c.id)

          if (hasAmount && !existing) {
            return addBudget({
              scope: isPersonal ? 'personal' : 'household',
              householdId: isPersonal ? undefined : activeHousehold?.id,
              ownerId: currentUser!.id,
              category: c.id,
              amount,
              currency: activeCurrency,
            })
          }
          if (hasAmount && existing) {
            return updateBudget(existing.id, { amount, currency: activeCurrency })
          }
          if (!hasAmount && existing) {
            return deleteBudget(existing.id)
          }
          return undefined
        }),
      )
      showSuccess('Presupuestos actualizados.')
    } catch (error) {
      showError(error)
      return
    }
    setBudgetsOpen(false)
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of scopedExpenses) {
      const k = monthKey(e.date)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return [...map.entries()]
  }, [scopedExpenses])

  // --- handlers ---
  async function handleAdd(data: Omit<Expense, 'id'>) {
    try {
      await addExpense(data)
      showSuccess('Gasto agregado.')
    } catch (error) {
      showError(error)
      return
    }
    setAdding(false)
    setEditing(undefined)
  }

  async function handleUpdate(data: Omit<Expense, 'id'>) {
    if (!editing) return
    try {
      await updateExpense(editing.id, data)
      showSuccess('Gasto actualizado.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(undefined)
  }

  async function handleDelete() {
    if (!editing) return
    try {
      await deleteExpense(editing.id)
      showSuccess('Gasto eliminado.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(undefined)
  }

  async function handleAddRecurring(data: Omit<RecurringExpense, 'id'>) {
    try {
      await addRecurringExpense(data)
      showSuccess('Gasto recurrente agregado.')
    } catch (error) {
      showError(error)
      return
    }
    setRecurringAdding(false)
    setRecurringEditing(undefined)
  }

  async function handleUpdateRecurring(data: Omit<RecurringExpense, 'id'>) {
    if (!recurringEditing) return
    try {
      await updateRecurringExpense(recurringEditing.id, data)
      showSuccess('Gasto recurrente actualizado.')
    } catch (error) {
      showError(error)
      return
    }
    setRecurringEditing(undefined)
  }

  async function handleDeleteRecurring() {
    if (!recurringEditing) return
    try {
      await deleteRecurringExpense(recurringEditing.id)
      showSuccess('Gasto recurrente eliminado.')
    } catch (error) {
      showError(error)
      return
    }
    setRecurringEditing(undefined)
  }

  function clearFilters() {
    setOpenCategory(null)
    setOpenPayer(null)
  }

  const hasFilters = openCategory !== null || openPayer !== null

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={isPersonal ? 'Mis gastos' : 'Gastos'}
        subtitle={
          isPersonal
            ? 'Lo que gastás vos'
            : activeHousehold
              ? activeHousehold.name
              : undefined
        }
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            aria-label="Agregar gasto"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      {/* --- filters --- */}
      <div className="flex items-center gap-2">
        <FilterTrigger
          onClick={() => setFiltersOpen(true)}
          activeCount={(openCategory ? 1 : 0) + (openPayer ? 1 : 0)}
        />

        {monthFilter && (
          <button
            onClick={openBudgets}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              budgetStatus === 'red'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : budgetStatus === 'amber'
                  ? 'border-warning/40 bg-warning/15 text-warning-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            <Wallet className="size-3.5" />
            Presupuestos
          </button>
        )}
      </div>

      {hasFilters && (
        <ActiveFilterPills
          pills={[
            ...(openCategory
              ? [
                  {
                    key: 'category',
                    label: CATEGORY_LIST.find((c) => c.id === openCategory)?.label ?? '',
                    onRemove: () => setOpenCategory(null),
                  },
                ]
              : []),
            ...(openPayer
              ? [
                  {
                    key: 'payer',
                    label:
                      openPayer === currentUser?.id
                        ? 'Yo'
                        : (householdMembers.find((m) => m!.id === openPayer)?.name.split(' ')[0] ?? ''),
                    onRemove: () => setOpenPayer(null),
                  },
                ]
              : []),
          ]}
          onClearAll={clearFilters}
        />
      )}

      {/* --- summary --- */}
      <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 ring-1 ring-border/50">
        <span className="text-sm text-muted-foreground">
          {scopedExpenses.length} gasto{scopedExpenses.length !== 1 && 's'}
          {hasFilters && ' filtrados'}
        </span>
        <div className="flex flex-col items-end gap-0.5">
          {Object.entries(totalsByCurrency).map(([currency, amount]) => (
            <Money
              key={currency}
              amount={amount}
              currency={currency as CurrencyCode}
              className="text-lg font-semibold tnum"
            />
          ))}
        </div>
      </div>

      {/* --- recurring --- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recurrentes
          </h2>
          <button
            onClick={() => setRecurringAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Plus className="size-3.5" />
            Agregar
          </button>
        </div>
        {scopedRecurring.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {scopedRecurring.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setRecurringEditing(r)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    !r.active && 'opacity-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={r.category} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{r.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Día {r.dayOfMonth} de cada mes
                        {!r.active && ' · Pausado'}
                      </p>
                    </div>
                  </div>
                  <Money amount={r.amount} currency={r.currency} className="text-sm font-semibold tnum" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-border/50">
            Sin gastos recurrentes todavía.
          </p>
        )}
      </section>

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

      {/* --- list --- */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(([key, items]) => (
            <section key={key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {monthLabel(key)}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {items.map((expense) => (
                  <li key={expense.id}>
                    <ExpenseRow
                      expense={expense}
                      baseCurrency={activeCurrency}
                      members={isPersonal ? 1 : householdMembers.length}
                      repayments={isPersonal ? undefined : repayments.filter((r) => r.householdId === activeHousehold?.id)}
                      onClick={() => setEditing(expense)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={hasFilters ? ListFilter : ReceiptText}
          title={hasFilters ? 'Sin resultados' : 'Todavía no hay gastos'}
          description={
            hasFilters
              ? 'Probá con otros filtros.'
              : isPersonal
                ? 'Registrá tu primer gasto personal tocando el botón +.'
                : 'Registren el primer gasto del hogar tocando el botón +.'
          }
          action={
            !hasFilters && (
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:translate-y-px"
              >
                <Plus className="size-4" />
                Agregar gasto
              </button>
            )
          }
        />
      )}

      {/* --- filters sheet --- */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        <div className="space-y-5">
          <FilterSection title="Categoría">
            {CATEGORY_LIST.map((c) => {
              const active = openCategory === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setOpenCategory(active ? null : c.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.label}
                </button>
              )
            })}
          </FilterSection>

          {householdMembers.length > 1 && (
            <FilterSection title="Pagador">
              {householdMembers.map((m) => {
                const active = openPayer === m!.id
                return (
                  <button
                    key={m!.id}
                    onClick={() => setOpenPayer(active ? null : m!.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                    )}
                  >
                    <PersonAvatar member={m!} size="xs" />
                    {m!.id === currentUser?.id ? 'Yo' : m!.name.split(' ')[0]}
                  </button>
                )
              })}
            </FilterSection>
          )}
        </div>
      </Sheet>

      {/* --- add sheet --- */}
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title={isPersonal ? 'Nuevo gasto personal' : 'Nuevo gasto'}
      >
        <ExpenseForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
      </Sheet>

      {/* --- edit sheet --- */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(undefined)}
        title="Editar gasto"
      >
        {editing && (
          <ExpenseForm
            key={editing.id}
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(undefined)}
            onDelete={handleDelete}
          />
        )}
      </Sheet>

      {/* --- recurring add sheet --- */}
      <Sheet
        open={recurringAdding}
        onClose={() => setRecurringAdding(false)}
        title={isPersonal ? 'Nuevo recurrente personal' : 'Nuevo recurrente'}
      >
        <RecurringExpenseForm onSubmit={handleAddRecurring} onCancel={() => setRecurringAdding(false)} />
      </Sheet>

      {/* --- recurring edit sheet --- */}
      <Sheet
        open={!!recurringEditing}
        onClose={() => setRecurringEditing(undefined)}
        title="Editar recurrente"
      >
        {recurringEditing && (
          <RecurringExpenseForm
            key={recurringEditing.id}
            initial={recurringEditing}
            onSubmit={handleUpdateRecurring}
            onCancel={() => setRecurringEditing(undefined)}
            onDelete={handleDeleteRecurring}
          />
        )}
      </Sheet>

      {/* --- budgets sheet --- */}
      <Sheet
        open={budgetsOpen}
        onClose={() => setBudgetsOpen(false)}
        title="Presupuestos"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Tope mensual por categoría, en {activeCurrency}. Dejá el monto vacío para no llevar tope en esa categoría.
          </p>

          <div className="space-y-3.5">
            {CATEGORY_LIST.map((c) => {
              const raw = budgetAmounts[c.id] ?? ''
              const amount = Number(raw)
              const hasAmount = raw.trim() !== '' && amount > 0
              const gastado = scopedExpenses
                .filter((e) => e.category === c.id && e.currency === activeCurrency)
                .reduce((s, e) => s + e.amount, 0)
              const pct = hasAmount ? (gastado / amount) * 100 : 0
              const over = hasAmount && pct >= 100
              const near = hasAmount && pct >= 80 && pct < 100

              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={c.id} size="sm" />
                    <span className="flex-1 text-sm font-medium">{c.label}</span>
                    <input
                      inputMode="decimal"
                      value={raw}
                      onChange={(e) =>
                        setBudgetAmounts((prev) => ({
                          ...prev,
                          [c.id]: e.target.value.replace(/[^0-9.]/g, ''),
                        }))
                      }
                      placeholder="Sin tope"
                      className="w-28 rounded-xl border border-border bg-card px-3 py-2 text-right text-sm tnum outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-ring focus:ring-4 focus:ring-ring/15"
                    />
                  </div>
                  {hasAmount && (
                    <div className="flex items-center gap-2 pl-8">
                      <ProgressBar
                        value={pct}
                        height="h-1.5"
                        color={over ? 'var(--destructive)' : near ? 'var(--warning)' : 'var(--primary)'}
                        className="flex-1"
                      />
                      {over && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-destructive">
                          Superado
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleSaveBudgets}
            disabled={busy}
            className="w-full rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Guardando...
              </span>
            ) : 'Guardar'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
