'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { CurrencyCode, Expense, Goal, Household, Member, Repayment, SavingsMovement } from './types'
import {
  getCurrentUser,
  getMyHouseholds,
  getExpenses,
  getGoals,
  getSavings,
  getRepayments,
  getAllMembers,
  addExpense as addExpenseDB,
  updateExpense as updateExpenseDB,
  deleteExpense as deleteExpenseDB,
  addRepayment as addRepaymentDB,
  updateRepayment as updateRepaymentDB,
  deleteRepayment as deleteRepaymentDB,
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
  leaveHousehold as leaveHouseholdDB,
  removeMember as removeMemberDB,
  addInvite as addInviteDB,
  resendInvite as resendInviteDB,
  updateInvite as updateInviteDB,
  removeInvite as removeInviteDB,
  upsertProfile,
  updateDefaultContext as updateDefaultContextDB,
  type ExpenseFilter,
} from './supabase/queries'
import { showError } from './toast'

interface AppState {
  currentUserId: string | null
  loading: boolean
  loadError: unknown
  busy: boolean
  members: Member[]
  households: Household[]
  expenses: Expense[]
  goals: Goal[]
  savings: SavingsMovement[]
  repayments: Repayment[]
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
  addRepayment: (r: Omit<Repayment, 'id' | 'createdById'>) => Promise<void>
  updateRepayment: (id: string, patch: Partial<Repayment>) => Promise<void>
  deleteRepayment: (id: string) => Promise<void>
  addContribution: (goalId: string, memberId: string, amount: number) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
  addGoal: (g: Omit<Goal, 'id' | 'contributions'>) => Promise<void>
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addSavings: (m: Omit<SavingsMovement, 'id'>) => Promise<void>
  updateSavings: (id: string, patch: Partial<SavingsMovement>) => Promise<void>
  deleteSavings: (id: string) => Promise<void>
  createHousehold: (name: string, currency: CurrencyCode) => Promise<string>
  addInvite: (householdId: string, email: string) => Promise<{ error?: string }>
  updateInvite: (householdId: string, inviteId: string, status: string) => Promise<void>
  removeInvite: (householdId: string, inviteId: string) => Promise<void>
  updateHousehold: (id: string, patch: Partial<Household>) => Promise<void>
  leaveHousehold: (householdId: string) => Promise<void>
  removeMember: (householdId: string, memberId: string) => Promise<void>
  updateProfile: (name: string, color: string) => Promise<void>
  setDefaultContext: (value: string) => Promise<void>

  refresh: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

const DEFAULT_CURRENCY: CurrencyCode = 'UYU'

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [savings, setSavings] = useState<SavingsMovement[]>([])
  const [repayments, setRepayments] = useState<Repayment[]>([])
  const [selectedContext, setSelectedContext] = useState<string>('personal')
  const [busy, setBusy] = useState(false)
  const defaultContextAppliedRef = useRef(false)

  const wrapBusy = useCallback(<T extends (...args: any[]) => Promise<any>>(fn: T): T => {
    return (async (...args: Parameters<T>) => {
      setBusy(true)
      try { return await fn(...args) } finally { setBusy(false) }
    }) as T
  }, [])

  // ─── load all data on mount ───────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
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

      // Apply the user's saved default context once, on the very first
      // load — never on a later refresh(), so it doesn't fight with
      // wherever the user has since navigated to.
      if (!defaultContextAppliedRef.current) {
        defaultContextAppliedRef.current = true
        const preferred = user.defaultContext
        if (preferred && hh.some((h) => h.id === preferred)) {
          setSelectedContext(preferred)
        }
      }

      // Load all members from all households
      const allMemberIds = new Set<string>([user.id])
      for (const h of hh) {
        for (const mid of h.memberIds) allMemberIds.add(mid)
      }
      const personalFilter: ExpenseFilter = { scope: 'personal', ownerId: user.id }

