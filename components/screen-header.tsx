'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string
  subtitle?: string
  back?: boolean
  action?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <div className="mb-5 flex items-start gap-3">
      {back && (
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-[18px]" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-pretty text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  )
}
