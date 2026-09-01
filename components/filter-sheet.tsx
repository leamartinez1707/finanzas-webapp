'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Pill-style button that opens the filter Sheet. Adopts the active chip
 * styling and shows a small count badge as soon as one filter is on, so the
 * user can tell filters are applied without opening the sheet.
 */
export function FilterTrigger({
  onClick,
  activeCount,
}: {
  onClick: () => void
  activeCount: number
}) {
  const active = activeCount > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      <SlidersHorizontal className="size-3.5" />
      Filtros
      {active && (
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {activeCount}
        </span>
      )}
    </button>
  )
}

export type ActiveFilterPill = {
  key: string
  label: string
  onRemove: () => void
}

/**
 * Always-visible row of removable pills, one per active filter, plus a
 * trailing "Limpiar todo". Renders nothing when there are no active filters
 * — callers should still gate on `hasFilters` to avoid a layout jump.
 */
export function ActiveFilterPills({
  pills,
  onClearAll,
}: {
  pills: ActiveFilterPill[]
  onClearAll: () => void
}) {
  if (pills.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
        >
          {pill.label}
          <button
            type="button"
            onClick={pill.onRemove}
            aria-label={`Quitar filtro ${pill.label}`}
            className="inline-flex size-4 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <X className="size-3" />
        Limpiar todo
      </button>
    </div>
  )
}

/**
 * Vertical section inside the filter Sheet: a small heading above a row of
 * chips that wrap instead of scrolling. The chips themselves stay
 * page-owned (colored dot / avatar / icon differ too much to share).
 */
export function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
