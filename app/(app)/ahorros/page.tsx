'use client'

import { useMemo, useState } from 'react'
import { Plus, PiggyBank, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'
import { formatDate, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SavingsMovement } from '@/lib/types'

export default function AhorrosPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    members,
    savings,
    addSavings,
  } = useApp()

  const [adding, setAdding] = useState(false)
  const [movType, setMovType] = useState<'deposito' | 'retiro'>('deposito')
  const [movAmount, setMovAmount] = useState('')
  const [movNote, setMovNote] = useState('')
  const [movError, setMovError] = useState('')
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  // Members to show: in household mode, all household members; in personal mode, just current user
  const visibleMembers = useMemo(() => {
    if (isPersonal) return currentUser ? [currentUser] : []
    if (!activeHousehold) return []
    return activeHousehold.memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean)
  }, [isPersonal, activeHousehold, currentUser, members])

  // Savings per member, scoped to current context
  const savingsByMember = useMemo(() => {
    const map = new Map<string, SavingsMovement[]>()
    for (const s of savings) {
      // In household mode, show household scoped savings for that household + personal savings of members
      const matches = isPersonal
        ? s.scope === 'personal' && s.memberId === currentUser?.id
        : (s.scope === 'household' && s.householdId === activeHousehold?.id) ||
          (s.scope === 'personal' && activeHousehold?.memberIds.includes(s.memberId))

      if (!matches) continue

      if (!map.has(s.memberId)) map.set(s.memberId, [])
      map.get(s.memberId)!.push(s)
    }
    return map
  }, [savings, isPersonal, currentUser?.id, activeHousehold])

  // Sort movements by date desc
  for (const [id, movs] of savingsByMember) {
    movs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  function memberBalance(memberId: string) {
    const movs = savingsByMember.get(memberId) ?? []
    return movs.reduce((sum, s) => sum + (s.type === 'deposito' ? s.amount : -s.amount), 0)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(movAmount)
    if (!value || value <= 0) return setMovError('Ingresá un monto válido')
    addSavings({
      memberId: currentUser!.id,
      scope: isPersonal ? 'personal' : 'household',
      householdId: isPersonal ? undefined : activeHousehold?.id,
      type: movType,
      amount: value,
      date: new Date().toISOString(),
      note: movNote.trim() || undefined,
    })
    setAdding(false)
    setMovAmount('')
    setMovNote('')
    setMovError('')
  }

  const hasAnySavings = [...savingsByMember.values()].some((m) => m.length > 0)

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Ahorros"
        subtitle={isPersonal ? 'Tu ahorro personal' : activeHousehold?.name}
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            aria-label="Registrar movimiento"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      {hasAnySavings ? (
        <div className="space-y-4">
          {visibleMembers.map((member) => {
            if (!member) return null
            const balance = memberBalance(member.id)
            const movs = savingsByMember.get(member.id) ?? []
            if (movs.length === 0 && member.id !== currentUser?.id) return null

            const isExpanded = expandedMember === member.id || visibleMembers.length === 1

            return (
              <div key={member.id} className="rounded-3xl border border-border bg-card overflow-hidden">
                {/* --- member header --- */}
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
                >
                  <PersonAvatar member={member} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {member.id === currentUser?.id ? 'Vos' : member.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {movs.length} movimiento{movs.length !== 1 && 's'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Money
                      amount={balance}
                      currency={activeCurrency}
                      className={cn(
                        'text-lg font-bold',
                        balance >= 0 ? 'text-positive' : 'text-destructive',
                      )}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {balance >= 0 ? 'ahorrado' : 'saldo negativo'}
                    </p>
                  </div>
                </button>

                {/* --- movements --- */}
                {isExpanded && movs.length > 0 && (
                  <ul className="border-t border-border px-4 pb-4 pt-2 space-y-1.5">
                    {movs.slice(0, 10).map((mov) => (
                      <li
                        key={mov.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
                      >
                        <span
                          className={cn(
                            'inline-flex size-7 items-center justify-center rounded-full',
                            mov.type === 'deposito'
                              ? 'bg-positive/15 text-positive'
                              : 'bg-destructive/15 text-destructive',
                          )}
                        >
                          {mov.type === 'deposito' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUp className="size-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">
                            {mov.type === 'deposito' ? 'Depósito' : 'Retiro'}
                            {mov.note && ` · ${mov.note}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatRelative(mov.date)}
                          </p>
                        </div>
                        <Money
                          amount={mov.amount}
                          currency={activeCurrency}
                          className={cn(
                            'text-sm font-semibold tnum',
                            mov.type === 'deposito' ? 'text-positive' : 'text-destructive',
                          )}
                          sign={false}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={PiggyBank}
          title="Todavía no hay ahorros"
          description={
            isPersonal
              ? 'Registrá tu primer depósito para empezar a trackear tu ahorro.'
              : 'Registren sus ahorros para verlos acá.'
          }
          action={
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              Registrar movimiento
            </button>
          }
        />
      )}

      {/* --- add movement sheet --- */}
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Registrar movimiento"
      >
        <form onSubmit={handleAdd} className="space-y-5">
          {/* type toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMovType('deposito')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors',
                movType === 'deposito'
                  ? 'bg-positive text-white shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <ArrowDown className="size-4" />
              Depósito
            </button>
            <button
              type="button"
              onClick={() => setMovType('retiro')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors',
                movType === 'retiro'
                  ? 'bg-destructive text-white shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <ArrowUp className="size-4" />
              Retiro
            </button>
          </div>

          <Field label="Monto" htmlFor="savings-amount">
            <input
              id="savings-amount"
              inputMode="decimal"
              value={movAmount}
              onChange={(e) => {
                setMovAmount(e.target.value.replace(/[^0-9.]/g, ''))
                setMovError('')
              }}
              placeholder="0"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Nota (opcional)" htmlFor="savings-note">
            <input
              id="savings-note"
              value={movNote}
              onChange={(e) => setMovNote(e.target.value)}
              placeholder="Ej: Aguinaldo"
              className={inputClass}
            />
          </Field>

          {movError && <p className="text-sm font-medium text-destructive">{movError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={cn(
                'flex-[2] rounded-2xl py-3.5 font-semibold text-white transition-transform active:translate-y-px',
                movType === 'deposito' ? 'bg-positive' : 'bg-destructive',
              )}
            >
              Registrar {movType === 'deposito' ? 'depósito' : 'retiro'}
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
