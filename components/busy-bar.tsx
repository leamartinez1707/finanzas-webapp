'use client'

import { useApp } from '@/lib/store'

export function BusyBar() {
  const { busy } = useApp()

  if (!busy) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="h-0.5 w-full overflow-hidden bg-primary/20">
        <div className="h-full w-1/3 animate-[loading_1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  )
}
