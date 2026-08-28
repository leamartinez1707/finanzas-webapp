'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { currentMonthCursor, isSameMonthCursor, monthCursorLabel, nextMonthCursor, prevMonthCursor, type MonthCursor } from '@/lib/format'

export function MonthNav({
  value,
  onChange,
  disableFuture = true,
}: {
  value: MonthCursor
  onChange: (m: MonthCursor) => void
  disableFuture?: boolean
}) {
  const isCurrentMonth = isSameMonthCursor(value, currentMonthCursor())

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(prevMonthCursor(value))}
        aria-label="Mes anterior"
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="size-4" />
      </button>
      <span className="min-w-[160px] text-center text-sm font-semibold text-foreground">{monthCursorLabel(value)}</span>
      <button
        onClick={() => onChange(nextMonthCursor(value))}
        aria-label="Mes siguiente"
        disabled={disableFuture && isCurrentMonth}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}
