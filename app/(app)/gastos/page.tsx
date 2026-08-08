'use client'

import { useMemo, useState } from 'react'
import { Plus, ListFilter, X, ReceiptText } from 'lucide-react'
import { useApp } from '@/lib/store'
import { CATEGORY_LIST } from '@/lib/categories'
import { ScreenHeader } from '@/components/screen-header'
import { ExpenseRow } from '@/components/expense-row'
import { ExpenseForm } from '@/components/expense-form'
import { EmptyState } from '@/components/empty-state'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { Sheet } from '@/components/sheet'
import { monthKey, monthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CategoryId, Expense } from '@/lib/types'

export default function GastosPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    members,
    expenses,
    addExpense,
    updateExpense,
  } = useApp()

  // --- filters ---
  const [openCategory, setOpenCategory] = useState<CategoryId | null>(null)
  const [openPayer, setOpenPayer] = useState<string | null>(null)

  // --- add / edit sheet ---
  const [editing, setEditing] = useState<Expense | undefined>(undefined)
  const [adding, setAdding] = useState(false)

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
      : expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold!.id)

    if (openCategory) list = list.filter((e) => e.category === openCategory)
    if (openPayer) list = list.filter((e) => e.payerId === openPayer)

    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, isPersonal, currentUser?.id, activeHousehold, openCategory, openPayer])

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
  function handleAdd(data: Omit<Expense, 'id'>) {
    addExpense(data)
    setAdding(false)
    setEditing(undefined)
  }

  function handleUpdate(data: Omit<Expense, 'id'>) {
    if (!editing) return
    updateExpense(editing.id, data)
    setEditing(undefined)
  }

  function clearFilters() {
    setOpenCategory(null)
    setOpenPayer(null)
  }

  const hasFilters = openCategory !== null || openPayer !== null

  return (
    <div className="space-y-5">
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* category filter */}
        <div className="flex gap-1.5">
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
        </div>

        {/* payer filter (household only) */}
        {householdMembers.length > 1 && (
          <div className="flex gap-1.5 border-l border-border pl-2">
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

      {/* --- summary --- */}
      <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border/50">
        <span className="text-sm text-muted-foreground">
          {scopedExpenses.length} gasto{scopedExpenses.length !== 1 && 's'}
          {hasFilters && ' filtrados'}
        </span>
        <Money
          amount={scopedExpenses.reduce((s, e) => s + e.amount, 0)}
          currency={activeCurrency}
          className="text-lg font-semibold tnum"
        />
      </div>

      {/* --- list --- */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
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
          />
        )}
      </Sheet>
    </div>
  )
}
