'use client'

import { useState } from 'react'
import { ArrowRight, HandCoins, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { computeBalances, computeSettlements } from '@/lib/balance'
import { Money } from '@/components/money'
import { MonthNav } from '@/components/month-nav'
import { PersonAvatar } from '@/components/person-avatar'
import { RepaymentForm } from '@/components/repayment-form'
import { Sheet } from '@/components/sheet'
import { currentMonthCursor, formatRelative, isSameMonthCursor, monthCursorEndIso, monthCursorLabel, parseLocalDate } from '@/lib/format'
import { showError, showSuccess } from '@/lib/toast'
import type { Repayment } from '@/lib/types'
import { cn } from '@/lib/utils'

export function BalanceCard() {
  const { activeHousehold, members, expenses, repayments, householdBalances, ensureMonthLoaded, currentUserId, getMember, addRepayment, updateRepayment, deleteRepayment, busy } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Repayment>()
  const currentMonth = currentMonthCursor()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  if (!activeHousehold) return null

  const householdMembers = activeHousehold.memberIds.map((id) => members.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
  const householdExpenses = expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold.id)
  const householdRepayments = repayments.filter((r) => r.householdId === activeHousehold.id)
  // Balance de cuenta corriente sobre TODO el historial — se calcula en el
  // servidor (get_household_balances), no sumando client-side, porque
  // householdExpenses/householdRepayments arriba están acotados a la
  // ventana reciente que carga loadData() (ver lib/store.tsx).
  const balances = householdBalances.filter((b) => b.householdId === activeHousehold.id)
  const currencies = [...new Set(balances.map((b) => b.currency))]
  const activeBalance = balances.find((b) => b.memberId === currentUserId && b.currency === activeHousehold.currency)
  const settlements = currencies.flatMap((currency) => computeSettlements(balances, currency))
  const otherCurrencies = currencies.filter((currency) => currency !== activeHousehold.currency)
  const filteredExpenses = householdExpenses.filter((e) => {
    const d = parseLocalDate(e.date)
    return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month
  })
  const activeExpensesTotal = filteredExpenses.filter((e) => e.currency === activeHousehold.currency).reduce((s, e) => s + e.amount, 0)
  const myNet = activeBalance?.net ?? 0
  const settled = Math.abs(myNet) < 0.01
  const isCurrentMonth = isSameMonthCursor(selectedMonth, currentMonth)

  // Cuánto de ese total es de este mes vs. de antes — el mes actual siempre
  // está en la ventana cargada, así que computeBalances (client-side, solo
  // sobre ese mes) sigue sirviendo acá; "de antes" sale de restarle eso al
  // total ya agregado en el servidor. Esto es específico del mes REAL
  // actual (no de selectedMonth) — es "cuánto arrastrabas al arrancar este
  // mes vs. cuánto pasó recién".
  const currentMonthNet = computeBalances(householdMembers, householdExpenses, householdRepayments, currentMonth)
    .balances.find((b) => b.memberId === currentUserId && b.currency === activeHousehold.currency)?.net ?? 0
  const pastNet = myNet - currentMonthNet
  const showPastBalance = isCurrentMonth && Math.abs(pastNet) >= 0.01

  // Al navegar a un mes VIEJO con las flechas, el número grande de arriba
  // sigue mostrando tu saldo real de HOY (myNet) — a propósito, es el único
  // accionable con "Registrar pago". Para no confundir "hoy" con "ese mes",
  // esta otra línea calcula tu saldo tal cual estaba A FIN de ese mes
  // puntual: el total de hoy menos todo lo que pasó DESPUÉS de ese mes
  // (siempre en la ventana cargada, porque ensureMonthLoaded ya garantiza
  // todo desde selectedMonth hasta hoy). Si selectedMonth es el mes actual
  // da lo mismo que myNet, así que no hace falta mostrarla dos veces.
  const netAfterSelectedMonth = isCurrentMonth
    ? 0
    : computeBalances(
        householdMembers,
        householdExpenses.filter((e) => e.date > monthCursorEndIso(selectedMonth)),
        householdRepayments.filter((r) => r.date > monthCursorEndIso(selectedMonth)),
      ).balances.find((b) => b.memberId === currentUserId && b.currency === activeHousehold.currency)?.net ?? 0
  const balanceAtSelectedMonthEnd = myNet - netAfterSelectedMonth
  const showBalanceAtSelectedMonthEnd = !isCurrentMonth && Math.abs(balanceAtSelectedMonthEnd) >= 0.01

  function handleMonthChange(month: typeof selectedMonth) {
    void ensureMonthLoaded(month)
    setSelectedMonth(month)
  }

  async function save(data: Omit<Repayment, 'id' | 'createdById'>) {
    try { await addRepayment(data); showSuccess('Pago registrado.'); setAdding(false) } catch (error) { showError(error) }
  }
  async function update(data: Omit<Repayment, 'id' | 'createdById'>) {
    if (!editing) return
    try { await updateRepayment(editing.id, data); showSuccess('Pago actualizado.'); setEditing(undefined) } catch (error) { showError(error) }
  }
  async function remove() {
    if (!editing) return
    try { await deleteRepayment(editing.id); showSuccess('Pago eliminado.'); setEditing(undefined) } catch (error) { showError(error) }
  }

  return <>
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm" aria-labelledby="balance-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="balance-heading" className="text-sm font-medium text-muted-foreground">
          Balance en {activeHousehold.name}
        </h2>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', settled ? 'bg-muted text-muted-foreground' : myNet > 0 ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-destructive')}>{settled ? 'Al día' : myNet > 0 ? 'Te deben' : 'Debés'}</span>
      </div>
      <Money amount={Math.abs(myNet)} currency={activeHousehold.currency} className={cn('mt-3 block text-[44px] text-center leading-none', settled ? 'text-foreground' : myNet > 0 ? 'text-positive' : 'text-destructive')} />
      <p className="mt-2 text-sm text-pretty text-muted-foreground">{settled ? 'No hay saldo pendiente en esta moneda.' : myNet > 0 ? 'Es lo que el resto del hogar te debe.' : 'Es lo que le debés al resto del hogar.'}</p>
      {showPastBalance && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Saldo anterior: {pastNet > 0 ? 'te debían' : 'debías'}{' '}
          <Money
            amount={Math.abs(pastNet)}
            currency={activeHousehold.currency}
            className={cn('font-semibold', pastNet > 0 ? 'text-positive' : 'text-destructive')}
          />
        </p>
      )}
      {showBalanceAtSelectedMonthEnd && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Saldo a fin de {monthCursorLabel(selectedMonth)}: {balanceAtSelectedMonthEnd > 0 ? 'te debían' : 'debías'}{' '}
          <Money
            amount={Math.abs(balanceAtSelectedMonthEnd)}
            currency={activeHousehold.currency}
            className={cn('font-semibold', balanceAtSelectedMonthEnd > 0 ? 'text-positive' : 'text-destructive')}
          />
        </p>
      )}
      <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground"><Plus className="size-4" />Registrar pago</button>
      {settlements.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Para saldar cuentas</p>
          <ul className="flex flex-col gap-2">
            {settlements.map((s, i) => {
              const from = getMember(s.fromId)
              const to = getMember(s.toId)
              if (!from || !to) return null
              const owedByMe = s.fromId === currentUserId
              const owedToMe = s.toId === currentUserId
              return (
                <li key={i} className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2.5">
                  <PersonAvatar member={from} size="sm" />
                  <span className="min-w-0 truncate text-sm font-medium">{from.name}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <PersonAvatar member={to} size="sm" />
                  <span className="min-w-0 truncate text-sm font-medium">{to.name}</span>
                  <Money
                    amount={s.amount}
                    currency={s.currency}
                    className={cn('ml-auto shrink-0 text-sm font-semibold', owedByMe ? 'text-destructive' : owedToMe ? 'text-positive' : 'text-foreground')}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {otherCurrencies.length > 0 && <div className="mt-3 space-y-1 text-xs text-muted-foreground"><p>También hay saldos separados:</p>{otherCurrencies.map((currency) => { const balance = balances.find((b) => b.memberId === currentUserId && b.currency === currency); return <p key={currency}><span className="font-semibold text-foreground">{currency}</span>: <Money amount={balance?.net ?? 0} currency={currency} sign className={(balance?.net ?? 0) >= 0 ? 'text-positive' : 'text-destructive'} /></p> })}</div>}
      <div className="mt-5 border-t border-border pt-4">
        <MonthNav value={selectedMonth} onChange={handleMonthChange} />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Gasto compartido {isCurrentMonth ? 'este mes' : 'del mes'} en {activeHousehold.currency}:{' '}
          <Money amount={activeExpensesTotal} currency={activeHousehold.currency} className="text-xs font-semibold text-foreground" />
        </p>
      </div>
    </section>
    {householdRepayments.length > 0 && (
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2"><HandCoins className="size-4 text-primary" /><h3 className="font-semibold">Pagos registrados</h3></div>
        <ul className="mt-3 space-y-2">
          {householdRepayments.slice(0, 5).map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{getMember(r.fromId)?.name} le pagó a {getMember(r.toId)?.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{formatRelative(r.date, r.createdAt)}</p>
              </div>
              <Money amount={r.amount} currency={r.currency} className="shrink-0 font-semibold" />
              <button onClick={() => setEditing(r)} disabled={busy} aria-label="Editar pago" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"><Pencil className="size-3.5" /></button>
              <button onClick={async () => { try { await deleteRepayment(r.id); showSuccess('Pago eliminado.') } catch (error) { showError(error) } }} disabled={busy} aria-label="Eliminar pago" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button>
            </li>
          ))}
        </ul>
      </section>
    )}
    <Sheet open={adding} onClose={() => setAdding(false)} title="Registrar pago"><RepaymentForm onSubmit={save} onCancel={() => setAdding(false)} /></Sheet>
    <Sheet open={!!editing} onClose={() => setEditing(undefined)} title="Editar pago">{editing && <RepaymentForm key={editing.id} initial={editing} onSubmit={update} onCancel={() => setEditing(undefined)} onDelete={remove} />}</Sheet>
  </>
}
