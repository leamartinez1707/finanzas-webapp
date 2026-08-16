'use client'

import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { ContextSwitcher } from '@/components/context-switcher'
import { useApp } from '@/lib/store'

export function AppHeader() {
  const { isPersonal } = useApp()
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <ContextSwitcher />
        {!isPersonal && (
          <Link
            href="/ajustes"
            aria-label="Ajustes del hogar"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
          >
            <Settings2 className="size-4.5" />
          </Link>
        )}
      </div>
    </header>
  )
}
