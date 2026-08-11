'use client'

import { useState } from 'react'
import { Mail, Send, RotateCw, X, Clock, CircleCheck, TriangleAlert } from 'lucide-react'
import { useApp } from '@/lib/store'
import { PersonAvatar } from '@/components/person-avatar'
import { inputClass } from '@/components/field'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InviteStatus } from '@/lib/types'

const STATUS_META: Record<
  InviteStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pendiente: { label: 'Pendiente', icon: Clock, className: 'bg-warning/20 text-warning-foreground' },
  aceptada: { label: 'Aceptada', icon: CircleCheck, className: 'bg-primary/12 text-primary' },
  expirada: { label: 'Expirada', icon: TriangleAlert, className: 'bg-destructive/12 text-destructive' },
}

export function InviteManager({ householdId }: { householdId: string }) {
  const { getHousehold, members, addInvite, updateInvite, removeInvite } = useApp()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const household = getHousehold(householdId)
  if (!household) return null

  const householdMembers = household.memberIds
    .map((id) => members.find((m) => m.id === id)!)
    .filter(Boolean)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) return
    setError('')
    const result = await addInvite(householdId, value)
    if (result?.error) {
      setError(result.error)
    } else {
      setEmail('')
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email de quien invitás"
            className={cn(inputClass, 'pl-11')}
          />
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground transition-transform active:translate-y-px"
        >
          <Send className="size-4" />
          Invitar
        </button>
      </form>
      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}

      {household.invites.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invitaciones
          </h3>
          <ul className="space-y-2">
            {household.invites.map((inv) => {
              const meta = STATUS_META[inv.status]
              const Icon = meta.icon
              return (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <span
                      className={cn(
                        'mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                        meta.className,
                      )}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                  </div>
                  {inv.status !== 'aceptada' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateInvite(householdId, inv.id, 'pendiente')}
                        aria-label="Reenviar invitación"
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <RotateCw className="size-4" />
                      </button>
                      <button
                        onClick={() => removeInvite(householdId, inv.id)}
                        aria-label="Cancelar invitación"
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Miembros ({householdMembers.length})
        </h3>
        <ul className="space-y-2">
          {householdMembers.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <PersonAvatar member={m} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                Desde {formatDate(m.joinedAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
