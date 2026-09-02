'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Settings2,
  Pencil,
  House,
  LogOut,
  Plus,
  AlertTriangle,
  ArrowRight,
  UserMinus,
  Loader2,
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { InviteManager } from '@/components/invite-manager'
import { CurrencySelect } from '@/components/currency-select'
import { Field, inputClass } from '@/components/field'
import { Sheet } from '@/components/sheet'
import { PersonAvatar } from '@/components/person-avatar'
import { PremiumWaitlistCard } from '@/components/premium-waitlist-card'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CurrencyCode, Household, Member, SplitPercent } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function AjustesPage() {
  const router = useRouter()
  const {
    isPersonal,
    activeHousehold,
    myHouseholds,
    members,
    currentUser,
    loading,
    busy,
    setSelectedContext,
    updateHousehold,
    createHousehold,
    leaveHousehold,
    removeMember,
  } = useApp()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>('UYU')
  const [showLeave, setShowLeave] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null)

  if (loading) return null

  if (isPersonal || !activeHousehold) {
    return (
      <div className="space-y-5">
        <ScreenHeader title="Ajustes" />
        <PremiumWaitlistCard />
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Settings2 className="size-6" />
          </span>
          <h3 className="text-base font-semibold">Estás en vista personal</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Cambiá al contexto de un hogar para ver sus ajustes.
          </p>
        </div>
      </div>
    )
  }

  const householdMembers = activeHousehold.memberIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean)

  function openEdit() {
    setEditName(activeHousehold!.name)
    setEditCurrency(activeHousehold!.currency)
    setEditing(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateHousehold(activeHousehold!.id, {
        name: editName.trim() || activeHousehold!.name,
        currency: editCurrency,
      })
      showSuccess('Hogar actualizado.')
    } catch (error) {
      showError(error)
      return
    }
    setEditing(false)
  }

  async function handleCreateAnother() {
    try {
      const id = await createHousehold('Nuevo hogar', 'UYU')
      setSelectedContext(id)
      showSuccess('Hogar creado.')
      router.push('/ajustes')
    } catch (error) {
      showError(error)
    }
  }

  async function handleLeave() {
    try {
      await leaveHousehold(activeHousehold!.id)
      showSuccess('Saliste del hogar.')
      setShowLeave(false)
      router.push('/inicio')
    } catch (error) {
      showError(error)
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return
    try {
      await removeMember(activeHousehold!.id, memberToRemove.id)
      showSuccess('Se sacó al miembro del hogar.')
      setMemberToRemove(null)
    } catch (error) {
      showError(error)
    }
  }

  async function saveSplit(percents: SplitPercent[] | null) {
    try {
      await updateHousehold(activeHousehold!.id, { defaultSplit: percents })
      showSuccess(percents ? 'División guardada.' : 'División restablecida a partes iguales.')
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-4">
      <ScreenHeader title="Ajustes" subtitle={activeHousehold.name} />

      <PremiumWaitlistCard />

      {/* --- household info --- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Información del hogar
        </h2>
        <button
          onClick={openEdit}
          className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <House className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{activeHousehold.name}</p>
            <p className="text-sm text-muted-foreground">Moneda: {activeHousehold.currency}</p>
          </div>
          <Pencil className="size-4 text-muted-foreground" />
        </button>
      </section>

      {/* --- members --- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Miembros ({householdMembers.length})
        </h2>
        <ul className="space-y-2">
          {householdMembers.map((m) => {
            if (!m) return null
            const isMe = m.id === currentUser?.id
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <PersonAvatar member={m} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {m.name} {isMe && <span className="font-normal text-muted-foreground">(vos)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Desde {formatDate(m.joinedAt)}
                </span>
                {currentUser?.id === activeHousehold.ownerId && !isMe && (
                  <button
                    onClick={() => setMemberToRemove({ id: m.id, name: m.name })}
                    aria-label={`Sacar a ${m.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* --- split config --- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          División del hogar
        </h2>
        <HouseholdSplitForm
          key={`${activeHousehold.id}:${activeHousehold.defaultSplit?.map((s) => `${s.memberId}-${s.percent}`).join(',') ?? 'even'}`}
          household={activeHousehold}
          members={householdMembers.filter((m): m is NonNullable<typeof m> => Boolean(m))}
          currentUserId={currentUser?.id}
          onSave={saveSplit}
        />
      </section>

      {/* --- invites --- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Invitar personas
        </h2>
        <InviteManager householdId={activeHousehold.id} />
      </section>

      {/* --- other households --- */}
      {myHouseholds.length > 1 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tus otros hogares
          </h2>
          <ul className="space-y-2">
            {myHouseholds
              .filter((h) => h.id !== activeHousehold.id)
              .map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => {
                      setSelectedContext(h.id)
                      router.push('/inicio')
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <House className="size-4 text-muted-foreground" />
                    <span className="flex-1 font-medium">{h.name}</span>
                    <span className="text-xs text-muted-foreground">{h.currency}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
          </ul>
          <button
            onClick={handleCreateAnother}
            disabled={busy}
            className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Crear otro hogar
              </>
            )}
          </button>
        </section>
      )}

      {/* --- danger zone --- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-destructive/70">
          Zona peligrosa
        </h2>
        <button
          onClick={() => setShowLeave(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-left text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-5" />
          <span className="font-semibold">Salir del hogar</span>
        </button>
      </section>

      {/* --- edit sheet --- */}
      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar hogar"
      >
        <form onSubmit={handleEdit} className="space-y-5">
          <Field label="Nombre del hogar" htmlFor="edit-name">
            <input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Moneda por defecto">
            <CurrencySelect value={editCurrency} onChange={setEditCurrency} />
          </Field>
          <p className="text-xs text-muted-foreground">
            ⚠️ Cambiar la moneda no convierte los gastos ya registrados.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={busy}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </span>
              ) : 'Guardar'}
            </button>
          </div>
        </form>
      </Sheet>

      {/* --- leave confirmation sheet --- */}
      <Sheet
        open={showLeave}
        onClose={() => setShowLeave(false)}
        title="¿Salir del hogar?"
      >
        <div className="space-y-4">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            Si salís de <strong>{activeHousehold.name}</strong>:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              Tus gastos ya registrados quedan en el historial del hogar.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              Dejás de ver movimientos nuevos de este hogar.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              Podés volver si alguien te invita de nuevo.
            </li>
            {activeHousehold.memberIds.length === 1 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-destructive">•</span>
                Sos la única persona en este hogar — nadie va a poder verlo hasta que alguien se una de nuevo.
              </li>
            )}
          </ul>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowLeave(false)}
              disabled={busy}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleLeave}
              disabled={busy}
              className="flex-[2] rounded-2xl bg-destructive py-3.5 font-semibold text-white transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saliendo...
                </span>
              ) : 'Salir del hogar'}
            </button>
          </div>
        </div>
      </Sheet>

      {/* --- remove member confirmation sheet --- */}
      <Sheet
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="¿Sacar del hogar?"
      >
        <div className="space-y-4">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            Si sacás a <strong>{memberToRemove?.name}</strong> de <strong>{activeHousehold.name}</strong>:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              Sus gastos ya registrados quedan en el historial del hogar.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              Deja de ver movimientos nuevos de este hogar.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              Puede volver si lo invitás de nuevo.
            </li>
          </ul>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setMemberToRemove(null)}
              disabled={busy}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleRemoveMember}
              disabled={busy}
              className="flex-[2] rounded-2xl bg-destructive py-3.5 font-semibold text-white transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Sacando...
                </span>
              ) : 'Sacar del hogar'}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}

