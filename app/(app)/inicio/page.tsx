'use client'

import Link from 'next/link'
import { ArrowRight, Plus, Receipt, Sparkles } from 'lucide-react'
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
  } = useApp()

  if (loading || !currentUser) return null

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
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting()}, {currentUser?.name.split(' ')[0]}
          </p>
          <h1 className="text-pretty text-2xl font-bold tracking-tight">
            {isPersonal ? 'Tus finanzas' : activeHousehold?.name}
          </h1>
        </div>
        {currentUser && <PersonAvatar member={currentUser} size="lg" />}
      </header>

      {isPersonal ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[28px] border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Gasto del mes</p>
            <Money
              amount={personalMonth}
              currency={activeCurrency}
              className="mt-1.5 block text-3xl text-negative"
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

      <div className="grid grid-cols-2 gap-3">
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
