'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { House, Check, X, TriangleAlert, Loader2 } from 'lucide-react'
import { Logo } from '@/components/brand'
import { PersonAvatar, AvatarStack } from '@/components/person-avatar'
import { useApp } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

export default function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [household, setHousehold] = useState<any>(null)
  const [inviter, setInviter] = useState<any>(null)
  const [householdMembers, setHouseholdMembers] = useState<any[]>([])
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    async function load() {
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession()

      // Look up the invite by token
      const { data: inv } = await supabase
        .from('household_invites')
        .select('*, household:households(*)')
        .eq('token', token)
        .single()

      if (!inv) {
        setExpired(true)
        setLoading(false)
        return
      }

      if (inv.estado === 'expirada' || new Date(inv.expira_en) < new Date()) {
        if (inv.estado !== 'expirada') {
          await supabase.from('household_invites').update({ estado: 'expirada' }).eq('id', inv.id)
        }
        setExpired(true)
        setLoading(false)
        return
      }

      // If already accepted
      if (inv.estado === 'aceptada') {
        setExpired(true)
        setLoading(false)
        return
      }

      setInvite(inv)
      setHousehold(inv.household)

      // Get inviter profile
      if (inv.invitado_por) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', inv.invitado_por)
          .single()
        setInviter(prof)
      }

      // Get members of the household
      const { data: memberships } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', inv.household_id)

      if (memberships) {
        const ids = memberships.map((m) => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ids)
        setHouseholdMembers(profiles ?? [])
      }

      // If user is logged in, auto-accept
      if (session?.user) {
        await supabase
          .from('household_invites')
          .update({ estado: 'aceptada' })
          .eq('id', inv.id)

        // Add user as member (ignore if already)
        await supabase.from('household_members').upsert({
          household_id: inv.household_id,
          user_id: session.user.id,
        }, { onConflict: 'household_id,user_id' })

        router.replace('/inicio')
        return
      }

      setNeedsAuth(true)
      setLoading(false)
    }
    load()
  }, [token, supabase, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleAccept() {
    if (!invite) return

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to register, then come back here
      router.push(`/?redirect=/invitacion/${token}`)
      return
    }

    // Accept the invite
    await supabase
      .from('household_invites')
      .update({ estado: 'aceptada' })
      .eq('id', invite.id)

    // Add user as member
    await supabase.from('household_members').insert({
      household_id: invite.household_id,
      user_id: user.id,
    })

    router.push('/inicio')
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
              <PersonAvatar member={{ name: inviter.nombre, color: inviter.color }} size="xs" />
              <span className="font-medium text-foreground">{inviter.nombre}</span>
            </span>
          )}{' '}
          te invitó a
        </p>
        <h1 className="mt-1 text-balance text-3xl font-bold tracking-tight">
          {household?.nombre}
        </h1>

        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-6 py-5">
          <AvatarStack members={householdMembers.map((p: any) => ({ name: p.nombre, color: p.color }))} size="md" />
          <p className="text-sm text-muted-foreground">
            {householdMembers.length} persona{householdMembers.length !== 1 && 's'} ya comparten los gastos acá.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-2">
        {needsAuth ? (
          <>
            <button
              onClick={() => router.push(`/?redirect=/invitacion/${token}`)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            >
              <Check className="size-5" />
              Registrate o iniciá sesión para aceptar
            </button>
            <button
              onClick={() => router.push('/bienvenida')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-5" />
              Rechazar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleAccept}
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
          </>
        )}
      </div>
    </div>
  )
}
