'use client'

import { useMemo, useState } from 'react'
import { Plus, PiggyBank, ArrowDown, ArrowUp, ArrowRightLeft, Trash2, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'
import { formatRelative, parseLocalDate, todayLocalISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SavingsMovement } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function AhorrosPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    loading,
    members,
    savings,
    busy,
    addSavings,
    updateSavings,
    deleteSavings,
    transferToSavings,
  } = useApp()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SavingsMovement | undefined>(undefined)
  const [movType, setMovType] = useState<'deposito' | 'retiro'>('deposito')
  const [movAmount, setMovAmount] = useState('')
  const [movDate, setMovDate] = useState(todayLocalISO())
  const [movNote, setMovNote] = useState('')
  const [movError, setMovError] = useState('')
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  const [transferring, setTransferring] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(todayLocalISO())
  const [transferNote, setTransferNote] = useState('')
  const [transferError, setTransferError] = useState('')

  // Members to show: in household mode, all household members; in personal mode, just current user
  const visibleMembers = useMemo(() => {
    if (isPersonal) return currentUser ? [currentUser] : []
    if (!activeHousehold) return []
    return activeHousehold.memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean)
  }, [isPersonal, activeHousehold, currentUser, members])

  // Available balance in Ingresos, for the "current user, personal" case only —
  // just a hint shown while transferring, not a hard limit.
  const availableInIngresos = useMemo(() => {
    if (!isPersonal || !currentUser) return null
    return savings
      .filter((s) => s.bucket === 'ingresos' && s.scope === 'personal' && s.memberId === currentUser.id)
      .reduce((sum, s) => sum + (s.type === 'deposito' ? s.amount : -s.amount), 0)
  }, [savings, isPersonal, currentUser])

  // Savings movements per member, scoped to current context
  const savingsByMember = useMemo(() => {
    const map = new Map<string, SavingsMovement[]>()
    for (const s of savings) {
      if (s.bucket !== 'ahorro') continue

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

  function memberBalance(memberId: string) {
    const movs = savingsByMember.get(memberId) ?? []
    return movs.reduce((sum, s) => sum + (s.type === 'deposito' ? s.amount : -s.amount), 0)
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
        bucket: 'ahorro',
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

  function openTransfer() {
    setTransferAmount('')
    setTransferDate(todayLocalISO())
    setTransferNote('')
    setTransferError('')
    setTransferring(true)
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(transferAmount)
    if (!value || value <= 0) return setTransferError('Ingresá un monto válido')
    try {
      await transferToSavings({
        amount: value,
        date: transferDate,
        note: transferNote.trim() || undefined,
      })
      showSuccess('Transferencia registrada.')
    } catch (error) {
      showError(error)
      return
    }
    setTransferring(false)
    setTransferAmount('')
    setTransferNote('')
    setTransferError('')
  }

  const hasAnySavings = [...savingsByMember.values()].some((m) => m.length > 0)

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Ahorros"
        subtitle={isPersonal ? 'Lo que apartaste, separado de tus ingresos' : activeHousehold?.name}
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

      <button
        onClick={openTransfer}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          <ArrowRightLeft className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Mover a ahorros</p>
          <p className="text-xs text-muted-foreground">Transferí plata desde Ingresos</p>
        </div>
      </button>

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
                      {balance >= 0 ? 'ahorrado' : 'saldo negativo'}
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
                              {mov.type === 'deposito' ? 'Ahorro' : 'Retiro'}
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
          icon={PiggyBank}
          title="Todavía no hay ahorros"
          description={
            isPersonal
              ? 'Mové plata desde Ingresos o registrá un ahorro directo para empezar.'
              : 'Registren sus ahorros para verlos acá.'
          }
          action={
            <button
              onClick={openTransfer}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <ArrowRightLeft className="size-4" />
              Mover a ahorros
            </button>
          }
        />
      )}

      {/* --- transfer from Ingresos sheet --- */}
      <Sheet open={transferring} onClose={() => setTransferring(false)} title="Mover a ahorros">
        <form onSubmit={handleTransfer} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registra un retiro en Ingresos y un ahorro por el mismo monto, en un solo paso.
            {availableInIngresos !== null && (
              <>
                {' '}Tenés{' '}
                <Money amount={availableInIngresos} currency={activeCurrency} className="font-semibold text-foreground" />
                {' '}disponible en Ingresos.
              </>
            )}
          </p>

          <Field label="Monto" htmlFor="transfer-amount">
            <input
              id="transfer-amount"
              inputMode="decimal"
              value={transferAmount}
              onChange={(e) => {
                setTransferAmount(e.target.value.replace(/[^0-9.]/g, ''))
                setTransferError('')
              }}
              placeholder="0"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Fecha" htmlFor="transfer-date">
            <input
              id="transfer-date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Nota (opcional)" htmlFor="transfer-note">
            <input
              id="transfer-note"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Ej: Para el auto"
              className={inputClass}
            />
          </Field>

          {transferError && <p className="text-sm font-medium text-destructive">{transferError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setTransferring(false)}
              disabled={busy}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Transfiriendo...
                </span>
              ) : 'Mover a ahorros'}
            </button>
          </div>
        </form>
      </Sheet>

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
              Ahorro
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
                `Registrar ${movType === 'deposito' ? 'ahorro' : 'retiro'}`
              )}
            </button>
          </div>
        </form>
      </Sheet>

      {/* --- edit movement sheet --- */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(undefined)}
        title={editing?.type === 'deposito' ? 'Editar ahorro' : 'Editar retiro'}
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
              Ahorro
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
