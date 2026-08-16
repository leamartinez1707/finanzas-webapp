'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, PartyPopper } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Field, inputClass } from '@/components/field'
import { CurrencySelect } from '@/components/currency-select'
import { InviteManager } from '@/components/invite-manager'
import type { CurrencyCode } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

export default function CrearHogarPage() {
  const router = useRouter()
  const { createHousehold, setSelectedContext } = useApp()
  const [step, setStep] = useState<'form' | 'invite'>('form')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('UYU')
  const [newId, setNewId] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const id = await createHousehold(name.trim() || 'Mi hogar', currency)
      setNewId(id)
      setSelectedContext(id)
      setStep('invite')
      showSuccess('Hogar creado.')
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <button
        onClick={() => (step === 'invite' ? router.push('/inicio') : router.back())}
        className="mb-6 inline-flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border"
        aria-label="Volver"
      >
        <ArrowLeft className="size-[18px]" />
      </button>

      {step === 'form' ? (
        <div className="flex flex-1 flex-col">
          <h1 className="text-balance text-3xl font-bold tracking-tight">Creá tu hogar</h1>
          <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
            Un espacio para los gastos y ahorros que comparten. Podés cambiar la moneda más
            adelante.
          </p>

          <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
            <div className="space-y-6">
              <Field label="Nombre del hogar" htmlFor="hname">
                <input
                  id="hname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej. Casa Pocitos"
                  className={inputClass}
                  autoFocus
                />
              </Field>

              <Field label="Moneda por defecto">
                <CurrencySelect value={currency} onChange={setCurrency} />
              </Field>
            </div>

            <div className="mt-auto pt-8">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px"
              >
                Crear hogar
                <ArrowRight className="size-[18px]" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <PartyPopper className="size-6" />
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight">
            ¡Listo, {name || 'tu hogar'} existe!
          </h1>
          <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
            Invitá a quienes viven con vos. Podés saltear este paso y hacerlo cuando quieras.
          </p>

          <div className="mt-8 flex-1">
            {newId && <InviteManager householdId={newId} />}
          </div>

          <div className="mt-8 flex flex-col gap-2">
            <button
              onClick={() => router.push('/inicio')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm"
            >
              Ir al inicio
              <ArrowRight className="size-[18px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
