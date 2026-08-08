import { cn } from '@/lib/utils'

export function Logo({
  className,
  showText = true,
  size = 'md',
}: {
  className?: string
  showText?: boolean
  size?: 'md' | 'lg'
}) {
  const box = size === 'lg' ? 'size-11' : 'size-9'
  const text = size === 'lg' ? 'text-2xl' : 'text-xl'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative inline-flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm',
          box,
        )}
        aria-hidden
      >
        {/* nest / nido mark */}
        <svg viewBox="0 0 24 24" className="size-1/2" fill="none">
          <path
            d="M3 14c0-1.5 4-3 9-3s9 1.5 9 3-4 4-9 4-9-2.5-9-4Z"
            fill="currentColor"
            opacity="0.35"
          />
          <circle cx="9.5" cy="10" r="2.2" fill="currentColor" />
          <circle cx="14.5" cy="10" r="2.2" fill="currentColor" />
        </svg>
      </span>
      {showText && (
        <span className={cn('font-display font-bold tracking-tight', text)}>Nido</span>
      )}
    </span>
  )
}
