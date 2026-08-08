import { cn } from '@/lib/utils'

export function ProgressBar({
  value,
  className,
  color = 'var(--primary)',
  height = 'h-2.5',
}: {
  value: number // 0-100
  className?: string
  color?: string
  height?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-muted', height, className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

// Stacked segments colored per person (for combined savings / contributions)
export function SegmentedBar({
  segments,
  height = 'h-2.5',
}: {
  segments: { value: number; color: string; label?: string }[]
  height?: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  return (
    <div className={cn('flex w-full overflow-hidden rounded-full bg-muted', height)}>
      {segments.map((seg, i) => (
        <div
          key={i}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
          title={seg.label}
        />
      ))}
    </div>
  )
}
