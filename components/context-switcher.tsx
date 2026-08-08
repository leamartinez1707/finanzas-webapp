'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Check, Plus, House, User, Settings2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { PersonAvatar, AvatarStack } from '@/components/person-avatar'
import { CURRENCIES } from '@/lib/categories'
import { cn } from '@/lib/utils'

export function ContextSwitcher() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const { selectedContext, setSelectedContext, myHouseholds, members, currentUser } = useApp()

  const isPersonal = selectedContext === 'personal'
  const active = myHouseholds.find((h) => h.id === selectedContext)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function choose(id: string) {
    setSelectedContext(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-w-0 items-center gap-2.5 rounded-full bg-card py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-border transition-colors hover:bg-muted/50"
        aria-label="Cambiar de contexto"
        aria-expanded={open}
      >
        {isPersonal ? (
          currentUser ? <PersonAvatar member={currentUser} size="sm" /> : <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted" />
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary">
            <House className="size-4" strokeWidth={2.4} />
          </span>
        )}
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {isPersonal ? 'Personal' : 'Hogar'}
          </span>
          <span className="max-w-[35vw] truncate text-sm font-semibold">
            {isPersonal ? 'Mis finanzas' : active?.name}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {myHouseholds.map((h) => {
            const hm = h.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
            const selected = h.id === selectedContext
            return (
              <button
                key={h.id}
                onClick={() => choose(h.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors',
                  selected ? 'bg-primary/8' : 'hover:bg-muted/50',
                )}
              >
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <House className="size-4" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{h.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hm.length} {hm.length === 1 ? 'miembro' : 'miembros'} · {CURRENCIES[h.currency].label}
                  </span>
                </span>
                <AvatarStack members={hm} size="xs" />
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}

          <div className="my-1 h-px bg-border" />

          <button
            onClick={() => choose('personal')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors',
              isPersonal ? 'bg-primary/8' : 'hover:bg-muted/50',
            )}
          >
            {currentUser && <PersonAvatar member={currentUser} size="sm" />}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Mis finanzas</span>
              <span className="block text-xs text-muted-foreground">Gastos y objetivos personales</span>
            </span>
            {isPersonal && <Check className="size-4 shrink-0 text-primary" />}
          </button>

          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setOpen(false)
                router.push('/crear-hogar')
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Plus className="size-3.5" />
              Crear
            </button>
            <button
              onClick={() => {
                setOpen(false)
                if (!isPersonal) router.push('/ajustes')
              }}
              disabled={isPersonal}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-40"
            >
              <Settings2 className="size-3.5" />
              Ajustes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
