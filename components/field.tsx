import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/15'

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
