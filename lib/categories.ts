import type { CategoryId, CurrencyCode, PersonColor } from './types'
import {
  ShoppingCart,
  UtensilsCrossed,
  House,
  Plug,
  Bus,
  Wine,
  HeartPulse,
  Sofa,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORIES: Record<
  CategoryId,
  { label: string; icon: LucideIcon; color: string }
> = {
  super: { label: 'Súper', icon: ShoppingCart, color: 'oklch(0.62 0.14 155)' },
  comida: { label: 'Comida', icon: UtensilsCrossed, color: 'oklch(0.68 0.16 42)' },
  alquiler: { label: 'Alquiler', icon: House, color: 'oklch(0.56 0.15 265)' },
  servicios: { label: 'Servicios', icon: Plug, color: 'oklch(0.6 0.13 230)' },
  transporte: { label: 'Transporte', icon: Bus, color: 'oklch(0.6 0.14 200)' },
  salidas: { label: 'Salidas', icon: Wine, color: 'oklch(0.58 0.17 330)' },
  salud: { label: 'Salud', icon: HeartPulse, color: 'oklch(0.62 0.16 15)' },
  casa: { label: 'Casa', icon: Sofa, color: 'oklch(0.66 0.13 90)' },
  otros: { label: 'Otros', icon: Ellipsis, color: 'oklch(0.6 0.02 80)' },
}

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([id, v]) => ({
  id: id as CategoryId,
  ...v,
}))

export const CURRENCIES: Record<CurrencyCode, { label: string; symbol: string }> = {
  UYU: { label: 'Peso uruguayo', symbol: '$U' },
  USD: { label: 'Dólar', symbol: 'US$' },
  ARS: { label: 'Peso argentino', symbol: 'AR$' },
  EUR: { label: 'Euro', symbol: '€' },
}

export const PERSON_COLORS: PersonColor[] = [
  'person-1',
  'person-2',
  'person-3',
  'person-4',
  'person-5',
]

export function personColorVar(color: PersonColor) {
  return `var(--${color})`
}
