'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut, RefreshCw, Settings2 } from 'lucide-react'
import { ContextSwitcher } from '@/components/context-switcher'
import { useApp } from '@/lib/store'
import { signOut } from '@/lib/supabase/queries'
import { showError } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const { isPersonal, refresh } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refresh()
    } catch (error) {
      showError(error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <ContextSwitcher />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Actualizar datos"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground disabled:opacity-60"
            disabled={refreshing}
          >
            <RefreshCw className={cn('size-4.5', refreshing && 'animate-spin')} />
          </button>
          {!isPersonal && (
            <Link
              href="/ajustes"
              aria-label="Ajustes del hogar"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
            >
              <Settings2 className="size-4.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut().catch(showError)}
            aria-label="Cerrar sesión"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
          >
            <LogOut className="size-4.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
