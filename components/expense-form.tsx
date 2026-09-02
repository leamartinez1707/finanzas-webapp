'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { CATEGORY_LIST } from '@/lib/categories'
import { Field, inputClass } from '@/components/field'
import { CategoryIcon } from '@/components/category-icon'
import { PersonAvatar } from '@/components/person-avatar'
import { CurrencySelect } from '@/components/currency-select'
import { todayLocalISO } from '@/lib/format'
import type { CategoryId, CurrencyCode, Expense } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ExpenseForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: Expense
  onSubmit: (data: Omit<Expense, 'id'>) => void | Promise<void>
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { isPersonal, activeHousehold, activeCurrency, currentUser, members, busy } = useApp()

  const householdMembers = activeHousehold
    ? activeHousehold.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
    : []

  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'super')
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? activeCurrency)
  const [payerId, setPayerId] = useState(initial?.payerId ?? currentUser?.id ?? '')
  const [date, setDate] = useState(initial?.date ?? todayLocalISO())
  const [error, setError] = useState('')

  // customSplit only ever starts true for a real manual override — never for
  // an expense that's just using the household's frozen splitSnapshot.
  const [customSplit, setCustomSplit] = useState(Boolean(initial?.shares?.length))
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    initial?.shares?.forEach((s) => { map[s.memberId] = String(s.amount) })
    return map
  })

  const canCustomSplit = !isPersonal && householdMembers.length > 1
  const shareSum = householdMembers.reduce((s, m) => s + (Number(shareAmounts[m.id]) || 0), 0)
  const totalAmount = Number(amount) || 0
  const shareDiff = Math.round((totalAmount - shareSum) * 100) / 100

  function toggleCustomSplit(next: boolean) {
    setCustomSplit(next)
    setError('')
    if (next && Object.keys(shareAmounts).length === 0) {
      // Prefill with an even split of the amount entered so far, so the
      // user tweaks from a sane starting point instead of blank inputs.
      const even = householdMembers.length > 0 ? Math.round(totalAmount / householdMembers.length) : 0
      const map: Record<string, string> = {}
      householdMembers.forEach((m) => { map[m.id] = String(even) })
      setShareAmounts(map)
    }
  }

  // "Freeze at creation, preserve on edit" — a NEW expense takes the
  // household's CURRENT default_split and freezes it in as splitSnapshot;
  // an EXISTING expense keeps exactly whatever it already had, no matter
  // what the household's config has changed to since. Nothing here ever
  // re-reads the household's config for an existing expense.
  const effectiveSnapshot = !initial
    ? (!isPersonal && activeHousehold?.defaultSplit?.length === householdMembers.length
        ? activeHousehold.defaultSplit
        : null)
    : (initial.splitSnapshot ?? null)

  function buildSplitFields() {
    if (customSplit) {
      return {
        shares: householdMembers.map((m) => ({ memberId: m.id, amount: Number(shareAmounts[m.id] || 0) })),
        splitSnapshot: null,
      }
    }
    return { shares: null, splitSnapshot: effectiveSnapshot }
  }

  function splitHintText() {
    if (!effectiveSnapshot) {
      return `El gasto se divide en partes iguales entre ${householdMembers.length} personas.`
    }
    const parts = effectiveSnapshot.map((s) => {
      const name = s.memberId === currentUser?.id
        ? 'Yo'
        : householdMembers.find((m) => m.id === s.memberId)?.name.split(' ')[0] ?? '?'
      return `${name} ${s.percent}%`
    })
    return `Según la división del hogar: ${parts.join(' · ')}.`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!description.trim()) return setError('Poné una descripción')
    if (!value || value <= 0) return setError('Ingresá un monto válido')
    if (customSplit && Math.abs(shareDiff) > 0.01) return setError('Las partes deben sumar el monto total')

    onSubmit({
      scope: isPersonal ? 'personal' : 'household',
      householdId: isPersonal ? undefined : activeHousehold?.id,
      ownerId: currentUser!.id,
      payerId: isPersonal ? currentUser!.id : payerId,
      description: description.trim(),
      category,
      amount: value,
      currency,
      date,
      ...buildSplitFields(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-3xl bg-muted/60 p-5 text-center">
        <label htmlFor="amount" className="text-xs font-medium text-muted-foreground">
          Monto
        </label>
        <div className="mt-1 flex items-center justify-center gap-2">
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.]/g, ''))
              setError('')
            }}
            placeholder="0"
            className="w-full max-w-[220px] bg-transparent text-center font-display text-5xl font-semibold tracking-tight tnum outline-none placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="mt-3 flex justify-center">
          <CurrencySelect value={currency} onChange={setCurrency} compact />
        </div>
      </div>

      <Field label="Descripción" htmlFor="description">
        <input
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setError('')
          }}
          placeholder="Ej: Súper de la semana"
          className={inputClass}
        />
      </Field>

      <Field label="Fecha" htmlFor="expense-date">
        <input
          id="expense-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">Categoría</p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORY_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-colors',
                category === c.id
                  ? 'border-primary bg-primary/8'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <CategoryIcon category={c.id} size="sm" />
              <span className="text-xs font-medium">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!isPersonal && householdMembers.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">¿Quién pagó?</p>
          <div className="flex flex-wrap gap-2">
            {householdMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPayerId(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors',
                  payerId === m.id
                    ? 'border-primary bg-primary/8'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <PersonAvatar member={m} size="sm" />
                <span className="text-sm font-medium">
                  {m.id === currentUser?.id ? 'Yo' : m.name}
                </span>
              </button>
            ))}
          </div>
          {canCustomSplit ? (
            <>
              <button
                type="button"
                onClick={() => toggleCustomSplit(!customSplit)}
                className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="text-sm font-medium">División personalizada para este gasto</span>
                <span
                  className={cn(
                    'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors',
                    customSplit ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block size-4 transform rounded-full bg-white transition-transform',
                      customSplit ? 'translate-x-5' : 'translate-x-1',
                    )}
                  />
                </span>
              </button>

              {!customSplit && (
                <p className="mt-2 text-xs text-muted-foreground">{splitHintText()}</p>
              )}

              {customSplit && (
                <div className="mt-2 space-y-2 rounded-2xl border border-border p-3">
                  {householdMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <PersonAvatar member={m} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {m.id === currentUser?.id ? 'Yo' : m.name}
                      </span>
                      <input
                        inputMode="decimal"
                        value={shareAmounts[m.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          setShareAmounts((prev) => ({ ...prev, [m.id]: value }))
                          setError('')
                        }}
                        className={cn(inputClass, 'w-24 text-right tnum')}
                      />
                    </div>
                  ))}
                  <p className={cn(
                    'text-xs font-medium',
                    Math.abs(shareDiff) < 0.01
                      ? 'text-positive'
                      : 'text-destructive',
                  )}>
                    {Math.abs(shareDiff) < 0.01
                      ? '✓ Coincide'
                      : shareDiff > 0
                        ? `Restan ${shareDiff}`
                        : `Sobran ${Math.abs(shareDiff)}`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              El gasto se divide en partes iguales entre {householdMembers.length} personas.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {initial ? 'Guardando...' : 'Agregando...'}
            </span>
          ) : initial ? 'Guardar cambios' : 'Agregar gasto'}
        </button>
      </div>

      {initial && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3 font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Eliminando...
            </>
          ) : (
            <>
              <Trash2 className="size-4" />
              Eliminar gasto
            </>
          )}
        </button>
      )}
    </form>
  )
}
