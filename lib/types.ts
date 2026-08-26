export type PersonColor = 'person-1' | 'person-2' | 'person-3' | 'person-4' | 'person-5'

export type CurrencyCode = 'UYU' | 'USD' | 'ARS' | 'EUR'

export type CategoryId =
  | 'super'
  | 'comida'
  | 'alquiler'
  | 'servicios'
  | 'transporte'
  | 'salidas'
  | 'salud'
  | 'casa'
  | 'otros'

export interface Member {
  id: string
  name: string
  email: string
  color: PersonColor
  joinedAt: string // ISO date
}

export type InviteStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada'

export interface Invite {
  id: string
  email: string
  status: InviteStatus
  sentAt: string
}

export interface Household {
  id: string
  name: string
  currency: CurrencyCode
  memberIds: string[]
  invites: Invite[]
  ownerId?: string
}

export interface Expense {
  id: string
  scope: 'household' | 'personal'
  householdId?: string
  ownerId: string // personal owner OR who logged it
  payerId: string // who actually paid (for household split)
  description: string
  category: CategoryId
  amount: number
  currency: CurrencyCode
  date: string // ISO date
}

export interface Repayment {
  id: string
  householdId: string
  fromId: string
  toId: string
  amount: number
  currency: CurrencyCode
  date: string
  note?: string
  expenseId?: string | null
  createdById: string
}

export interface Contribution {
  id: string
  memberId: string
  amount: number
  date: string
}

export interface Goal {
  id: string
  scope: 'household' | 'personal'
  householdId?: string
  ownerId?: string
  name: string
  target: number
  currency: CurrencyCode
  deadline?: string
  contributions: Contribution[]
}

export interface SavingsMovement {
  id: string
  memberId: string
  scope: 'household' | 'personal'
  householdId?: string
  type: 'deposito' | 'retiro'
  amount: number
  date: string
  note?: string
}

export type ActivityKind = 'gasto' | 'aporte' | 'ahorro' | 'pago'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  memberId: string
  title: string
  subtitle: string
  amount: number
  currency: CurrencyCode
  date: string
  category?: CategoryId
  direction: 'in' | 'out'
}
