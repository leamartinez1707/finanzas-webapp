'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { House, Check, X, TriangleAlert } from 'lucide-react'
import { Logo } from '@/components/brand'
import { PersonAvatar, AvatarStack } from '@/components/person-avatar'
import { useApp } from '@/lib/store'

export default function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()
  const { getHousehold, members, setSelectedContext } = useApp()
  const [rejected, setRejected] = useState(false)

  const expired = token === 'expirada'
  // Prototipo: la invitación apunta al hogar Casa Pocitos
  const household = getHousehold('h-casa')
  const inviter = members.find((m) => m.id === 'm-mateo')
  const householdMembers =
    household?.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean) ?? []

  if (expired) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-3xl bg-destructive/12 text-destructive">
          <TriangleAlert className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Invitación expirada</h1>
        <p className="mt-2 max-w-xs text-pretty leading-relaxed text-muted-foreground">
          Este link ya no es válido. Pedile a quien te invitó que te mande uno nuevo.
        </p>
        <button
          onClick={() => router.push('/bienvenida')}
          className="mt-6 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Volver
        </button>
      </div>
    )
  }

  if (rejected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold tracking-tight">Invitación rechazada</h1>
        <p className="mt-2 max-w-xs text-pretty leading-relaxed text-muted-foreground">
          No hay problema. Podés crear tu propio hogar cuando quieras.
        </p>
        <button
          onClick={() => router.push('/bienvenida')}
          className="mt-6 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Continuar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
          <House className="size-8" />
        </span>
        <p className="mt-5 text-muted-foreground">
          {inviter && (
            <span className="inline-flex items-center gap-1.5 align-middle">
              <PersonAvatar member={inviter} size="xs" />
              <span className="font-medium text-foreground">{inviter.name}</span>
            </span>
          )}{' '}
          te invitó a
        </p>
        <h1 className="mt-1 text-balance text-3xl font-bold tracking-tight">
          {household?.name}
        </h1>

        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-6 py-5">
          <AvatarStack members={householdMembers} size="md" />
          <p className="text-sm text-muted-foreground">
            {householdMembers.length} personas ya comparten los gastos acá.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-2">
        <button
          onClick={() => {
            setSelectedContext('h-casa')
            router.push('/inicio')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px"
        >
          <Check className="size-5" />
          Aceptar y unirme
        </button>
        <button
          onClick={() => setRejected(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-5" />
          Rechazar
        </button>
      </div>
    </div>
  )
}