      // Everything below is independent — fire it all in parallel instead
      // of one giant sequential chain, so a single slow/failing request
      // doesn't stretch out the window where a mid-flight token refresh
      // can take the whole load down.
      const [allProfs, personalExpenses, personalGoals, personalSavings, perHousehold] =
        await Promise.all([
          getAllMembers([...allMemberIds]),
          getExpenses(personalFilter),
          getGoals(personalFilter),
          getSavings(personalFilter, [user.id]),
          Promise.all(
            hh.map(async (h) => {
              const hhFilter: ExpenseFilter = { scope: 'household', householdId: h.id }
              const [exp, goals, sav, rep] = await Promise.all([
                getExpenses(hhFilter),
                getGoals(hhFilter),
                getSavings(hhFilter, h.memberIds),
                getRepayments(h.id),
              ])
              return { exp, goals, sav, rep }
            }),
          ),
        ])

      setMembers(allProfs)
      setExpenses([...personalExpenses, ...perHousehold.flatMap((r) => r.exp)])
      setGoals([...personalGoals, ...perHousehold.flatMap((r) => r.goals)])
      setSavings([...personalSavings, ...perHousehold.flatMap((r) => r.sav)])
      setRepayments(perHousehold.flatMap((r) => r.rep))
      setLoading(false)
    } catch (error) {
      setLoading(false)
      setLoadError(error)
      showError(error)
      throw error
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadData().catch(() => {
      if (cancelled) return
      // One automatic retry after a short delay — covers a transient
      // auth-token refresh landing mid-load, which is what today makes
      // the user manually reload the page to recover.
      setTimeout(() => {
        if (!cancelled) loadData().catch(() => undefined)
      }, 1000)
    })
    return () => {
      cancelled = true
    }
  }, [loadData])

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
        loadError,
      busy,
      members,
      households,
      expenses,
      goals,
      savings,
      repayments,
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
      addRepayment: wrapBusy(async (r) => {
        const created = await addRepaymentDB(r)
        setRepayments((prev) => [created, ...prev])
      }),
      updateRepayment: wrapBusy(async (id, patch) => {
        await updateRepaymentDB(id, patch)
        setRepayments((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      }),
      deleteRepayment: wrapBusy(async (id) => {
        await deleteRepaymentDB(id)
        setRepayments((prev) => prev.filter((r) => r.id !== id))
      }),
      addContribution: wrapBusy(async (goalId, memberId, amount) => {
        const created = await addContributionDB(goalId, memberId, amount)
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? { ...g, contributions: [created, ...g.contributions] }
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
        const created = await addSavingsMovementDB(m)
        setSavings((prev) => [created, ...prev])
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
      addInvite: wrapBusy(async (householdId, email): Promise<{ error?: string }> => {
        const result = await addInviteDB(householdId, email)
        const user = await getCurrentUser()
        if (user) {
          const hh = await getMyHouseholds(user.id)
          setHouseholds(hh)
        }
        return result as { error?: string }
      }),
      updateInvite: wrapBusy(async (householdId, inviteId, status) => {
        // If re-sending (setting to pending again), send the email
        if (status === 'pendiente') {
          await resendInviteDB(inviteId)
        }
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
      leaveHousehold: wrapBusy(async (householdId) => {
        await leaveHouseholdDB(householdId)
        setHouseholds((prev) => prev.filter((h) => h.id !== householdId))
        if (selectedContext === householdId) {
          setSelectedContext('personal')
        }
      }),
      removeMember: wrapBusy(async (householdId, memberId) => {
        await removeMemberDB(householdId, memberId)
        setHouseholds((prev) =>
          prev.map((h) =>
            h.id === householdId
              ? { ...h, memberIds: h.memberIds.filter((id) => id !== memberId) }
              : h,
          ),
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
      setDefaultContext: wrapBusy(async (value) => {
        if (!currentUserId) return
        await updateDefaultContextDB(currentUserId, value === 'personal' ? null : value)
        setMembers((prev) =>
          prev.map((m) => (m.id === currentUserId ? { ...m, defaultContext: value } : m)),
        )
      }),

      refresh: loadData,
    }
  }, [
    currentUserId,
    loading,
    loadError,
    busy,
    members,
    households,
    expenses,
    goals,
    savings,
    repayments,
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
