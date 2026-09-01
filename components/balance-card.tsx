'use client'

import { useState } from 'react'
import { ArrowRight, HandCoins, History, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { computeBalances, computeSettlements } from '@/lib/balance'
import { Money } from '@/components/money'
import { MonthNav } from '@/components/month-nav'
import { PersonAvatar } from '@/components/person-avatar'
import { RepaymentForm } from '@/components/repayment-form'
import { Sheet } from '@/components/sheet'
import { currentMonthCursor, isSameMonthCursor, prevMonthCursor } from '@/lib/format'
import { showError, showSuccess } from '@/lib/toast'
import type { Repayment } from '@/lib/types'
import { cn } from '@/lib/utils'

export function BalanceCard() {
  const { activeHousehold, members, expenses, repayments, currentUserId, getMember, addRepayment, updateRepayment, deleteRepayment } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Repayment>()
  const currentMonth = currentMonthCursor()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  if (!activeHousehold) return null

  const householdMembers = activeHousehold.memberIds.map((id) => members.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
  const householdExpenses = expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold.id)
  const householdRepayments = repayments.filter((r) => r.householdId === activeHousehold.id)
  const { balances, currencies } = computeBalances(householdMembers, householdExpenses, householdRepayments, selectedMonth)
  const activeBalance = balances.find((b) => b.memberId === currentUserId && b.currency === activeHousehold.currency)
  const settlements = currencies.flatMap((currency) => computeSettlements(balances, currency))
  const otherCurrencies = currencies.filter((currency) => currency !== activeHousehold.currency)
  const filteredExpenses = householdExpenses.filter((e) => {
    const d = new Date(e.date)
    return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month
  })
  const activeExpensesTotal = filteredExpenses.filter((e) => e.currency === activeHousehold.currency).reduce((s, e) => s + e.amount, 0)
  const myNet = activeBalance?.net ?? 0
  const settled = Math.abs(myNet) < 0.01
  const isCurrentMonth = isSameMonthCursor(selectedMonth, currentMonth)

  // Fixed to the real previous calendar month (not relative to selectedMonth)
  // — a subtle reminder on the home screen that last month's balance is
  // still open, independent of whichever month the card happens to be
  // showing. Only surfaced while looking at the current month, so it
  // doesn't compound into "anterior a lo anterior" confusion when paging back.
  const prevMonth = prevMonthCursor(currentMonth)
  const prevNet = computeBalances(householdMembers, householdExpenses, householdRepayments, prevMonth)
    .balances.find((b) => b.memberId === currentUserId && b.currency === activeHousehold.currency)?.net ?? 0
  const showPrevBalance = isCurrentMonth && Math.abs(prevNet) >= 0.01

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
          Balance {isCurrentMonth ? 'del mes' : 'mensual'} en {activeHousehold.name}
        </h2>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', settled ? 'bg-muted text-muted-foreground' : myNet > 0 ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-destructive')}>{settled ? 'Al día' : myNet > 0 ? 'Te deben' : 'Debés'}</span>
      </div>
      <div className="mt-3">
        <MonthNav value={selectedMonth} onChange={setSelectedMonth} />
      </div>
      <Money amount={Math.abs(myNet)} currency={activeHousehold.currency} className={cn('mt-3 block text-[44px] text-center leading-none', settled ? 'text-foreground' : myNet > 0 ? 'text-positive' : 'text-destructive')} />
      <p className="mt-2 text-sm text-pretty text-muted-foreground">{settled ? 'No hay saldo pendiente este mes en esta moneda.' : myNet > 0 ? 'Es lo que el resto del hogar te debe este mes.' : 'Es lo que le debés al resto del hogar este mes.'}</p>
      {showPrevBalance && (
        <button
          onClick={() => setSelectedMonth(prevMonth)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <History className="size-3.5" />
          Saldo anterior: {prevNet > 0 ? 'te debían' : 'debías'}{' '}
          <Money amount={Math.abs(prevNet)} currency={activeHousehold.currency} className="font-semibold text-foreground" />
        </button>
      )}
      <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground"><Plus className="size-4" />Registrar pago</button>
      {settlements.length > 0 && <ul className="mt-5 flex flex-col gap-2">{settlements.map((s, i) => { const from = getMember(s.fromId); const to = getMember(s.toId); if (!from || !to) return null; return <li key={i} className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5"><PersonAvatar member={from} size="sm" /><ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /><PersonAvatar member={to} size="sm" /><span className="ml-1 min-w-0 truncate text-sm"><b>{from.name}</b> le paga a <b>{to.name}</b></span><Money amount={s.amount} currency={s.currency} className="ml-auto text-sm font-semibold" /></li> })}</ul>}
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Gasto compartido {isCurrentMonth ? 'este mes' : 'del mes'} en {activeHousehold.currency}: <Money amount={activeExpensesTotal} currency={activeHousehold.currency} className="text-xs font-semibold text-foreground" /></p>
      {otherCurrencies.length > 0 && <div className="mt-3 space-y-1 text-xs text-muted-foreground"><p>También hay saldos separados:</p>{otherCurrencies.map((currency) => { const balance = balances.find((b) => b.memberId === currentUserId && b.currency === currency); return <p key={currency}><span className="font-semibold text-foreground">{currency}</span>: <Money amount={balance?.net ?? 0} currency={currency} sign className={(balance?.net ?? 0) >= 0 ? 'text-positive' : 'text-destructive'} /></p> })}</div>}
    </section>
    {householdRepayments.length > 0 && <section className="mt-4 rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2"><HandCoins className="size-4 text-primary" /><h3 className="font-semibold">Pagos registrados</h3></div><ul className="mt-3 space-y-2">{householdRepayments.slice(0, 5).map((r) => <li key={r.id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{getMember(r.fromId)?.name} le pagó a {getMember(r.toId)?.name}</span><Money amount={r.amount} currency={r.currency} className="font-semibold" /><button onClick={() => setEditing(r)} aria-label="Editar pago" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><Pencil className="size-3.5" /></button><button onClick={async () => { try { await deleteRepayment(r.id); showSuccess('Pago eliminado.') } catch (error) { showError(error) } }} aria-label="Eliminar pago" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3.5" /></button></li>)}</ul></section>}
    <Sheet open={adding} onClose={() => setAdding(false)} title="Registrar pago"><RepaymentForm onSubmit={save} onCancel={() => setAdding(false)} /></Sheet>
    <Sheet open={!!editing} onClose={() => setEditing(undefined)} title="Editar pago">{editing && <RepaymentForm key={editing.id} initial={editing} onSubmit={update} onCancel={() => setEditing(undefined)} onDelete={remove} />}</Sheet>
  </>
}
