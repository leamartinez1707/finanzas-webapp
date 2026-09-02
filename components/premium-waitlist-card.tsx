'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { PremiumFeatureId } from '@/lib/types'
import { showError } from '@/lib/toast'

const FEATURES: { id: PremiumFeatureId; label: string }[] = [
  { id: 'conversion_moneda', label: 'Conversión de moneda' },
  { id: 'exportar_excel_pdf', label: 'Exportar a Excel/PDF' },
  { id: 'notificaciones_presupuesto', label: 'Alertas de presupuesto' },
  { id: 'tendencia_categoria', label: 'Tendencia por categoría' },
]

export function PremiumWaitlistCard() {
  const { premiumWaitlistEntry, joinPremiumWaitlist, updatePremiumWaitlistFeatures, leavePremiumWaitlist, busy } = useApp()
  const [leaving, setLeaving] = useState(false)

  async function handleJoin() {
    try {
      await joinPremiumWaitlist([])
    } catch (error) {
      showError(error)
    }
  }

  async function toggleFeature(id: PremiumFeatureId) {
    if (!premiumWaitlistEntry) return
    const current = premiumWaitlistEntry.interestedFeatures
    const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id]
    try {
      await updatePremiumWaitlistFeatures(next)
    } catch (error) {
      showError(error)
    }
  }

  async function handleLeave() {
    setLeaving(true)
    try {
      await leavePremiumWaitlist()
    } catch (error) {
      showError(error)
    } finally {
      setLeaving(false)
    }
  }

  if (!premiumWaitlistEntry) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Premium — Próximamente
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Estamos pensando funciones extra y opcionales, como conversión de moneda automática,
          exportar a Excel/PDF, alertas de presupuesto por notificación y tendencia por
          categoría en varios meses. Nada de esto está listo todavía, ni gatilla ningún cobro.
        </p>
        <button
          onClick={handleJoin}
          disabled={busy}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Anotando...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Avisame cuando salga
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Premium — Próximamente
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        ¡Anotado! Te avisamos apenas esté listo.
      </p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">¿Qué te interesaría más?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FEATURES.map((f) => {
          const active = premiumWaitlistEntry.interestedFeatures.includes(f.id)
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFeature(f.id)}
              disabled={busy}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={handleLeave}
        disabled={busy}
        className="mt-3 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {leaving ? 'Saliendo...' : 'Ya no me interesa'}
      </button>
    </div>
  )
}
