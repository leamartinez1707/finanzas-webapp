'use client'

import { useMemo, useState } from 'react'
import { Plus, Wallet, ArrowDown, ArrowUp, Trash2, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'
import { formatDate, formatRelative, parseLocalDate, todayLocalISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SavingsMovement } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function IngresosPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    loading,
    members,
    savings,
    personalSavingsTotals,
    householdSavingsTotals,
    busy,
    addSavings,
    updateSavings,
    deleteSavings,
  } = useApp()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SavingsMovement | undefined>(undefined)
  const [movType, setMovType] = useState<'deposito' | 'retiro'>('deposito')
  const [movAmount, setMovAmount] = useState('')
  const [movDate, setMovDate] = useState(todayLocalISO())
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

  // Income movements per member, scoped to current context
  const savingsByMember = useMemo(() => {
    const map = new Map<string, SavingsMovement[]>()
    for (const s of savings) {
      if (s.bucket !== 'ingresos') continue

      // In household mode, show household scoped movements for that household + personal movements of members
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
    movs.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
  }

  // Total de Ingresos por miembro, sobre TODO el historial — server-side
  // (mismo criterio que en ahorros/page.tsx: household + personal-propio).
  function memberBalance(memberId: string) {
    const householdTotal = !isPersonal && activeHousehold
      ? householdSavingsTotals.find(
          (t) => t.householdId === activeHousehold.id && t.memberId === memberId && t.bucket === 'ingresos',
        )?.balance ?? 0
      : 0
    const personalTotal = memberId === currentUser?.id
      ? personalSavingsTotals.find((t) => t.bucket === 'ingresos')?.balance ?? 0
      : 0
    return householdTotal + personalTotal
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(movAmount)
    if (!value || value <= 0) return setMovError('Ingresá un monto válido')
    try {
      await addSavings({
        memberId: currentUser!.id,
        scope: isPersonal ? 'personal' : 'household',
        householdId: isPersonal ? undefined : activeHousehold?.id,
        bucket: 'ingresos',
        type: movType,
        amount: value,
        date: movDate,
        note: movNote.trim() || undefined,
      })
      showSuccess('Movimiento registrado.')
    } catch (error) {
      showError(error)
      return
    }
    setAdding(false)
    setMovAmount('')
    setMovNote('')
    setMovError('')
  }

  function openEdit(mov: SavingsMovement) {
    setEditing(mov)
    setMovType(mov.type)
    setMovAmount(String(mov.amount))
    setMovDate(mov.date)
    setMovNote(mov.note ?? '')
    setMovError('')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const value = Number(movAmount)
    if (!value || value <= 0) return setMovError('Ingresá un monto válido')
    try {
      await updateSavings(editing.id, {
        type: movType,
        amount: value,
        date: movDate,
        note: movNote.trim() || undefined,
      })
      showSuccess('Movimiento actualizado.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(undefined)
    setMovAmount('')
    setMovNote('')
    setMovError('')
  }

  async function handleDelete() {
    if (!editing) return
    try {
      await deleteSavings(editing.id)
      showSuccess('Movimiento eliminado.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(undefined)
  }

  const hasAnySavings = [...savingsByMember.values()].some((m) => m.length > 0)

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Ingresos"
        subtitle={isPersonal ? 'La plata con la que pagás tus gastos' : activeHousehold?.name}
        action={
          <button
              onClick={() => { setAdding(true); setMovType('deposito'); setMovAmount(''); setMovDate(todayLocalISO()); setMovNote(''); setMovError('') }}
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            aria-label="Registrar movimiento"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      {hasAnySavings ? (
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {visibleMembers.map((member) => {
            if (!member) return null
            const balance = memberBalance(member.id)
            const movs = savingsByMember.get(member.id) ?? []
            if (movs.length === 0 && member.id !== currentUser?.id) return null

            const isExpanded = expandedMember === member.id || visibleMembers.length === 1

            return (
              <div key={member.id} className="rounded-2xl border border-border bg-card overflow-hidden">
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
                      {balance >= 0 ? 'disponible' : 'saldo negativo'}
                    </p>
                  </div>
                </button>

                {/* --- movements --- */}
                {isExpanded && movs.length > 0 && (
                  <ul className="border-t border-border px-4 pb-4 pt-2 space-y-1.5">
                    {movs.slice(0, 10).map((mov) => (
                      <li key={mov.id}>
                        <button
                          onClick={() => openEdit(mov)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-left transition-colors hover:bg-muted/50"
                        >
                          <span
                            className={cn(
                              'inline-flex size-7 items-center justify-center rounded-full shrink-0',
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
                              {mov.type === 'deposito' ? 'Ingreso' : 'Retiro'}
                              {mov.note && ` · ${mov.note}`}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatRelative(mov.date, mov.createdAt)}
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
                        </button>
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
          icon={Wallet}
          title="Todavía no hay ingresos"
          description={
            isPersonal
              ? 'Registrá tu primer ingreso para empezar a ver cuánto tenés disponible.'
              : 'Registren sus ingresos para verlos acá.'
          }
          action={
            <button
            onClick={() => { setAdding(true); setMovType('deposito'); setMovAmount(''); setMovDate(todayLocalISO()); setMovNote(''); setMovError('') }}
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
        <form onSubmit={handleAdd} className="space-y-4">
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
              Ingreso
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
          {movType === 'retiro' && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Para plata que salió sin ser un gasto (se la prestaste a alguien, una
              corrección). Para ahorrar, mejor usá &ldquo;Mover a ahorros&rdquo; en la
              sección Ahorros.
            </p>
          )}

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

          <Field label="Fecha" htmlFor="savings-date">
            <input
              id="savings-date"
              type="date"
              value={movDate}
              onChange={(e) => setMovDate(e.target.value)}
              className={inputClass}
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
              disabled={busy}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                'flex-[2] rounded-2xl py-3.5 font-semibold text-white transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60',
                movType === 'deposito' ? 'bg-positive' : 'bg-destructive',
              )}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Registrando...
                </span>
              ) : (
                `Registrar ${movType === 'deposito' ? 'ingreso' : 'retiro'}`
              )}
            </button>
          </div>
        </form>
      </Sheet>

      {/* --- edit movement sheet --- */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(undefined)}
        title={editing?.type === 'deposito' ? 'Editar ingreso' : 'Editar retiro'}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
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
              Ingreso
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

          <Field label="Monto" htmlFor="edit-savings-amount">
            <input
              id="edit-savings-amount"
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

          <Field label="Fecha" htmlFor="edit-savings-date">
            <input
              id="edit-savings-date"
              type="date"
              value={movDate}
              onChange={(e) => setMovDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Nota (opcional)" htmlFor="edit-savings-note">
            <input
              id="edit-savings-note"
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
              onClick={() => setEditing(undefined)}
              disabled={busy}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                'flex-[2] rounded-2xl py-3.5 font-semibold text-white transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60',
                movType === 'deposito' ? 'bg-positive' : 'bg-destructive',
              )}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </span>
              ) : 'Guardar cambios'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3 font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Eliminar movimiento
              </>
            )}
          </button>
        </form>
      </Sheet>
    </div>
  )
}
