'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Field, inputClass } from '@/components/field'
import { CurrencySelect } from '@/components/currency-select'
import type { CurrencyCode, Goal } from '@/lib/types'

export function GoalForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Omit<Goal, 'id' | 'contributions'>) => void
  onCancel?: () => void
}) {
  const { isPersonal, activeHousehold, currentUser, activeCurrency } = useApp()

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(activeCurrency)
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(target)
    if (!name.trim()) return setError('Poné un nombre')
    if (!value || value <= 0) return setError('Ingresá una meta válida')
    setError('')

    onSubmit({
      scope: isPersonal ? 'personal' : 'household',
      householdId: isPersonal ? undefined : activeHousehold?.id,
      ownerId: isPersonal ? currentUser?.id : undefined,
      name: name.trim(),
      target: value,
      currency,
      deadline: deadline || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Nombre del objetivo" htmlFor="goal-name">
        <input
          id="goal-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          placeholder="Ej: Vacaciones a Brasil"
          className={inputClass}
          autoFocus
        />
      </Field>

      <Field label="Meta" htmlFor="goal-target">
        <input
          id="goal-target"
          inputMode="decimal"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value.replace(/[^0-9.]/g, ''))
            setError('')
          }}
          placeholder="0"
          className={inputClass}
        />
      </Field>

      <Field label="Moneda">
        <CurrencySelect value={currency} onChange={setCurrency} />
      </Field>

      <Field label="Fecha límite (opcional)" htmlFor="goal-deadline">
        <input
          id="goal-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={inputClass}
        />
      </Field>

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
          Crear objetivo
        </button>
      </div>
    </form>
  )
}
