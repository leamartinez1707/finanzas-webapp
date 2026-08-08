'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Check, Plus, House, User, Settings2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Sheet } from '@/components/sheet'
import { PersonAvatar, AvatarStack } from '@/components/person-avatar'
import { CURRENCIES } from '@/lib/categories'
import { cn } from '@/lib/utils'

export function ContextSwitcher() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { selectedContext, setSelectedContext, myHouseholds, members, currentUser } = useApp()

  const isPersonal = selectedContext === 'personal'
  const active = myHouseholds.find((h) => h.id === selectedContext)

  const activeMembers = active
    ? active.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
    : []

  function choose(id: string) {
    setSelectedContext(id)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-2.5 rounded-full bg-card py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-border transition-colors hover:bg-muted/50"
        aria-label="Cambiar de contexto"
      >
        {isPersonal ? (
          currentUser ? <PersonAvatar member={currentUser} size="sm" /> : <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted" />
        ) : (
          <span
            className="inline-flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary"
            aria-hidden
          >
            <House className="size-4" strokeWidth={2.4} />
          </span>
        )}
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {isPersonal ? 'Personal' : 'Hogar'}
          </span>
          <span className="max-w-[40vw] truncate text-sm font-semibold">
            {isPersonal ? 'Mis finanzas' : active?.name}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Cambiar de contexto" className="sm:max-w-sm">
        <div className="space-y-2">
          {myHouseholds.map((h) => {
            const hm = h.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
            const selected = h.id === selectedContext
            return (
              <button
                key={h.id}
                onClick={() => choose(h.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                  selected ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted/50',
                )}
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <House className="size-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{h.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hm.length} {hm.length === 1 ? 'miembro' : 'miembros'} · {CURRENCIES[h.currency].label}
                  </span>
                </span>
                <AvatarStack members={hm} size="xs" />
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}

          <button
            onClick={() => choose('personal')}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
              isPersonal ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted/50',
            )}
          >
            {currentUser && <PersonAvatar member={currentUser} size="md" />}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Mis finanzas</span>
              <span className="block text-xs text-muted-foreground">
                Gastos y objetivos personales
              </span>
            </span>
            {isPersonal ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : (
              <User className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setOpen(false)
                router.push('/crear-hogar')
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Plus className="size-4" />
              Crear hogar
            </button>
            <button
              onClick={() => {
                setOpen(false)
                if (!isPersonal) router.push('/ajustes')
              }}
              disabled={isPersonal}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-40"
            >
              <Settings2 className="size-4" />
              Ajustes
            </button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
