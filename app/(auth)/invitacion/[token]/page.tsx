'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { House, Check, X, TriangleAlert, Loader2 } from 'lucide-react'
import { Logo } from '@/components/brand'
import { PersonAvatar, AvatarStack } from '@/components/person-avatar'
import { useApp } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { showError, showSuccess } from '@/lib/toast'
import type { PersonColor } from '@/lib/types'

interface InvitePreview {
  id: string
  household_id: string
  estado: string
  expira_en: string
  email_invitado: string
}

export default function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const { refresh, setSelectedContext } = useApp()

  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [invite, setInvite] = useState<InvitePreview | null>(null)
  const [household, setHousehold] = useState<{ nombre: string } | null>(null)
  const [inviter, setInviter] = useState<{ nombre: string; color: PersonColor } | null>(null)
  const [householdMembers, setHouseholdMembers] = useState<any[]>([])
  const [needsAuth, setNeedsAuth] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Check if user is already logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        // Look up the invite preview by token (RPC — works for anonymous visitors)
        const { data, error: rpcError } = await supabase.rpc('get_invite_preview', { p_token: token })
        if (rpcError) throw rpcError

        const row = data?.[0]
        if (!row) {
          setExpired(true)
          return
        }

        const inv: InvitePreview = {
          id: row.invite_id,
          household_id: row.household_id,
          estado: row.estado,
          expira_en: row.expira_en,
          email_invitado: row.email_invitado,
        }

        if (inv.estado === 'expirada' || new Date(inv.expira_en) < new Date()) {
          if (inv.estado !== 'expirada') {
            // Best-effort status flip: RLS may reject this for an anonymous or
            // not-yet-a-member visitor. The UI already treats it as expired
            // based on the timestamp regardless of whether this write succeeds.
            try {
              await supabase.from('household_invites').update({ estado: 'expirada' }).eq('id', inv.id)
            } catch {
              // Ignore — see comment above.
            }
          }
          setExpired(true)
          return
        }

        // If already accepted
        if (inv.estado === 'aceptada') {
          setExpired(true)
          return
        }

        setInvite(inv)
        setHousehold({ nombre: row.household_name })
        setInviter(row.inviter_name ? { nombre: row.inviter_name, color: row.inviter_color as PersonColor } : null)
        setHouseholdMembers(row.members ?? [])

        // Use the session we already checked at the top
        setNeedsAuth(!session?.user)
      } catch (error) {
        setLoadError(true)
        showError(error)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token, supabase, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold tracking-tight">No pudimos cargar la invitación</h1>
        <p className="mt-2 max-w-xs text-pretty leading-relaxed text-muted-foreground">
          Intentá abrir este link nuevamente.
        </p>
      </div>
    )
  }

  async function handleAccept() {
    if (!invite) return

    try {
      // Check if user is logged in
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        // Redirect to register, then come back here
        router.push(`/ingresar?redirect=/invitacion/${token}`)
        return
      }

      if (user.email?.toLowerCase() !== invite.email_invitado.toLowerCase()) {
        showError(new Error('Esta invitación fue enviada a otro email.'))
        return
      }

      // Add user as member first — the RLS insert policy requires the invite
      // to still be 'pendiente', so this must happen before flipping status.
      const { error: memberError } = await supabase.from('household_members').insert({
        household_id: invite.household_id,
        user_id: user.id,
      })
      if (memberError) {
        showError(memberError)
        return
      }

      // Now mark the invite as accepted
      const { error: inviteError } = await supabase
        .from('household_invites')
        .update({ estado: 'aceptada' })
        .eq('id', invite.id)
      if (inviteError) {
        showError(inviteError)
        return
      }

      showSuccess('Te sumaste al hogar.')
      setSelectedContext(invite.household_id)
      try {
        await refresh()
      } catch {
        // Non-fatal — the join itself already succeeded. Worst case,
        // /inicio shows slightly stale data until the next load.
      }
      router.push('/inicio')
    } catch (error) {
      showError(error)
    }
  }

  async function handleReject() {
    if (!invite) return

    try {
      const { error } = await supabase
        .from('household_invites')
        .update({ estado: 'rechazada' })
        .eq('id', invite.id)
      if (error) {
        showError(error)
        return
      }
      setRejected(true)
    } catch (error) {
      showError(error)
    }
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
              onClick={() => router.push(`/ingresar?redirect=/invitacion/${token}`)}
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
              onClick={handleReject}
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
