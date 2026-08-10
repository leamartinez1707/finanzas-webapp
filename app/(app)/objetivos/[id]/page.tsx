'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, CalendarDays, House, User, Pencil, Trash2, X } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'
import { goalSaved } from '@/components/goal-card'
import { GoalForm } from '../goal-form'
import { formatDate } from '@/lib/format'

export default function GoalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { goals, members, getMember, activeCurrency, addContribution, deleteContribution, updateGoal, deleteGoal, currentUser } = useApp()

  const goal = useMemo(() => goals.find((g) => g.id === params.id), [goals, params.id])

  const [contributing, setContributing] = useState(false)
  const [contribAmount, setContribAmount] = useState('')
  const [contribError, setContribError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!goal) {
    return (
      <div className="space-y-4">
        <ScreenHeader title="Objetivo no encontrado" back />
        <p className="text-sm text-muted-foreground">Este objetivo ya no existe o fue eliminado.</p>
      </div>
    )
  }

  const saved = goalSaved(goal)
  const pct = goal.target > 0 ? Math.min(100, Math.round((saved / goal.target) * 100)) : 0
  const done = pct >= 100

  const sortedContributions = [...goal.contributions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(contribAmount)
    if (!value || value <= 0) return setContribError('Ingresá un monto válido')
    addContribution(goal!.id, currentUser!.id, value)
    setContributing(false)
    setContribAmount('')
    setContribError('')
  }

  function handleUpdate(data: Omit<Goal, 'id' | 'contributions'>) {
    updateGoal(goal!.id, data)
    setEditing(false)
  }

  function handleDelete() {
    deleteGoal(goal!.id)
    router.push('/objetivos')
  }

  function handleDeleteContribution(id: string) {
    deleteContribution(id)
  }

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={goal.name}
        back
        action={
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Editar objetivo"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
              aria-label="Eliminar objetivo"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        }
      />

      {/* --- big progress --- */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 size-24">
          <svg viewBox="0 0 96 96" className="size-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke={done ? 'var(--positive)' : 'var(--primary)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 264} 264`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="relative -mt-[72px] text-center">
            <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          </div>
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <Money amount={saved} currency={goal.currency} className="text-3xl font-bold" />
          <span className="text-sm text-muted-foreground">
            de <Money amount={goal.target} currency={goal.currency} className="tnum" />
          </span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {goal.scope === 'household' ? <House className="size-3" /> : <User className="size-3" />}
            {goal.scope === 'household' ? 'Objetivo del hogar' : 'Objetivo personal'}
          </span>
          {goal.deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {formatDate(goal.deadline)}
            </span>
          )}
        </div>

        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${
            done ? 'bg-positive/15 text-positive' : 'bg-primary/15 text-primary'
          }`}
        >
          {done ? '¡Cumplido! 🎉' : 'En progreso'}
        </span>
      </div>

      {/* --- contribute button --- */}
      {!done && (
        <button
          onClick={() => setContributing(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-transform active:translate-y-px"
        >
          <Plus className="size-5" />
          Aportar
        </button>
      )}

      {/* --- contributions history --- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Historial de aportes
        </h2>
        {sortedContributions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sortedContributions.map((c) => {
              const member = getMember(c.memberId)
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  {member && <PersonAvatar member={member} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {member?.name ?? 'Desconocido'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>
                  </div>
                  <Money amount={c.amount} currency={goal.currency} className="text-base font-semibold text-positive" sign />
                  {c.memberId === currentUser?.id && (
                    <button
                      onClick={() => handleDeleteContribution(c.id)}
                      className="ml-1 shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar aporte"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay aportes.</p>
        )}
      </section>

      {/* --- contribute sheet --- */}
      <Sheet
        open={contributing}
        onClose={() => setContributing(false)}
        title={`Aportar a ${goal.name}`}
      >
        <form onSubmit={handleContribute} className="space-y-4">
          <Field label="Monto del aporte" htmlFor="contrib-amount">
            <input
              id="contrib-amount"
              inputMode="decimal"
              value={contribAmount}
              onChange={(e) => {
                setContribAmount(e.target.value.replace(/[^0-9.]/g, ''))
                setContribError('')
              }}
              placeholder="0"
              className={inputClass}
              autoFocus
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Moneda: {goal.currency} · Faltan{' '}
            <Money amount={goal.target - saved} currency={goal.currency} className="tnum text-sm font-medium" />
          </p>
          {contribError && <p className="text-sm font-medium text-destructive">{contribError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setContributing(false)}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-transform active:translate-y-px"
            >
              Aportar
            </button>
          </div>
        </form>
      </Sheet>

      {/* --- edit sheet --- */}
      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar objetivo"
      >
        <GoalForm
          initial={goal}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </Sheet>

      {/* --- delete confirmation --- */}
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar objetivo"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que querés eliminar <strong>{goal.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 rounded-2xl bg-destructive py-3.5 font-semibold text-destructive-foreground transition-transform active:translate-y-px"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
