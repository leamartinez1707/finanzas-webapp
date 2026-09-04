'use client'

import { useMemo, useState } from 'react'
import { Plus, ListChecks } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader, SectionTitle } from '@/components/screen-header'
import { TaskRow } from '@/components/task-row'
import { TaskForm } from '@/components/task-form'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { formatDate } from '@/lib/format'
import { scopedTasks, myTasks, groupTasksByDay } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function TareasPage() {
  const {
    isPersonal,
    activeHousehold,
    currentUser,
    loading,
    tasks,
    addTask,
    updateTask,
    deleteTask,
  } = useApp()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>(undefined)
  const [onlyMine, setOnlyMine] = useState(false)

  const scoped = useMemo(() => {
    const filter = isPersonal
      ? ({ scope: 'personal', ownerId: currentUser?.id ?? '' } as const)
      : ({ scope: 'household', householdId: activeHousehold?.id ?? '' } as const)
    return scopedTasks(tasks, filter)
  }, [tasks, isPersonal, currentUser?.id, activeHousehold?.id])

  const visible = useMemo(() => {
    if (isPersonal || !onlyMine || !currentUser) return scoped
    return myTasks(scoped, currentUser.id)
  }, [scoped, isPersonal, onlyMine, currentUser])

  const { overdue, today, upcoming } = useMemo(() => groupTasksByDay(visible), [visible])

  const hasAnyTasks = scoped.length > 0

  async function handleCreate(data: Omit<Task, 'id' | 'createdById'>) {
    try {
      await addTask(data)
      showSuccess('Tarea creada.')
    } catch (error) {
      showError(error)
      return
    }
    setAdding(false)
  }

  async function handleUpdate(data: Omit<Task, 'id' | 'createdById'>) {
    if (!editing) return
    try {
      await updateTask(editing.id, data)
      showSuccess('Tarea actualizada.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(undefined)
  }

  async function handleDelete() {
    if (!editing) return
    try {
      await deleteTask(editing.id)
      showSuccess('Tarea eliminada.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(undefined)
  }

  async function toggle(task: Task) {
    try {
      await updateTask(task.id, { completed: !task.completed })
    } catch (error) {
      showError(error)
    }
  }

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={isPersonal ? 'Mis tareas' : 'Tareas'}
        subtitle={
          isPersonal
            ? 'Organizá tus días'
            : activeHousehold
              ? activeHousehold.name
              : undefined
        }
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            aria-label="Crear tarea"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      {!isPersonal && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          <button
            onClick={() => setOnlyMine(true)}
            className={cn(
              'rounded-xl py-2 text-sm font-medium transition-colors',
              onlyMine ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
          >
            Mis tareas
          </button>
          <button
            onClick={() => setOnlyMine(false)}
            className={cn(
              'rounded-xl py-2 text-sm font-medium transition-colors',
              !onlyMine ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
          >
            Todas
          </button>
        </div>
      )}

      {hasAnyTasks ? (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <section>
              <SectionTitle className="text-destructive">Atrasadas</SectionTitle>
              <ul className="flex flex-col gap-1.5">
                {overdue.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onEdit={() => setEditing(t)} />
                ))}
              </ul>
            </section>
          )}

          {today.length > 0 && (
            <section>
              <SectionTitle>Hoy</SectionTitle>
              <ul className="flex flex-col gap-1.5">
                {today.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onEdit={() => setEditing(t)} />
                ))}
              </ul>
            </section>
          )}

          {upcoming.map((group) => (
            <section key={group.dateKey}>
              <SectionTitle>{formatDate(group.dateKey)}</SectionTitle>
              <ul className="flex flex-col gap-1.5">
                {group.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onEdit={() => setEditing(t)} />
                ))}
              </ul>
            </section>
          ))}

          {overdue.length === 0 && today.length === 0 && upcoming.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tenés tareas asignadas por ahora.
            </p>
          )}
        </div>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Todavía no hay tareas"
          description={
            isPersonal
              ? 'Cargá lo que tenés que hacer para organizarte los días.'
              : 'Repartan las tareas de la casa entre todos.'
          }
          action={
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              Crear tarea
            </button>
          }
        />
      )}

      {/* --- add sheet --- */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Nueva tarea">
        <TaskForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />
      </Sheet>

      {/* --- edit sheet --- */}
      <Sheet open={!!editing} onClose={() => setEditing(undefined)} title="Editar tarea">
        {editing && (
          <TaskForm
            key={editing.id}
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(undefined)}
            onDelete={handleDelete}
          />
        )}
      </Sheet>
    </div>
  )
}
