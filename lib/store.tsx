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
  addContribution as addContributionDB,
  addSavingsMovement as addSavingsMovementDB,
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
  addGoal: (g: Omit<Goal, 'id' | 'contributions'>) => Promise<void>
  addSavings: (m: Omit<SavingsMovement, 'id'>) => Promise<void>
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

      addExpense: async (e) => {
        const created = await addExpenseDB(e)
        setExpenses((prev) => [created, ...prev])
      },
      updateExpense: async (id, patch) => {
        await updateExpenseDB(id, patch)
        setExpenses((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        )
      },
      deleteExpense: async (id) => {
        await deleteExpenseDB(id)
        setExpenses((prev) => prev.filter((e) => e.id !== id))
      },
      addContribution: async (goalId, memberId, amount) => {
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
      },
      addGoal: async (g) => {
        const created = await addGoalDB(g)
        setGoals((prev) => [created, ...prev])
      },
      addSavings: async (m) => {
        await addSavingsMovementDB(m)
        setSavings((prev) => [
          { ...m, id: crypto.randomUUID() },
          ...prev,
        ])
      },
      createHousehold: async (name, currency) => {
        const id = await createHouseholdDB(name, currency)
        // Refresh data
        await loadData()
        return id
      },
      addInvite: async (householdId, email) => {
        await addInviteDB(householdId, email)
        // Reload households to get updated invites
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
      },
      updateInvite: async (householdId, inviteId, status) => {
        await updateInviteDB(householdId, inviteId, status)
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
      },
      removeInvite: async (householdId, inviteId) => {
        await removeInviteDB(inviteId)
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
      },
      updateHousehold: async (id, patch) => {
        await updateHouseholdDB(id, patch)
        setHouseholds((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        )
      },
      updateProfile: async (name, color) => {
        await upsertProfile(name, color as any)
        setMembers((prev) =>
          prev.map((m) =>
            m.id === currentUserId ? { ...m, name, color: color as any } : m,
          ),
        )
      },

      refresh: loadData,
    }
  }, [
    currentUserId,
    loading,
    members,
    households,
    expenses,
    goals,
    savings,
    selectedContext,
    loadData,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
