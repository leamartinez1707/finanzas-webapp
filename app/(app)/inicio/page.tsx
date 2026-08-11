'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Plus, Receipt, Sparkles, Check, LogOut, Bell } from 'lucide-react'
import { useApp } from '@/lib/store'
import { buildActivity } from '@/lib/activity'
import { isThisMonth } from '@/lib/format'
import { BalanceCard } from '@/components/balance-card'
import { ActivityRow } from '@/components/activity-row'
import { GoalCard, goalSaved } from '@/components/goal-card'
import { Money } from '@/components/money'
import { PersonAvatar } from '@/components/person-avatar'
import { SectionTitle } from '@/components/screen-header'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'
import { PERSON_COLORS } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { PersonColor } from '@/lib/types'

export default function InicioPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    loading,
    members,
    expenses,
    goals,
    savings,
    updateProfile,
  } = useApp()

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileColor, setProfileColor] = useState<PersonColor>('person-1')
  const [pendingInvites, setPendingInvites] = useState<any[]>([])

  useEffect(() => {
    import('@/lib/supabase/queries').then(({ getMyPendingInvites }) => {
      getMyPendingInvites().then(setPendingInvites)
    })
  }, [])

  if (loading || !currentUser) return null

  function openProfile() {
    if (!currentUser) return
    setProfileName(currentUser.name)
    setProfileColor(currentUser.color)
    setProfileOpen(true)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    await updateProfile(profileName.trim() || 'Yo', profileColor)
    setProfileOpen(false)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const scopeFilter = isPersonal
    ? ({ scope: 'personal', ownerId: currentUser!.id } as const)
    : ({ scope: 'household', householdId: activeHousehold!.id } as const)

  const activity = buildActivity(
    { expenses, goals, savings, members, baseCurrency: activeCurrency },
    scopeFilter,
  ).slice(0, 5)

  // personal month spend
  const personalMonth = expenses
    .filter((e) => e.scope === 'personal' && e.ownerId === currentUser?.id && isThisMonth(e.date))
    .reduce((s, e) => s + e.amount, 0)

  const personalSavings = savings
    .filter((s) => s.scope === 'personal' && s.memberId === currentUser?.id)
    .reduce((sum, s) => sum + (s.type === 'deposito' ? s.amount : -s.amount), 0)

  const scopedGoals = goals.filter((g) =>
    isPersonal
      ? g.scope === 'personal' && g.ownerId === currentUser?.id
      : g.scope === 'household' && g.householdId === activeHousehold!.id,
  )
  const topGoal = [...scopedGoals].sort(
    (a, b) => goalSaved(b) / b.target - goalSaved(a) / a.target,
  )[0]

  return (
    <div className="space-y-4 px-1">

      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/8 p-4">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <p className="text-sm font-semibold text-primary">
              {pendingInvites.length} invitación{pendingInvites.length !== 1 && 'es'} pendiente{pendingInvites.length !== 1 && 's'}
            </p>
          </div>
          <div className="mt-2 space-y-2">
            {pendingInvites.map((inv) => (
              <Link
                key={inv.id}
                href={`/invitacion/${inv.token}`}
                className="flex items-center justify-between rounded-xl bg-card p-2.5 ring-1 ring-border"
              >
                <span className="text-sm font-medium">
                  Te invitaron a <strong>{(inv.household as any)?.nombre}</strong>
                </span>
                <span className="text-xs font-semibold text-primary">Ver →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting()}, {currentUser?.name.split(' ')[0]}
          </p>
          <h1 className="text-pretty text-2xl font-bold tracking-tight">
            {isPersonal ? 'Tus finanzas' : activeHousehold?.name}
          </h1>
        </div>
        <button onClick={openProfile}>
          {currentUser && <PersonAvatar member={currentUser} size="lg" />}
        </button>
      </header>

      {isPersonal ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-[28px] border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Gasto del mes</p>
            <Money
              amount={personalMonth}
              currency={activeCurrency}
              className="mt-1.5 block text-3xl text-destructive"
            />
          </div>
          <div className="rounded-[28px] border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Ahorros</p>
            <Money
              amount={personalSavings}
              currency={activeCurrency}
              className="mt-1.5 block text-3xl text-positive"
            />
          </div>
        </div>
      ) : (
        <BalanceCard />
      )}

      <div className="grid grid-cols-2 gap-3 md:w-auto">
        <Link
          href="/gastos?nuevo=1"
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-transform active:translate-y-px"
        >
          <Plus className="size-5" />
          Nuevo gasto
        </Link>
        <Link
          href="/objetivos"
          className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-muted"
        >
          <Sparkles className="size-5 text-primary" />
          Objetivos
        </Link>
      </div>

      {topGoal && (
        <section>
          <SectionTitle
            action={
              <Link href="/objetivos" className="text-sm font-medium text-primary">
                Ver todos
              </Link>
            }
          >
            Objetivo destacado
          </SectionTitle>
          <GoalCard goal={topGoal} baseCurrency={activeCurrency} />
        </section>
      )}

      <section>
        <SectionTitle
          action={
            <Link
              href="/historial"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Historial
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          Actividad reciente
        </SectionTitle>
        {activity.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} baseCurrency={activeCurrency} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Receipt}
            title="Todavía no hay movimientos"
            description="Cuando registres un gasto, un aporte o un ahorro, va a aparecer acá."
          />
        )}
      </section>

      {/* Profile sheet */}
      <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Tu perfil">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Nombre" htmlFor="profile-name">
            <input
              id="profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Color">
            <div className="flex flex-wrap gap-3">
              {PERSON_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProfileColor(c)}
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-full transition-transform',
                    profileColor === c
                      ? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background'
                      : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: `var(--${c})` }}
                >
                  {profileColor === c && <Check className="size-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="flex-1 rounded-xl border border-border py-3 font-semibold text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
            >
              Guardar
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
