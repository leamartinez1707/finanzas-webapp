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
  const d = parseLocalDate(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const now = new Date()
  const label = `${MONTHS[m - 1]}`
  const year = y === now.getFullYear() ? '' : ` ${y}`
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${year}`
}

// "Hoy" en fecha local (YYYY-MM-DD) — NUNCA toISOString(), que da la fecha en UTC
// y se corre respecto al día local apenas se cruzan las ~21hs en Uruguay (UTC-3).
export function todayLocalISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Parsea un "YYYY-MM-DD" (columna `date` de Postgres, sin hora) como fecha LOCAL.
// new Date("YYYY-MM-DD") lo interpreta como UTC medianoche — leerlo después con
// getters locales (getDate/getMonth) corre el día mostrado un día para atrás.
// Un timestamp completo (creado_en, joinedAt, etc.) ya es un instante sin
// ambigüedad — se parsea normal.
export function parseLocalDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

export function formatDate(iso: string) {
  const d = parseLocalDate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

// Hora local (HH:MM) de un timestamp real — a diferencia de `date` (fecha
// del gasto/pago en sí), esto es cuándo se cargó de verdad el registro.
export function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Siempre incluye la fecha concreta, aunque sea reciente — "Ayer" solo no
// alcanza para tener claro cuándo pasó algo sin tener que hacer la cuenta.
// `createdAt`, si viene, agrega la hora real de carga (creado_en/created_at) —
// la fecha del registro nunca tiene hora, así que sin esto no hay forma de
// saberla.
export function formatRelative(iso: string, createdAt?: string) {
  const d = parseLocalDate(iso)
  // Medianoche de hoy, no el instante actual — si comparás contra la hora
  // real, un gasto de HOY cargado de tarde ya lleva más de 12hs desde su
  // propia medianoche y el redondeo lo etiqueta como "Ayer" por error.
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((todayMidnight.getTime() - d.getTime()) / 86400000)
  const abs = formatDate(iso)
  let loaded = ''
  if (createdAt) {
    const created = new Date(createdAt)
    // Si se cargó un día distinto al que tiene el registro (fecha
    // retroactiva, típicamente), aclarar también ESE día — si no, "cargado
    // 22:16" al lado de "31 ago" lee como si las 22:16 fueran del 31,
    // cuando en realidad puede haberse cargado recién hoy a esa hora.
    const sameDay = created.getFullYear() === d.getFullYear()
      && created.getMonth() === d.getMonth()
      && created.getDate() === d.getDate()
    loaded = sameDay
      ? ` · cargado ${formatTime(createdAt)}`
      : ` · cargado el ${formatDate(createdAt)} ${formatTime(createdAt)}`
  }
  if (diff <= 0) return `Hoy · ${abs}${loaded}`
  if (diff === 1) return `Ayer · ${abs}${loaded}`
  if (diff < 7) return `Hace ${diff} días · ${abs}${loaded}`
  return `${abs}${loaded}`
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
  const d = parseLocalDate(iso)
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