// Local state is initialized straight from props (lazy useState, no effect) —
// the parent forces a remount via `key` whenever the household or its
// defaultSplit changes, so this never needs to sync itself after mount.
function HouseholdSplitForm({
  household,
  members,
  currentUserId,
  onSave,
}: {
  household: Household
  members: Member[]
  currentUserId?: string
  onSave: (percents: SplitPercent[] | null) => void | Promise<void>
}) {
  // Even split, rounded to one decimal — the remainder from rounding goes to
  // the last member so the defaults always sum to exactly 100 (otherwise a
  // household of e.g. 3 people would land on 33.3/33.3/33.3 = 99.9 and the
  // save button would start out disabled with nothing touched).
  const basePercent = members.length > 0 ? Math.floor(1000 / members.length) / 10 : 0
  const [splitPercents, setSplitPercents] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    members.forEach((m, i) => {
      const existing = household.defaultSplit?.find((s) => s.memberId === m.id)
      if (existing) {
        initial[m.id] = String(existing.percent)
        return
      }
      const isLast = i === members.length - 1
      const value = isLast ? Math.round((100 - basePercent * (members.length - 1)) * 10) / 10 : basePercent
      initial[m.id] = String(value)
    })
    return initial
  })
  const { busy } = useApp()

  const splitSum = Object.values(splitPercents).reduce((sum, v) => sum + (Number(v) || 0), 0)
  const splitMatches = Math.abs(splitSum - 100) < 0.01

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!splitMatches) return
    await onSave(members.map((m) => ({ memberId: m.id, percent: Number(splitPercents[m.id]) || 0 })))
  }

  async function handleReset() {
    await onSave(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        Definí cómo se reparten los gastos nuevos del hogar. Cambiar esto no afecta a los gastos ya cargados.
      </p>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <PersonAvatar member={m} size="xs" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {m.id === currentUserId ? 'Yo' : m.name}
            </span>
            <div className="flex items-center gap-1.5">
              <input
                inputMode="decimal"
                value={splitPercents[m.id] ?? ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '')
                  setSplitPercents((prev) => ({ ...prev, [m.id]: value }))
                }}
                className={cn(inputClass, 'w-20 text-right tnum')}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>
      <p className={cn('text-xs font-medium', splitMatches ? 'text-positive' : 'text-destructive')}>
        {splitMatches ? '✓ Suma 100%' : `Suma ${splitSum.toFixed(1)}% (debe sumar 100%)`}
      </p>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          className="flex-1 rounded-2xl border border-border py-3 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Partes iguales
        </button>
        <button
          type="submit"
          disabled={busy || !splitMatches}
          className="flex-[2] rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </span>
          ) : 'Guardar división'}
        </button>
      </div>
    </form>
  )
}
