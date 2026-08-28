'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { expenseShare } from '@/lib/balance'
import { CurrencySelect } from '@/components/currency-select'
import { Field, inputClass } from '@/components/field'
import { PersonAvatar } from '@/components/person-avatar'
import { Money } from '@/components/money'
import type { CurrencyCode, Member, Repayment } from '@/lib/types'
import { cn } from '@/lib/utils'

const EXPENSE_RESULTS_LIMIT = 5

export function RepaymentForm({ initial, prefill, onSubmit, onCancel, onDelete }: {
  initial?: Repayment
  prefill?: Partial<Pick<Repayment, 'fromId' | 'toId' | 'amount' | 'currency' | 'expenseId' | 'date'>>
  onSubmit: (data: Omit<Repayment, 'id' | 'createdById'>) => void | Promise<void>
  onCancel?: () => void
  onDelete?: () => void
}) {
  const { activeHousehold, activeCurrency, members, expenses, currentUser } = useApp()
  const householdMembers = activeHousehold?.memberIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) ?? []
  const householdExpenses = expenses.filter((e) => e.scope === 'household' && e.householdId === activeHousehold?.id)
  const [fromId, setFromId] = useState(initial?.fromId ?? prefill?.fromId ?? currentUser?.id ?? '')
  const [toId, setToId] = useState(initial?.toId ?? prefill?.toId ?? householdMembers.find((m) => m?.id !== fromId)?.id ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : prefill?.amount ? String(prefill.amount) : '')
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? prefill?.currency ?? activeCurrency)
  const [date, setDate] = useState(initial?.date ?? prefill?.date ?? new Date().toISOString().slice(0, 10))
  const [expenseId, setExpenseId] = useState(initial?.expenseId ?? prefill?.expenseId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const compatibleExpenses = householdExpenses.filter((e) => e.currency === currency)

  const filteredExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return compatibleExpenses
    const q = expenseSearch.toLowerCase()
    return compatibleExpenses.filter((e) => e.description.toLowerCase().includes(q))
  }, [compatibleExpenses, expenseSearch])
  const visibleExpenses = filteredExpenses.slice(0, EXPENSE_RESULTS_LIMIT)
  const hasMoreExpenses = !expenseSearch.trim() && compatibleExpenses.length > EXPENSE_RESULTS_LIMIT

  useEffect(() => {
    if (expenseId && !compatibleExpenses.some((expense) => expense.id === expenseId)) {
      setExpenseId('')
    }
  }, [currency])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const value = Number(amount)
    if (!activeHousehold || !fromId || !toId || !householdMembers.some((m) => m?.id === fromId) || !householdMembers.some((m) => m?.id === toId)) return setError('Elegí dos personas del hogar')
    if (fromId === toId) return setError('El pagador y el receptor deben ser distintos')
    if (!Number.isFinite(value) || value <= 0) return setError('Ingresá un monto válido')
    setSubmitting(true)
    try {
      await onSubmit({ householdId: activeHousehold.id, fromId, toId, amount: value, currency, date, expenseId: expenseId || (initial ? null : undefined), note: note.trim() || undefined })
    } finally {
      setSubmitting(false)
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-3xl bg-muted/60 p-4 text-center">
      <label htmlFor="repayment-amount" className="text-xs font-medium text-muted-foreground">Monto real pagado</label>
      <input id="repayment-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setError('') }} placeholder="0" className="mt-1 w-full bg-transparent text-center font-display text-5xl font-semibold tracking-tight tnum outline-none placeholder:text-muted-foreground/40" />
      <div className="mt-3 flex justify-center"><CurrencySelect value={currency} onChange={setCurrency} compact /></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <MemberPicker label="Paga" value={fromId} onChange={setFromId} members={householdMembers} />
      <MemberPicker label="Recibe" value={toId} onChange={setToId} members={householdMembers} />
    </div>
    <Field label="Fecha" htmlFor="repayment-date"><input id="repayment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
    <div className="space-y-1.5">
      <label htmlFor="repayment-expense" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gasto relacionado <span className="normal-case font-normal">(Opcional)</span></label>
      <input
        id="repayment-expense"
        value={expenseSearch}
        onChange={(e) => { setExpenseSearch(e.target.value); setExpenseOpen(true) }}
        onFocus={() => setExpenseOpen(true)}
        onBlur={() => setTimeout(() => setExpenseOpen(false), 120)}
        placeholder="Buscar gasto..."
        className={inputClass}
      />
      {expenseId && (
        <p className="text-xs text-muted-foreground">
          Seleccionado: <span className="font-medium text-foreground">{compatibleExpenses.find((e) => e.id === expenseId)?.description ?? 'Pago general'}</span>
          <button type="button" onClick={() => { setExpenseId(''); setExpenseSearch('') }} className="ml-1 text-destructive hover:underline">quitar</button>
        </p>
      )}
      {!expenseId && (
        <p className="text-xs text-muted-foreground">Por defecto: <span className="font-medium text-foreground">Pago general</span></p>
      )}
      {expenseOpen && visibleExpenses.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-2xl border border-border bg-card divide-y divide-border">
          {visibleExpenses.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                if (expenseId === e.id) {
                  setExpenseId('')
                  setExpenseSearch('')
                } else {
                  setExpenseId(e.id)
                  setExpenseSearch(e.description)
                  setAmount(String(expenseShare(e, fromId, householdMembers.length)))
                }
                setExpenseOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60',
                expenseId === e.id && 'bg-primary/8',
              )}
            >
              <span className="truncate">{e.description}</span>
              <Money amount={e.amount} currency={e.currency} className="ml-2 shrink-0 text-xs font-semibold" />
            </button>
          ))}
        </div>
      )}
      {expenseOpen && hasMoreExpenses && (
        <p className="text-xs text-muted-foreground">Hay más gastos — escribí para buscar.</p>
      )}
    </div>
    <Field label="Nota" htmlFor="repayment-note" hint="Opcional"><input id="repayment-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: transferencia" className={inputClass} /></Field>
    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    <div className="flex gap-2 pt-1">{onCancel && <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-border py-3.5 font-semibold">Cancelar</button>}<button type="submit" disabled={submitting} className="flex-[2] rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Guardando...' : initial ? 'Guardar cambios' : 'Registrar pago'}</button></div>
    {initial && onDelete && <button type="button" onClick={onDelete} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3 font-medium text-destructive"><Trash2 className="size-4" />Eliminar pago</button>}
  </form>
}

function MemberPicker({ label, value, onChange, members }: { label: string; value: string; onChange: (id: string) => void; members: Array<Member | undefined> }) {
  return <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="flex flex-col gap-1.5">{members.map((m) => m && <button key={m.id} type="button" onClick={() => onChange(m.id)} className={cn('flex items-center gap-2 rounded-xl border p-2 text-left', value === m.id ? 'border-primary bg-primary/8' : 'border-border')}><PersonAvatar member={m} size="xs" /><span className="truncate text-xs font-medium">{m.name}</span></button>)}</div></div>
}
