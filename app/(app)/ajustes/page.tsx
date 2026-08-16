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
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { InviteManager } from '@/components/invite-manager'
import { CurrencySelect } from '@/components/currency-select'
import { Field, inputClass } from '@/components/field'
import { Sheet } from '@/components/sheet'
import { PersonAvatar } from '@/components/person-avatar'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CurrencyCode } from '@/lib/types'
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
    setSelectedContext,
    updateHousehold,
    createHousehold,
  } = useApp()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>('UYU')
  const [showLeave, setShowLeave] = useState(false)

  if (loading) return null

  if (isPersonal || !activeHousehold) {
    return (
      <div className="space-y-5">
        <ScreenHeader title="Ajustes" />
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

  return (
    <div className="space-y-4">
      <ScreenHeader title="Ajustes" subtitle={activeHousehold.name} />

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
              </li>
            )
          })}
        </ul>
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
            className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <Plus className="size-4" />
            Crear otro hogar
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
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground"
            >
              Guardar
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
          </ul>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowLeave(false)}
              className="flex-1 rounded-2xl border border-border py-3.5 font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                // In a real app this would call leaveHousehold()
                // For now, just navigate to personal view
                setSelectedContext('personal')
                setShowLeave(false)
                router.push('/inicio')
              }}
              className="flex-[2] rounded-2xl bg-destructive py-3.5 font-semibold text-white transition-transform active:translate-y-px"
            >
              Salir del hogar
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
