'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Field, inputClass } from '@/components/field'
import { CurrencySelect } from '@/components/currency-select'
import type { CurrencyCode, Goal } from '@/lib/types'

export function GoalForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Goal
  onSubmit: (data: Omit<Goal, 'id' | 'contributions'>) => void | Promise<void>
  onCancel?: () => void
}) {
  const { isPersonal, activeHousehold, currentUser, activeCurrency, busy } = useApp()

  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? activeCurrency)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [error, setError] = useState('')

  const currencyLocked = !!initial && initial.contributions.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(target)
    if (!name.trim()) return setError('Poné un nombre')
    if (!value || value <= 0) return setError('Ingresá una meta válida')
    setError('')

    onSubmit({
      scope: isPersonal ? 'personal' : 'household',
      householdId: isPersonal ? undefined : activeHousehold?.id,
      ownerId: currentUser?.id,
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
        <CurrencySelect value={currency} onChange={setCurrency} disabled={currencyLocked} />
        {currencyLocked && (
          <p className="mt-2 text-xs text-muted-foreground">
            No podés cambiar la moneda de un objetivo que ya tiene aportes.
          </p>
        )}
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
              {initial ? 'Guardando...' : 'Creando...'}
            </span>
          ) : initial ? 'Guardar cambios' : 'Crear objetivo'}
        </button>
      </div>
    </form>
  )
}
