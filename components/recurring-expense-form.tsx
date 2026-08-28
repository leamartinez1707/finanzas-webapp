'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { CATEGORY_LIST } from '@/lib/categories'
import { Field, inputClass } from '@/components/field'
import { CategoryIcon } from '@/components/category-icon'
import { PersonAvatar } from '@/components/person-avatar'
import { CurrencySelect } from '@/components/currency-select'
import type { CategoryId, CurrencyCode, RecurringExpense } from '@/lib/types'
import { cn } from '@/lib/utils'

export function RecurringExpenseForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: RecurringExpense
  onSubmit: (data: Omit<RecurringExpense, 'id'>) => void | Promise<void>
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { isPersonal, activeHousehold, activeCurrency, currentUser, members } = useApp()

  const householdMembers = activeHousehold
    ? activeHousehold.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
    : []

  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'super')
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? activeCurrency)
  const [payerId, setPayerId] = useState(initial?.payerId ?? currentUser?.id ?? '')
  const [dayOfMonth, setDayOfMonth] = useState(initial ? String(initial.dayOfMonth) : '1')
  const [active, setActive] = useState(initial?.active ?? true)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    const day = Number(dayOfMonth)
    if (!description.trim()) return setError('Poné una descripción')
    if (!value || value <= 0) return setError('Ingresá un monto válido')
    if (!day || day < 1 || day > 28) return setError('El día del mes debe ser entre 1 y 28')

    onSubmit({
      scope: isPersonal ? 'personal' : 'household',
      householdId: isPersonal ? undefined : activeHousehold?.id,
      ownerId: initial?.ownerId ?? currentUser!.id,
      payerId: isPersonal ? currentUser!.id : payerId,
      description: description.trim(),
      category,
      amount: value,
      currency,
      dayOfMonth: day,
      active,
      createdById: initial?.createdById ?? currentUser!.id,
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
          placeholder="Ej: Alquiler"
          className={inputClass}
        />
      </Field>

      <Field label="Día del mes" htmlFor="dayOfMonth" hint="Entre 1 y 28.">
        <input
          id="dayOfMonth"
          type="number"
          min={1}
          max={28}
          inputMode="numeric"
          value={dayOfMonth}
          onChange={(e) => {
            setDayOfMonth(e.target.value.replace(/[^0-9]/g, ''))
            setError('')
          }}
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
          <p className="mb-2 text-sm font-medium">¿Quién paga?</p>
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
          <p className="mt-2 text-xs text-muted-foreground">
            Cada gasto generado se divide en partes iguales entre {householdMembers.length} personas.
          </p>
        </div>
      )}

      {initial && (
        <button
          type="button"
          onClick={() => setActive((a) => !a)}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition-colors',
            active ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted/50',
          )}
        >
          <span className="text-sm font-medium">Activo</span>
          <span
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              active ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                active ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </span>
        </button>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-transform active:translate-y-px"
        >
          {initial ? 'Guardar cambios' : 'Crear recurrente'}
        </button>
      </div>

      {initial && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3 font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          Eliminar recurrente
        </button>
      )}
    </form>
  )
}
