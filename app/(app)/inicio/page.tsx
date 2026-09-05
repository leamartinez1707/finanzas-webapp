'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Plus, Receipt, Sparkles, Check, LogOut, Bell, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { buildActivity } from '@/lib/activity'
import { computeRealSpend, expenseShare } from '@/lib/balance'
import { isThisMonth } from '@/lib/format'
import { BalanceCard } from '@/components/balance-card'
import { ActivityRow } from '@/components/activity-row'
import { GoalCard, goalSaved } from '@/components/goal-card'
import { Money } from '@/components/money'
import { OtherCurrencySpendNote } from '@/components/other-currency-spend-note'
import { PersonAvatar } from '@/components/person-avatar'
import { SectionTitle } from '@/components/screen-header'
import { SpendBreakdownNote } from '@/components/spend-breakdown-note'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { Field, inputClass } from '@/components/field'
import { RepaymentForm } from '@/components/repayment-form'
import { PERSON_COLORS } from '@/lib/categories'
import { signOut } from '@/lib/supabase/queries'
import { cn } from '@/lib/utils'
import type { Expense, PersonColor, Repayment } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'

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
    repayments,
    myHouseholds,
    busy,
    updateProfile,
    setDefaultContext,
    addRepayment,
  } = useApp()

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileColor, setProfileColor] = useState<PersonColor>('person-1')
  const [profileDefaultContext, setProfileDefaultContext] = useState('personal')
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [payingExpense, setPayingExpense] = useState<Expense>()

  useEffect(() => {
    import('@/lib/supabase/queries').then(({ getMyPendingInvites }) => {
      getMyPendingInvites().then(setPendingInvites)
    }).catch(showError)
  }, [])

  if (loading || !currentUser) return null

  function openProfile() {
    if (!currentUser) return
    setProfileName(currentUser.name)
    setProfileColor(currentUser.color)
    setProfileDefaultContext(currentUser.defaultContext ?? 'personal')
    setProfileOpen(true)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateProfile(profileName.trim() || 'Yo', profileColor)
      await setDefaultContext(profileDefaultContext)
      showSuccess('Perfil actualizado.')
      setProfileOpen(false)
    } catch (error) {
      showError(error)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      showError(error)
    }
  }

  async function handlePay(data: Omit<Repayment, 'id' | 'createdById'>) {
    try {
      await addRepayment(data)
      showSuccess('Pago registrado.')
      setPayingExpense(undefined)
    } catch (error) {
      showError(error)
    }
  }

  const householdMembers = activeHousehold
    ? activeHousehold.memberIds.map((id) => members.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
    : []

  const scopeFilter = isPersonal
    ? ({ scope: 'personal', ownerId: currentUser!.id } as const)
    : ({ scope: 'household', householdId: activeHousehold!.id } as const)

  const activity = buildActivity(
    { expenses, goals, savings, repayments, members, baseCurrency: activeCurrency },
    scopeFilter,
  ).slice(0, 5)

  // real spend: gastos personales + mi parte (no lo que adelanté) de cada
  // hogar al que pertenezco, para que "Disponible"/"Gasto del mes" no
  // ignoren la plata que sale del bolsillo como parte de un gasto
  // compartido. Bucketeado por moneda — se compara contra activeCurrency y
  // los hogares en otra moneda se muestran aparte, sin mezclar (no hay
  // conversión de moneda en la app).
  const monthSpend = currentUser ? computeRealSpend(expenses, myHouseholds, currentUser.id, isThisMonth) : undefined
  const allTimeSpend = currentUser ? computeRealSpend(expenses, myHouseholds, currentUser.id) : undefined

  const personalMonth = monthSpend?.totalByCurrency[activeCurrency] ?? 0

  // net income entered (deposits minus withdrawals) — this is the money the
  // user actually has to cover expenses with, not a separate savings pot
  const personalIncome = savings
    .filter((s) => s.scope === 'personal' && s.memberId === currentUser?.id)
    .reduce((sum, s) => sum + (s.type === 'deposito' ? s.amount : -s.amount), 0)

  // total ever spent (personal + mi parte en cada hogar, misma moneda), para
  // netear contra ingresos y mostrar lo que de verdad queda
  const personalExpensesTotal = allTimeSpend?.totalByCurrency[activeCurrency] ?? 0

  const personalAvailable = personalIncome - personalExpensesTotal

  // desglose para "Gasto del mes": personal + mi parte de cada hogar en la
  // misma moneda que la vista personal
  const monthContributors = [
    { label: 'Personal', amount: monthSpend?.personal[activeCurrency] ?? 0 },
    ...(monthSpend?.households ?? [])
      .filter((h) => h.currency === activeCurrency)
      .map((h) => ({ label: h.householdName, amount: h.myShare })),
  ]

  // hogares en otra moneda: no se netean, se muestran aparte
  const otherCurrencyMonthSpend = (monthSpend?.households ?? []).filter((h) => h.currency !== activeCurrency)

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

      <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-8">
        <div>
          {isPersonal ? (
            <div className="space-y-3">
              <div className="@container min-w-0 rounded-[28px] border border-border bg-card p-5 text-center sm:p-6">
                <p className="text-xs font-medium text-muted-foreground">Disponible</p>
                <Money
                  amount={personalAvailable}
                  currency={activeCurrency}
                  className={cn(
                    'mt-1.5 block text-[clamp(1.75rem,16cqw,2.5rem)] leading-tight [overflow-wrap:anywhere]',
                    personalAvailable >= 0 ? 'text-positive' : 'text-destructive',
                  )}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {myHouseholds.length > 0
                    ? 'Ingresos menos lo gastado (personal y tu parte en cada hogar)'
                    : 'Ingresos menos lo gastado'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="@container min-w-0 rounded-[28px] border border-border bg-card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Gasto del mes</p>
                  <Money
                    amount={personalMonth}
                    currency={activeCurrency}
                    className="mt-1.5 block text-[clamp(1.25rem,14cqw,1.875rem)] leading-tight [overflow-wrap:anywhere] text-destructive"
                  />
                  <SpendBreakdownNote contributors={monthContributors} currency={activeCurrency} />
                </div>
                <div className="@container min-w-0 rounded-[28px] border border-border bg-card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Ingresos</p>
                  <Money
                    amount={personalIncome}
                    currency={activeCurrency}
                    className="mt-1.5 block text-[clamp(1.25rem,14cqw,1.875rem)] leading-tight [overflow-wrap:anywhere] text-positive"
                  />
                </div>
              </div>
              <OtherCurrencySpendNote households={otherCurrencyMonthSpend} periodLabel="este mes" />
            </div>
          ) : (
            <BalanceCard />
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 md:w-auto">
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
            <section className="mt-6">
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
        </div>

        <section className="mt-6 lg:mt-0">
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
          <Link
            href="/resumen"
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Ver resumen del mes
            <ArrowRight className="size-3.5" />
          </Link>
          {activity.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {activity.map((item) => {
                const relatedExpense = item.kind === 'gasto' ? expenses.find((e) => e.id === item.id) : undefined
                const canPay = relatedExpense
                  && relatedExpense.scope === 'household'
                  && relatedExpense.payerId !== currentUser?.id
                  && currentUser
                  && expenseShare(relatedExpense, currentUser.id, householdMembers.length) > 0
                return (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    baseCurrency={activeCurrency}
                    onClick={canPay ? () => setPayingExpense(relatedExpense) : undefined}
                  />
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={Receipt}
              title="Todavía no hay movimientos"
              description="Cuando registres un gasto, un aporte o un ingreso, va a aparecer acá."
            />
          )}
        </section>
      </div>

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

          <Field label="Contexto por defecto al abrir la app" htmlFor="profile-default-context">
            <select
              id="profile-default-context"
              value={profileDefaultContext}
              onChange={(e) => setProfileDefaultContext(e.target.value)}
              className={inputClass}
            >
              <option value="personal">Mis finanzas</option>
              {myHouseholds.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              disabled={busy}
              className="flex-1 rounded-xl border border-border py-3 font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </span>
              ) : 'Guardar'}
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </form>
      </Sheet>

      {/* Pay-my-share sheet, triggered from an activity row */}
      <Sheet open={!!payingExpense} onClose={() => setPayingExpense(undefined)} title="Pagar mi parte">
        {payingExpense && currentUser && (
          <RepaymentForm
            key={payingExpense.id}
            prefill={{
              fromId: currentUser.id,
              toId: payingExpense.payerId,
              currency: payingExpense.currency,
              expenseId: payingExpense.id,
              amount: expenseShare(payingExpense, currentUser.id, householdMembers.length),
            }}
            onSubmit={handlePay}
            onCancel={() => setPayingExpense(undefined)}
          />
        )}
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
