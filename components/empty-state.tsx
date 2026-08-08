import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-6" strokeWidth={2} />
      </span>
      <h3 className="text-balance text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
