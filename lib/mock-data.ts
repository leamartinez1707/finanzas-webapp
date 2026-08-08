import type {
  Expense,
  Goal,
  Household,
  Member,
  SavingsMovement,
} from './types'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

export const CURRENT_USER_ID = 'm-vale'

export const MEMBERS: Member[] = [
  { id: 'm-vale', name: 'Valentina', email: 'vale@nido.app', color: 'person-1', joinedAt: daysAgo(210) },
  { id: 'm-mateo', name: 'Mateo', email: 'mateo@nido.app', color: 'person-2', joinedAt: daysAgo(198) },
  { id: 'm-emi', name: 'Emilia', email: 'emi@nido.app', color: 'person-3', joinedAt: daysAgo(96) },
  { id: 'm-sofi', name: 'Sofía', email: 'sofi@nido.app', color: 'person-4', joinedAt: daysAgo(60) },
]

export const HOUSEHOLDS: Household[] = [
  {
    id: 'h-casa',
    name: 'Casa Pocitos',
    currency: 'UYU',
    memberIds: ['m-vale', 'm-mateo', 'm-emi'],
    invites: [
      { id: 'inv-1', email: 'lucas@gmail.com', status: 'pendiente', sentAt: daysAgo(3) },
      { id: 'inv-2', email: 'juli@gmail.com', status: 'expirada', sentAt: daysAgo(20) },
    ],
  },
  {
    id: 'h-depto',
    name: 'Depto Centro',
    currency: 'USD',
    memberIds: ['m-vale', 'm-sofi'],
    invites: [],
  },
]

export const EXPENSES: Expense[] = [
  // Casa Pocitos — este mes
  { id: 'e1', scope: 'household', householdId: 'h-casa', ownerId: 'm-vale', payerId: 'm-vale', description: 'Alquiler', category: 'alquiler', amount: 32000, currency: 'UYU', date: daysAgo(2) },
  { id: 'e2', scope: 'household', householdId: 'h-casa', ownerId: 'm-mateo', payerId: 'm-mateo', description: 'Súper de la semana', category: 'super', amount: 4850, currency: 'UYU', date: daysAgo(3) },
  { id: 'e3', scope: 'household', householdId: 'h-casa', ownerId: 'm-emi', payerId: 'm-emi', description: 'UTE + OSE', category: 'servicios', amount: 3100, currency: 'UYU', date: daysAgo(5) },
  { id: 'e4', scope: 'household', householdId: 'h-casa', ownerId: 'm-vale', payerId: 'm-vale', description: 'Internet', category: 'servicios', amount: 1290, currency: 'UYU', date: daysAgo(6) },
  { id: 'e5', scope: 'household', householdId: 'h-casa', ownerId: 'm-mateo', payerId: 'm-mateo', description: 'Cena delivery', category: 'comida', amount: 1650, currency: 'UYU', date: daysAgo(8) },
  { id: 'e6', scope: 'household', householdId: 'h-casa', ownerId: 'm-vale', payerId: 'm-vale', description: 'Feria', category: 'super', amount: 2200, currency: 'UYU', date: daysAgo(9) },
  { id: 'e7', scope: 'household', householdId: 'h-casa', ownerId: 'm-emi', payerId: 'm-emi', description: 'Productos de limpieza', category: 'casa', amount: 1450, currency: 'UYU', date: daysAgo(12) },
  // Casa Pocitos — mes pasado
  { id: 'e8', scope: 'household', householdId: 'h-casa', ownerId: 'm-vale', payerId: 'm-vale', description: 'Alquiler', category: 'alquiler', amount: 32000, currency: 'UYU', date: daysAgo(33) },
  { id: 'e9', scope: 'household', householdId: 'h-casa', ownerId: 'm-mateo', payerId: 'm-mateo', description: 'Súper mensual', category: 'super', amount: 6200, currency: 'UYU', date: daysAgo(36) },
  { id: 'e10', scope: 'household', householdId: 'h-casa', ownerId: 'm-emi', payerId: 'm-emi', description: 'Cumple sorpresa', category: 'salidas', amount: 3800, currency: 'UYU', date: daysAgo(40) },

  // Depto Centro — este mes (USD)
  { id: 'e11', scope: 'household', householdId: 'h-depto', ownerId: 'm-vale', payerId: 'm-vale', description: 'Rent', category: 'alquiler', amount: 640, currency: 'USD', date: daysAgo(2) },
  { id: 'e12', scope: 'household', householdId: 'h-depto', ownerId: 'm-sofi', payerId: 'm-sofi', description: 'Groceries', category: 'super', amount: 120, currency: 'USD', date: daysAgo(4) },

  // Personales de Valentina — este mes
  { id: 'p1', scope: 'personal', ownerId: 'm-vale', payerId: 'm-vale', description: 'Café con Ana', category: 'salidas', amount: 480, currency: 'UYU', date: daysAgo(1) },
  { id: 'p2', scope: 'personal', ownerId: 'm-vale', payerId: 'm-vale', description: 'Farmacia', category: 'salud', amount: 920, currency: 'UYU', date: daysAgo(4) },
  { id: 'p3', scope: 'personal', ownerId: 'm-vale', payerId: 'm-vale', description: 'Ómnibus', category: 'transporte', amount: 640, currency: 'UYU', date: daysAgo(7) },
  { id: 'p4', scope: 'personal', ownerId: 'm-vale', payerId: 'm-vale', description: 'Ropa', category: 'otros', amount: 2400, currency: 'UYU', date: daysAgo(11) },
]

