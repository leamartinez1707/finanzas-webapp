'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { CurrencyCode, Expense, Goal, Household, Member, SavingsMovement } from './types'
import {
  getCurrentUser,
  getMyHouseholds,
  getExpenses,
  getGoals,
  getSavings,
  getAllMembers,
  addExpense as addExpenseDB,
  updateExpense as updateExpenseDB,
  deleteExpense as deleteExpenseDB,
  addGoal as addGoalDB,
  updateGoal as updateGoalDB,
  deleteGoal as deleteGoalDB,
  addContribution as addContributionDB,
  deleteContribution as deleteContributionDB,
  addSavingsMovement as addSavingsMovementDB,
  updateSavingsMovement as updateSavingsMovementDB,
  deleteSavingsMovement as deleteSavingsMovementDB,
  createHousehold as createHouseholdDB,
  updateHousehold as updateHouseholdDB,
  addInvite as addInviteDB,
  updateInvite as updateInviteDB,
  removeInvite as removeInviteDB,
  upsertProfile,
  getHouseholdMembers,
  type ExpenseFilter,
} from './supabase/queries'

interface AppState {
  currentUserId: string | null
  loading: boolean
  busy: boolean
  members: Member[]
  households: Household[]
  expenses: Expense[]
  goals: Goal[]
  savings: SavingsMovement[]
  selectedContext: string
  setSelectedContext: (id: string) => void

  currentUser: Member | undefined
  myHouseholds: Household[]
  getMember: (id: string) => Member | undefined
  getHousehold: (id: string) => Household | undefined
  isPersonal: boolean
  activeHousehold: Household | undefined
  activeCurrency: CurrencyCode

  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, e: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  addContribution: (goalId: string, memberId: string, amount: number) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
  addGoal: (g: Omit<Goal, 'id' | 'contributions'>) => Promise<void>
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addSavings: (m: Omit<SavingsMovement, 'id'>) => Promise<void>
  updateSavings: (id: string, patch: Partial<SavingsMovement>) => Promise<void>
  deleteSavings: (id: string) => Promise<void>
  createHousehold: (name: string, currency: CurrencyCode) => Promise<string>
  addInvite: (householdId: string, email: string) => Promise<void>
  updateInvite: (householdId: string, inviteId: string, status: string) => Promise<void>
  removeInvite: (householdId: string, inviteId: string) => Promise<void>
  updateHousehold: (id: string, patch: Partial<Household>) => Promise<void>
  updateProfile: (name: string, color: string) => Promise<void>

  refresh: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

const DEFAULT_CURRENCY: CurrencyCode = 'UYU'

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [savings, setSavings] = useState<SavingsMovement[]>([])
  const [selectedContext, setSelectedContext] = useState<string>('personal')
  const [busy, setBusy] = useState(false)

  const wrapBusy = useCallback(<T extends (...args: any[]) => Promise<any>>(fn: T): T => {
    return (async (...args: Parameters<T>) => {
      setBusy(true)
      try { return await fn(...args) } finally { setBusy(false) }
    }) as T
  }, [])

