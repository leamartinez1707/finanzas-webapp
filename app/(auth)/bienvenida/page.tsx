'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { House, Mail, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'

export default function BienvenidaPage() {
  const router = useRouter()
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')

  return (
    <div className="flex flex-1 flex-col justify-center">
      <Logo />
      <h1 className="mt-8 text-balance text-3xl font-bold tracking-tight">
        Todo listo. ¿Por dónde arrancamos?
      </h1>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
        Creá un hogar para compartir gastos, o sumate a uno con la invitación que te pasaron.
      </p>

      <div className="mt-8 space-y-4">
        <Link
          href="/crear-hogar"
          className="group flex items-center gap-4 rounded-3xl border border-primary/30 bg-primary/8 p-5 transition-colors hover:bg-primary/12"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <House className="size-6" />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-semibold">Crear un hogar</span>
            <span className="block text-sm text-muted-foreground">
              Invitás a tu pareja o roommates después.
            </span>
          </span>
          <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>

        <button
          onClick={() => setJoinOpen(true)}
          className="group flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/50"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Mail className="size-6" />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-semibold">Unirme con una invitación</span>
            <span className="block text-sm text-muted-foreground">
              Ya te sumaron a un hogar existente.
            </span>
          </span>
          <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <Sheet open={joinOpen} onClose={() => setJoinOpen(false)} title="Unirme a un hogar">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            router.push(`/invitacion/${code.trim() || 'demo'}`)
          }}
          className="space-y-4"
        >
          <Field label="Código o link de invitación" hint="Te lo comparte quien administra el hogar.">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej. nido.app/i/AB12CD"
              className={inputClass}
              autoFocus
            />
          </Field>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground"
          >
            Continuar
            <ArrowRight className="size-4.5" />
          </button>
        </form>
      </Sheet>
    </div>
  )
}
