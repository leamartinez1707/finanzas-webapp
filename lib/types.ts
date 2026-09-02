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
  defaultContext?: string // 'personal' or a household id — only meaningful on the current user
}

export type InviteStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada'

export interface Invite {
  id: string
  email: string
  status: InviteStatus
  sentAt: string
}

export interface ExpenseShare { memberId: string; amount: number }
export interface SplitPercent { memberId: string; percent: number }

export interface Household {
  id: string
  name: string
  currency: CurrencyCode
  memberIds: string[]
  invites: Invite[]
  ownerId?: string
  defaultSplit?: SplitPercent[] | null
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
  createdAt?: string // when the row was actually inserted (has a real time) — distinct from `date`, which never does
  recurringExpenseId?: string | null // set when generated from a RecurringExpense template
  shares?: ExpenseShare[] | null // manual per-expense override (fixed amounts)
  splitSnapshot?: SplitPercent[] | null // frozen copy of household.defaultSplit at creation time
}

export interface RecurringExpense {
  id: string
  scope: 'household' | 'personal'
  householdId?: string
  ownerId: string
  payerId: string
  description: string
  category: CategoryId
  amount: number
  currency: CurrencyCode
  dayOfMonth: number // 1–28
  active: boolean
  createdById: string
}

export interface Budget {
  id: string
  scope: 'household' | 'personal'
  householdId?: string
  ownerId: string
  category: CategoryId
  amount: number
  currency: CurrencyCode
  createdById: string
}

export type PremiumFeatureId =
  | 'conversion_moneda'
  | 'exportar_excel_pdf'
  | 'notificaciones_presupuesto'
  | 'tendencia_categoria'

export interface PremiumWaitlistEntry {
  userId: string
  interestedFeatures: PremiumFeatureId[]
  joinedAt: string // ISO date
}

export interface Repayment {
  id: string
  householdId: string
  fromId: string
  toId: string
  amount: number
  currency: CurrencyCode
  date: string
  createdAt?: string // when the row was actually inserted (has a real time) — distinct from `date`, which never does
  note?: string
  expenseId?: string | null
  createdById: string
}

export interface Contribution {
  id: string
  memberId: string
  amount: number
  date: string
  createdAt?: string // when the row was actually inserted (has a real time) — distinct from `date`, which never does
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
  createdAt?: string // when the row was actually inserted (has a real time) — distinct from `date`, which never does
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
  createdAt?: string // when the row was actually inserted (has a real time) — distinct from `date`, which never does
  category?: CategoryId
  direction: 'in' | 'out'
}
