'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Field, inputClass } from '@/components/field'
import { PersonAvatar } from '@/components/person-avatar'
import { todayLocalISO } from '@/lib/format'
import type { Task } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TaskForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: Task
  onSubmit: (data: Omit<Task, 'id' | 'createdById'>) => void | Promise<void>
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { isPersonal, activeHousehold, currentUser, members, busy } = useApp()

  const householdMembers = activeHousehold
    ? activeHousehold.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
    : []

  const [description, setDescription] = useState(initial?.description ?? '')
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? currentUser?.id ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayLocalISO())
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? '')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return setError('Poné una descripción')
    if (!dueDate) return setError('Elegí una fecha')

    onSubmit({
      scope: isPersonal ? 'personal' : 'household',
      householdId: isPersonal ? undefined : activeHousehold?.id,
      ownerId: initial?.ownerId ?? currentUser!.id,
      assigneeId: isPersonal ? currentUser!.id : assigneeId,
      description: description.trim(),
      dueDate,
      dueTime: dueTime || undefined,
      completed: initial?.completed ?? false,
      createdAt: initial?.createdAt,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Descripción" htmlFor="task-description">
        <input
          id="task-description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setError('')
          }}
          placeholder="Ej: Sacar la basura"
          className={inputClass}
          autoFocus
        />
      </Field>

      <Field label="Fecha límite" htmlFor="task-due-date">
        <input
          id="task-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value)
            setError('')
          }}
          className={inputClass}
        />
      </Field>

      <Field label="Hora (opcional)" htmlFor="task-due-time">
        <input
          id="task-due-time"
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          className={inputClass}
        />
      </Field>

      {!isPersonal && householdMembers.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">¿Quién lo tiene que hacer?</p>
          <div className="flex flex-wrap gap-2">
            {householdMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAssigneeId(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors',
                  assigneeId === m.id
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
              {initial ? 'Guardando...' : 'Creando...'}
            </span>
          ) : initial ? 'Guardar cambios' : 'Crear tarea'}
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
              Eliminar tarea
            </>
          )}
        </button>
      )}
    </form>
  )
}
