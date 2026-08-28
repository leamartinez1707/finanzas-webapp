import { CURRENCIES } from './categories'
import type { CurrencyCode } from './types'

export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  opts: { decimals?: boolean; sign?: boolean } = {},
) {
  const { decimals = false, sign = false } = opts
  const symbol = CURRENCIES[currency].symbol
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(abs)
  const prefix = amount < 0 ? '-' : sign ? '+' : ''
  return `${prefix}${symbol}\u00A0${formatted}`
}

export function formatCompact(amount: number, currency: CurrencyCode) {
  const symbol = CURRENCIES[currency].symbol
  const formatted = new Intl.NumberFormat('es-UY', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
  return `${symbol}\u00A0${formatted}`
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const now = new Date()
  const label = `${MONTHS[m - 1]}`
  const year = y === now.getFullYear() ? '' : ` ${y}`
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${year}`
}

export function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export function formatRelative(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  return formatDate(iso)
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function isThisMonth(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export type MonthCursor = { year: number; month: number }

export function currentMonthCursor(): MonthCursor {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function prevMonthCursor(m: MonthCursor): MonthCursor {
  return m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }
}

export function nextMonthCursor(m: MonthCursor): MonthCursor {
  return m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }
}

export function isSameMonthCursor(a: MonthCursor, b: MonthCursor) {
  return a.year === b.year && a.month === b.month
}

export function monthCursorKey(m: MonthCursor) {
  return `${m.year}-${String(m.month + 1).padStart(2, '0')}`
}

export function monthCursorLabel(m: MonthCursor) {
  const label = MONTHS[m.month]
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${m.year}`
}
