'use client'

import { useMemo, useState } from 'react'
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Check, Plus, ListChecks } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader, SectionTitle } from '@/components/screen-header'
import { TaskRow } from '@/components/task-row'
import { TaskForm } from '@/components/task-form'
import { EmptyState } from '@/components/empty-state'
import { PersonAvatar } from '@/components/person-avatar'
import { Sheet } from '@/components/sheet'
import { inputClass } from '@/components/field'
import { formatDate, formatRelative, isThisMonth, toLocalDateOnly } from '@/lib/format'
import { scopedTasks, myTasks, groupTasksByDay } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

type HistoryPeriod = 'month' | 'all'

export default function TareasPage() {
  const {
    isPersonal,
    activeHousehold,
    currentUser,
    members,
    getMember,
    loading,
    tasks,
    addTask,
    updateTask,
    deleteTask,
  } = useApp()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>(undefined)
  const [onlyMine, setOnlyMine] = useState(false)

  // --- historial: dropdown de período + orden cronológico + filtro por persona ---
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('month')
  const [sortAsc, setSortAsc] = useState(false) // false = más recientes primero
  const [personFilter, setPersonFilter] = useState<string>('all')

  const householdMembers = useMemo(() => {
    if (isPersonal || !activeHousehold) return []
    return activeHousehold.memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [isPersonal, activeHousehold, members])

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

  const historyTasks = useMemo(() => {
    let list = scoped.filter((t) => t.completed && t.completedAt)
    if (historyPeriod === 'month') list = list.filter((t) => isThisMonth(t.completedAt!))
    if (personFilter !== 'all') list = list.filter((t) => t.completedById === personFilter)
    return [...list].sort((a, b) => {
      const diff = new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
      return sortAsc ? diff : -diff
    })
  }, [scoped, historyPeriod, personFilter, sortAsc])

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
    if (!currentUser) return
    try {
      await updateTask(
        task.id,
        task.completed
          ? { completed: false, completedById: undefined, completedAt: undefined }
          : { completed: true, completedById: currentUser.id, completedAt: new Date().toISOString() },
      )
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

      {/* --- historial --- */}
      <section>
        <SectionTitle>Historial</SectionTitle>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={historyPeriod}
            onChange={(e) => setHistoryPeriod(e.target.value as HistoryPeriod)}
            className={cn(inputClass, 'w-auto shrink-0 py-2 text-sm')}
            aria-label="Período del historial"
          >
            <option value="month">Completadas del mes</option>
            <option value="all">Todo el historial</option>
          </select>

          {!isPersonal && householdMembers.length > 1 && (
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className={cn(inputClass, 'w-auto shrink-0 py-2 text-sm')}
              aria-label="Filtrar por persona"
            >
              <option value="all">Todos</option>
              {householdMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUser?.id ? 'Yo' : m.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setSortAsc((prev) => !prev)}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {sortAsc ? <ArrowUpNarrowWide className="size-3.5" /> : <ArrowDownNarrowWide className="size-3.5" />}
            {sortAsc ? 'Más antiguas primero' : 'Más recientes primero'}
          </button>
        </div>

        {historyTasks.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {historyTasks.map((task) => {
              const completedBy = task.completedById ? getMember(task.completedById) : undefined
              const dateOnly = toLocalDateOnly(new Date(task.completedAt!))
              return (
                <li key={task.id} className="flex items-center gap-2.5 rounded-xl bg-card p-2.5">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{task.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {completedBy ? `Completada por ${completedBy.name}` : 'Completada'}
                      {' · '}
                      {formatRelative(dateOnly, task.completedAt)}
                    </p>
                  </div>
                  {completedBy && <PersonAvatar member={completedBy} size="xs" />}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-border/50">
            {historyPeriod === 'month' ? 'Todavía no completaron tareas este mes.' : 'Todavía no hay tareas completadas.'}
          </p>
        )}
      </section>

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
