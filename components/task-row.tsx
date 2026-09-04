'use client'

import { Check } from 'lucide-react'
import { useApp } from '@/lib/store'
import { PersonAvatar } from '@/components/person-avatar'
import type { Task } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TaskRow({
  task,
  onToggle,
  onEdit,
}: {
  task: Task
  onToggle: () => void
  onEdit: () => void
}) {
  const { getMember } = useApp()
  const assignee = getMember(task.assigneeId)

  return (
    <li
      className={cn(
        'flex items-center gap-2.5 rounded-xl bg-card p-2.5 transition-opacity',
        task.completed && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={task.completed}
        aria-label={task.completed ? 'Marcar como pendiente' : 'Marcar como hecha'}
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          task.completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border text-transparent hover:border-primary/50',
        )}
      >
        <Check className="size-4.5" strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate font-medium',
              task.completed && 'text-muted-foreground line-through',
            )}
          >
            {task.description}
          </p>
          {task.dueTime && (
            <p className="truncate text-xs text-muted-foreground">{task.dueTime}</p>
          )}
        </div>
        {task.scope === 'household' && assignee && (
          <PersonAvatar member={assignee} size="xs" />
        )}
      </button>
    </li>
  )
}