  // ─── load all data on mount ───────────────────────────────────────
  const loadData = useCallback(async () => {
    const user = await getCurrentUser()
    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)
    setMembers([user])

    // Load households
    const hh = await getMyHouseholds(user.id)
    setHouseholds(hh)

    // If we have households and no context set, default to first household
    if (hh.length > 0 && selectedContext === 'personal') {
      // Keep personal as default until user switches
    }

    // Load all members from all households
    const allMemberIds = new Set<string>([user.id])
    for (const h of hh) {
      for (const mid of h.memberIds) allMemberIds.add(mid)
    }
    const allProfs = await getAllMembers([...allMemberIds])
    setMembers(allProfs)

    // Load expenses, goals, savings for all scopes
    const allExpenses: Expense[] = []
    const allGoals: Goal[] = []
    const allSavings: SavingsMovement[] = []

    // Personal
    const personalFilter: ExpenseFilter = { scope: 'personal', ownerId: user.id }
    allExpenses.push(...(await getExpenses(personalFilter)))
    allGoals.push(...(await getGoals(personalFilter)))

    // Household scopes
    for (const h of hh) {
      const hhFilter: ExpenseFilter = { scope: 'household', householdId: h.id }
      allExpenses.push(...(await getExpenses(hhFilter)))
      allGoals.push(...(await getGoals(hhFilter)))
      allSavings.push(...(await getSavings(hhFilter, h.memberIds)))
    }

    // Personal savings
    allSavings.push(
      ...(await getSavings(personalFilter, [user.id])),
    )

    setExpenses(allExpenses)
    setGoals(allGoals)
    setSavings(allSavings)
    setLoading(false)
  }, [selectedContext])

  useEffect(() => {
    loadData()
  }, [])

  // ─── derived ──────────────────────────────────────────────────────
  const value = useMemo<AppState>(() => {
    const currentUser = members.find((m) => m.id === currentUserId)
    const myHouseholds = households.filter((h) => h.memberIds.includes(currentUserId ?? ''))
    const isPersonal = selectedContext === 'personal'
    const activeHousehold = households.find((h) => h.id === selectedContext)
    const activeCurrency: CurrencyCode = isPersonal
      ? DEFAULT_CURRENCY
      : activeHousehold?.currency ?? DEFAULT_CURRENCY

    return {
      currentUserId,
      loading,
      busy,
      members,
      households,
      expenses,
      goals,
      savings,
      selectedContext,
      setSelectedContext,
      currentUser,
      myHouseholds,
      isPersonal,
      activeHousehold,
      activeCurrency,
      getMember: (id) => members.find((m) => m.id === id),
      getHousehold: (id) => households.find((h) => h.id === id),

      addExpense: wrapBusy(async (e) => {
        const created = await addExpenseDB(e)
        setExpenses((prev) => [created, ...prev])
      }),
      updateExpense: wrapBusy(async (id, patch) => {
        await updateExpenseDB(id, patch)
        setExpenses((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        )
      }),
      deleteExpense: wrapBusy(async (id) => {
        await deleteExpenseDB(id)
        setExpenses((prev) => prev.filter((e) => e.id !== id))
      }),
      addContribution: wrapBusy(async (goalId, memberId, amount) => {
        await addContributionDB(goalId, memberId, amount)
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  contributions: [
                    {
                      id: crypto.randomUUID(),
                      memberId,
                      amount,
                      date: new Date().toISOString(),
                    },
                    ...g.contributions,
                  ],
                }
              : g,
          ),
        )
      }),
      deleteContribution: wrapBusy(async (id) => {
        await deleteContributionDB(id)
        setGoals((prev) =>
          prev.map((g) => ({
            ...g,
            contributions: g.contributions.filter((c) => c.id !== id),
          })),
        )
      }),
      addGoal: wrapBusy(async (g) => {
        const created = await addGoalDB(g)
        setGoals((prev) => [created, ...prev])
      }),
      updateGoal: wrapBusy(async (id, patch) => {
        await updateGoalDB(id, patch)
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        )
      }),
      deleteGoal: wrapBusy(async (id) => {
        await deleteGoalDB(id)
        setGoals((prev) => prev.filter((g) => g.id !== id))
      }),
      addSavings: wrapBusy(async (m) => {
        await addSavingsMovementDB(m)
        setSavings((prev) => [
          { ...m, id: crypto.randomUUID() },
          ...prev,
        ])
      }),
      updateSavings: wrapBusy(async (id, patch) => {
        await updateSavingsMovementDB(id, patch)
        setSavings((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        )
      }),
      deleteSavings: wrapBusy(async (id) => {
        await deleteSavingsMovementDB(id)
        setSavings((prev) => prev.filter((s) => s.id !== id))
      }),
      createHousehold: wrapBusy(async (name, currency) => {
        const id = await createHouseholdDB(name, currency)
        await loadData()
        return id
      }),
      addInvite: wrapBusy(async (householdId, email) => {
        await addInviteDB(householdId, email)
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
      }),
      updateInvite: wrapBusy(async (householdId, inviteId, status) => {
        await updateInviteDB(householdId, inviteId, status)
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
      }),
      removeInvite: wrapBusy(async (householdId, inviteId) => {
        await removeInviteDB(inviteId)
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
      }),
      updateHousehold: wrapBusy(async (id, patch) => {
        await updateHouseholdDB(id, patch)
        setHouseholds((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        )
      }),
      updateProfile: wrapBusy(async (name, color) => {
        await upsertProfile(name, color as any)
        setMembers((prev) =>
          prev.map((m) =>
            m.id === currentUserId ? { ...m, name, color: color as any } : m,
          ),
        )
      }),

      refresh: loadData,
    }
  }, [
    currentUserId,
    loading,
    busy,
    members,
    households,
    expenses,
    goals,
    savings,
    selectedContext,
    loadData,
    wrapBusy,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
