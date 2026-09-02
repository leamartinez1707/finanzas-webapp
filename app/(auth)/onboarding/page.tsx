'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { PERSON_COLORS } from '@/lib/categories'
import { Field, inputClass } from '@/components/field'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PersonColor } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { updateProfile, busy } = useApp()
  const [name, setName] = useState('')
  const [color, setColor] = useState<PersonColor>('person-1')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateProfile(name.trim() || 'Yo', color)
      showSuccess('Perfil guardado.')
      router.push('/bienvenida')
    } catch (error) {
      showError(error)
    }
  }

  const preview = name.trim() || 'Vos'

  return (
    <div className="flex flex-1 flex-col justify-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Paso 1 de 2</p>
      <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight">
        ¿Cómo te llamás?
      </h1>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
        Elegí un color que te identifique. Lo vamos a usar para reconocerte al toque en los
        gastos y balances.
      </p>

      <div className="mt-8 flex flex-col items-center">
        <span
          className="inline-flex size-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg transition-colors"
          style={{ backgroundColor: `var(--${color})` }}
          aria-hidden
        >
          {initials(preview)}
        </span>
        <span className="mt-3 text-lg font-semibold">{preview}</span>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <Field label="Tu nombre" htmlFor="name">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ej. Valentina"
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="Tu color">
          <div className="flex flex-wrap gap-3 pt-1">
            {PERSON_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-full transition-transform',
                  color === c ? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'hover:scale-105',
                )}
                style={{ backgroundColor: `var(--${c})` }}
              >
                {color === c && <Check className="size-5 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4.5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="size-4.5" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
