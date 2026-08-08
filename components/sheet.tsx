'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop — tapping anywhere closes */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      {/* Dialog — bottom sheet on mobile, centered on desktop */}
      <div className="absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative z-10 flex w-full max-w-md flex-col rounded-t-2xl bg-card shadow-2xl duration-300 animate-in slide-in-from-bottom',
            'sm:max-h-[90vh] sm:rounded-2xl',
            className,
          )}
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {/* Drag handle (mobile) */}
          <div className="mx-auto mt-3 h-1 w-8 rounded-full bg-border sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 pt-3">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            <button
              onClick={onClose}
              className="-mr-1 ml-auto inline-flex size-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
