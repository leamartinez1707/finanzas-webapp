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
import type { Budget, CurrencyCode, Expense, Goal, Household, Member, PremiumFeatureId, PremiumWaitlistEntry, RecurringExpense, Repayment, SavingsMovement, Task } from './types'
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
  getRecurringExpenses,
  addRecurringExpense as addRecurringExpenseDB,
  updateRecurringExpense as updateRecurringExpenseDB,
  deleteRecurringExpense as deleteRecurringExpenseDB,
  generateRecurringExpense,
  getBudgets,
  addBudget as addBudgetDB,
  updateBudget as updateBudgetDB,
  deleteBudget as deleteBudgetDB,
  getTasks,
  addTask as addTaskDB,
  updateTask as updateTaskDB,
  deleteTask as deleteTaskDB,
  getPremiumWaitlistEntry,
  joinPremiumWaitlist as joinPremiumWaitlistDB,
  updatePremiumWaitlistFeatures as updatePremiumWaitlistFeaturesDB,
  leavePremiumWaitlist as leavePremiumWaitlistDB,
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
  transferToSavings as transferToSavingsDB,
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
import { monthKey, todayLocalISO } from './format'

interface AppState {
  currentUserId: string | null
  loading: boolean
  loadError: unknown
  busy: boolean
  members: Member[]
  households: Household[]
  expenses: Expense[]
  recurringExpenses: RecurringExpense[]
  budgets: Budget[]
  tasks: Task[]
  goals: Goal[]
  savings: SavingsMovement[]
  repayments: Repayment[]
  premiumWaitlistEntry: PremiumWaitlistEntry | null
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
  addRecurringExpense: (r: Omit<RecurringExpense, 'id' | 'createdById'>) => Promise<void>
  updateRecurringExpense: (id: string, patch: Partial<RecurringExpense>) => Promise<void>
  deleteRecurringExpense: (id: string) => Promise<void>
  addBudget: (b: Omit<Budget, 'id' | 'createdById'>) => Promise<void>
  updateBudget: (id: string, patch: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  addTask: (t: Omit<Task, 'id' | 'createdById'>) => Promise<void>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  joinPremiumWaitlist: (features: PremiumFeatureId[]) => Promise<void>
  updatePremiumWaitlistFeatures: (features: PremiumFeatureId[]) => Promise<void>
  leavePremiumWaitlist: () => Promise<void>
  addRepayment: (r: Omit<Repayment, 'id' | 'createdById'>) => Promise<void>
  updateRepayment: (id: string, patch: Partial<Repayment>) => Promise<void>
  deleteRepayment: (id: string) => Promise<void>
  addContribution: (goalId: string, memberId: string, amount: number, date?: string) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
  addGoal: (g: Omit<Goal, 'id' | 'contributions'>) => Promise<void>
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addSavings: (m: Omit<SavingsMovement, 'id'>) => Promise<void>
  updateSavings: (id: string, patch: Partial<SavingsMovement>) => Promise<void>
  deleteSavings: (id: string) => Promise<void>
  transferToSavings: (t: { amount: number; date: string; note?: string }) => Promise<void>
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
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [savings, setSavings] = useState<SavingsMovement[]>([])
  const [repayments, setRepayments] = useState<Repayment[]>([])
  const [premiumWaitlistEntry, setPremiumWaitlistEntry] = useState<PremiumWaitlistEntry | null>(null)
  const [selectedContext, setSelectedContext] = useState<string>('personal')
  const [busy, setBusy] = useState(false)
  const defaultContextAppliedRef = useRef(false)

  // Avoid the "flashes personal, then switches to the real household" jump
  // on reload: the initial state above has to stay 'personal' (SSR/first
  // paint can't read localStorage without a hydration mismatch), but as
  // soon as we're on the client we can apply the last-selected context
  // immediately — well before loadData()'s network round-trip would
  // otherwise correct it. loadData() still re-applies the user's saved
  // defaultContext from the server afterwards, same as always; this is
  // just a faster first guess, not a new source of truth.
  useEffect(() => {
    try {
      const cached = localStorage.getItem('nido:selectedContext')
      if (cached) setSelectedContext(cached)
    } catch {
      // localStorage unavailable (private mode, etc.) — fall through to
      // the normal server-driven default.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('nido:selectedContext', selectedContext)
    } catch {
      // ignore — this is a UX nicety, not a requirement
    }
  }, [selectedContext])

  const wrapBusy = useCallback(<T extends (...args: any[]) => Promise<any>>(fn: T): T => {
    return (async (...args: Parameters<T>) => {
      setBusy(true)
      try { return await fn(...args) } finally { setBusy(false) }
    }) as T
  }, [])

  // ─── load all data on mount ───────────────────────────────────────
  // `silent: true` is refresh()'s mode — it reruns the exact same fetch
  // but must never toggle the global `loading` flag, since every page
  // gates its whole content on it ("if (loading) return null"). A silent
  // reload replaces state only once the fresh data is in, so the screen
  // keeps showing the stale data until the swap instead of going blank.
  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) setLoading(true)
    setLoadError(null)
    try {
      const user = await getCurrentUser()
      if (!user) {
        if (!silent) setLoading(false)
        return
      }

      // Load households
      const hh = await getMyHouseholds(user.id)

      // Apply the user's saved default context once, on the very first
      // load — never on a later refresh(), so it doesn't fight with
      // wherever the user has since navigated to. Applied together with
      // everything else below, not here — see the batch-write note.
      let contextToApply: string | undefined
      if (!defaultContextAppliedRef.current) {
        defaultContextAppliedRef.current = true
        const preferred = user.defaultContext
        if (preferred && hh.some((h) => h.id === preferred)) {
          contextToApply = preferred
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
      const [allProfs, personalExpenses, personalRecurring, personalBudgets, personalTasks, personalGoals, personalSavings, waitlistEntry, perHousehold] =
        await Promise.all([
          getAllMembers([...allMemberIds]),
          getExpenses(personalFilter),
          getRecurringExpenses(personalFilter),
          getBudgets(personalFilter),
          getTasks(personalFilter),
          getGoals(personalFilter),
          getSavings(personalFilter, [user.id]),
          getPremiumWaitlistEntry(),
          Promise.all(
            hh.map(async (h) => {
              const hhFilter: ExpenseFilter = { scope: 'household', householdId: h.id }
              const [exp, rec, bud, tasks, goals, sav, rep] = await Promise.all([
                getExpenses(hhFilter),
                getRecurringExpenses(hhFilter),
                getBudgets(hhFilter),
                getTasks(hhFilter),
                getGoals(hhFilter),
                getSavings(hhFilter, h.memberIds),
                getRepayments(h.id),
              ])
              return { exp, rec, bud, tasks, goals, sav, rep }
            }),
          ),
        ])

      const allExpenses = [...personalExpenses, ...perHousehold.flatMap((r) => r.exp)]
      const allRecurring = [...personalRecurring, ...perHousehold.flatMap((r) => r.rec)]
      const allBudgets = [...personalBudgets, ...perHousehold.flatMap((r) => r.bud)]
      const allTasks = [...personalTasks, ...perHousehold.flatMap((r) => r.tasks)]

      // Generate this month's expense for any active template that has
      // reached its dayOfMonth and doesn't already have one. This is only
      // an optimization — the real duplicate guard is the partial unique
      // index on expenses(recurring_expense_id, month), which
      // generateRecurringExpense() catches (23505) and returns null for.
      const today = new Date()
      const todayIso = todayLocalISO()
      const currentMonth = monthKey(todayIso)
      const due = allRecurring.filter(
        (t) =>
          t.active &&
          today.getDate() >= t.dayOfMonth &&
          !allExpenses.some(
            (e) => e.recurringExpenseId === t.id && monthKey(e.date) === currentMonth,
          ),
      )
      const generated = due.length
        ? (await Promise.all(due.map((t) => generateRecurringExpense(t, todayIso)))).filter(
            (e): e is Expense => e !== null,
          )
        : []

      // Apply everything together, in one synchronous block, so a silent
      // refresh never paints an in-between state — e.g. `members` holding
      // only the current user while `expenses` already references other
      // members' ids. React batches these into a single re-render.
      setCurrentUserId(user.id)
      setHouseholds(hh)
      if (contextToApply) setSelectedContext(contextToApply)
      setMembers(allProfs)
      setExpenses([...generated, ...allExpenses])
      setRecurringExpenses(allRecurring)
      setBudgets(allBudgets)
      setTasks(allTasks)
      setGoals([...personalGoals, ...perHousehold.flatMap((r) => r.goals)])
      setSavings([...personalSavings, ...perHousehold.flatMap((r) => r.sav)])
      setRepayments(perHousehold.flatMap((r) => r.rep))
      setPremiumWaitlistEntry(waitlistEntry)
      if (!silent) setLoading(false)
    } catch (error) {
      if (!silent) setLoading(false)
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
      recurringExpenses,
      budgets,
      tasks,
      goals,
      savings,
      repayments,
      premiumWaitlistEntry,
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
      addRecurringExpense: wrapBusy(async (r) => {
        const created = await addRecurringExpenseDB(r)
        setRecurringExpenses((prev) => [created, ...prev])
      }),
      updateRecurringExpense: wrapBusy(async (id, patch) => {
        await updateRecurringExpenseDB(id, patch)
        setRecurringExpenses((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        )
      }),
      deleteRecurringExpense: wrapBusy(async (id) => {
        await deleteRecurringExpenseDB(id)
        setRecurringExpenses((prev) => prev.filter((r) => r.id !== id))
      }),
      addBudget: wrapBusy(async (b) => {
        const created = await addBudgetDB(b)
        setBudgets((prev) => [created, ...prev])
      }),
      updateBudget: wrapBusy(async (id, patch) => {
        await updateBudgetDB(id, patch)
        setBudgets((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        )
      }),
      deleteBudget: wrapBusy(async (id) => {
        await deleteBudgetDB(id)
        setBudgets((prev) => prev.filter((b) => b.id !== id))
      }),
      addTask: wrapBusy(async (t) => {
        const created = await addTaskDB(t)
        setTasks((prev) => [created, ...prev])
      }),
      updateTask: wrapBusy(async (id, patch) => {
        await updateTaskDB(id, patch)
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        )
      }),
      deleteTask: wrapBusy(async (id) => {
        await deleteTaskDB(id)
        setTasks((prev) => prev.filter((t) => t.id !== id))
      }),
      joinPremiumWaitlist: wrapBusy(async (features) => {
        const entry = await joinPremiumWaitlistDB(features)
        setPremiumWaitlistEntry(entry)
      }),
      updatePremiumWaitlistFeatures: wrapBusy(async (features) => {
        await updatePremiumWaitlistFeaturesDB(features)
        setPremiumWaitlistEntry((prev) => (prev ? { ...prev, interestedFeatures: features } : prev))
      }),
      leavePremiumWaitlist: wrapBusy(async () => {
        await leavePremiumWaitlistDB()
        setPremiumWaitlistEntry(null)
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
      addContribution: wrapBusy(async (goalId, memberId, amount, date) => {
        const created = await addContributionDB(goalId, memberId, amount, date)
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
      transferToSavings: wrapBusy(async (t) => {
        const created = await transferToSavingsDB({
          amount: t.amount,
          date: t.date,
          note: t.note,
          scope: isPersonal ? 'personal' : 'household',
          householdId: isPersonal ? undefined : activeHousehold?.id,
        })
        setSavings((prev) => [...created, ...prev])
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

      refresh: () => loadData({ silent: true }),
    }
  }, [
    currentUserId,
    loading,
    loadError,
    busy,
    members,
    households,
    expenses,
    recurringExpenses,
    budgets,
    tasks,
    goals,
    savings,
    repayments,
    premiumWaitlistEntry,
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