export const GOALS: Goal[] = [
  {
    id: 'g1',
    scope: 'household',
    householdId: 'h-casa',
    name: 'Vacaciones a Brasil',
    target: 90000,
    currency: 'UYU',
    deadline: '2026-12-01',
    contributions: [
      { id: 'c1', memberId: 'm-vale', amount: 15000, date: daysAgo(40) },
      { id: 'c2', memberId: 'm-mateo', amount: 12000, date: daysAgo(35) },
      { id: 'c3', memberId: 'm-emi', amount: 9000, date: daysAgo(10) },
      { id: 'c4', memberId: 'm-vale', amount: 8000, date: daysAgo(3) },
    ],
  },
  {
    id: 'g2',
    scope: 'household',
    householdId: 'h-casa',
    name: 'Sillón nuevo',
    target: 24000,
    currency: 'UYU',
    contributions: [
      { id: 'c5', memberId: 'm-mateo', amount: 6000, date: daysAgo(20) },
      { id: 'c6', memberId: 'm-emi', amount: 4000, date: daysAgo(6) },
    ],
  },
  {
    id: 'g3',
    scope: 'household',
    householdId: 'h-depto',
    name: 'Emergency fund',
    target: 3000,
    currency: 'USD',
    contributions: [{ id: 'c7', memberId: 'm-vale', amount: 900, date: daysAgo(15) }],
  },
  {
    id: 'g4',
    scope: 'personal',
    ownerId: 'm-vale',
    name: 'Notebook nueva',
    target: 45000,
    currency: 'UYU',
    deadline: '2026-10-01',
    contributions: [
      { id: 'c8', memberId: 'm-vale', amount: 12000, date: daysAgo(30) },
      { id: 'c9', memberId: 'm-vale', amount: 6000, date: daysAgo(5) },
    ],
  },
  {
    id: 'g5',
    scope: 'personal',
    ownerId: 'm-vale',
    name: 'Curso de cerámica',
    target: 8000,
    currency: 'UYU',
    contributions: [{ id: 'c10', memberId: 'm-vale', amount: 8000, date: daysAgo(2) }],
  },
]

export const SAVINGS: SavingsMovement[] = [
  // Casa Pocitos savings per member
  { id: 's1', memberId: 'm-vale', scope: 'household', householdId: 'h-casa', type: 'deposito', amount: 40000, date: daysAgo(50), note: 'Aguinaldo' },
  { id: 's2', memberId: 'm-vale', scope: 'household', householdId: 'h-casa', type: 'deposito', amount: 8000, date: daysAgo(5) },
  { id: 's3', memberId: 'm-mateo', scope: 'household', householdId: 'h-casa', type: 'deposito', amount: 30000, date: daysAgo(48) },
  { id: 's4', memberId: 'm-mateo', scope: 'household', householdId: 'h-casa', type: 'retiro', amount: 5000, date: daysAgo(12), note: 'Imprevisto auto' },
  { id: 's5', memberId: 'm-emi', scope: 'household', householdId: 'h-casa', type: 'deposito', amount: 22000, date: daysAgo(20) },
  // Depto centro (USD)
  { id: 's6', memberId: 'm-vale', scope: 'household', householdId: 'h-depto', type: 'deposito', amount: 1200, date: daysAgo(40) },
  { id: 's7', memberId: 'm-sofi', scope: 'household', householdId: 'h-depto', type: 'deposito', amount: 800, date: daysAgo(25) },
  // Personal de Valentina
  { id: 's8', memberId: 'm-vale', scope: 'personal', type: 'deposito', amount: 25000, date: daysAgo(60) },
  { id: 's9', memberId: 'm-vale', scope: 'personal', type: 'deposito', amount: 6000, date: daysAgo(9) },
  { id: 's10', memberId: 'm-vale', scope: 'personal', type: 'retiro', amount: 3000, date: daysAgo(4), note: 'Regalo' },
]
