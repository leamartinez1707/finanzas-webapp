import type { Task } from './types'
import { todayLocalISO } from './format'

// Same scope-filtering criterion used by every other entity in this app.
export function scopedTasks(
  tasks: Task[],
  filter: { scope: 'personal'; ownerId: string } | { scope: 'household'; householdId: string },
): Task[] {
  return filter.scope === 'personal'
    ? tasks.filter((t) => t.scope === 'personal' && t.ownerId === filter.ownerId)
    : tasks.filter((t) => t.scope === 'household' && t.householdId === filter.householdId)
}

// "Mis tareas": asignadas a mí, sin importar quién las creó.
export function myTasks(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.assigneeId === userId)
}

// Pendientes primero (con hora antes que sin hora), completadas al fondo —
// nunca desaparecen, solo bajan de posición dentro de su día.
function sortWithinDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
    if (a.dueTime) return -1
    if (b.dueTime) return 1
    return 0
  })
}

export interface TaskDayGroup {
  dateKey: string // 'YYYY-MM-DD'
  tasks: Task[]
}

export interface GroupedTasks {
  overdue: Task[] // pendientes con fecha ya pasada, sin agrupar por día — es una sola lista de "hay que ponerse al día"
  today: Task[]
  upcoming: TaskDayGroup[] // agrupadas por día, ordenadas de más cercano a más lejano
}

// Cuántas tareas "urgentes" (asignadas a mí, del contexto activo, hoy o
// atrasadas y sin completar) mostrar como numerito de notificación en el
// nav — nunca cuenta futuras, ni tareas de otro contexto (personal vs. un
// household puntual), ni las de otros miembros.
export function urgentPendingCount(
  tasks: Task[],
  filter: { scope: 'personal'; ownerId: string } | { scope: 'household'; householdId: string },
  userId: string,
): number {
  const mine = myTasks(scopedTasks(tasks, filter), userId)
  const { overdue, today } = groupTasksByDay(mine)
  return overdue.length + today.filter((t) => !t.completed).length
}

// Agrupa por fecha límite: atrasadas (pendientes, fecha < hoy — quedan
// visibles arriba de todo para que no se pierdan), hoy, y futuras por día.
export function groupTasksByDay(tasks: Task[]): GroupedTasks {
  const todayKey = todayLocalISO()

  const overdue = sortWithinDay(
    tasks.filter((t) => !t.completed && t.dueDate < todayKey),
  )

  const today = sortWithinDay(tasks.filter((t) => t.dueDate === todayKey))

  const upcomingByDate = new Map<string, Task[]>()
  for (const t of tasks) {
    if (t.dueDate <= todayKey) continue
    if (!upcomingByDate.has(t.dueDate)) upcomingByDate.set(t.dueDate, [])
    upcomingByDate.get(t.dueDate)!.push(t)
  }
  const upcoming = [...upcomingByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayTasks]) => ({ dateKey, tasks: sortWithinDay(dayTasks) }))

  return { overdue, today, upcoming }
}
