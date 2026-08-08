'use client'

import { useMemo, useState } from 'react'
import { Plus, Target, Sparkles } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ScreenHeader } from '@/components/screen-header'
import { GoalCard, goalSaved } from '@/components/goal-card'
import { EmptyState } from '@/components/empty-state'
import { Sheet } from '@/components/sheet'
import { GoalForm } from './goal-form'
import { cn } from '@/lib/utils'
import type { Goal } from '@/lib/types'

export default function ObjetivosPage() {
  const {
    isPersonal,
    activeHousehold,
    activeCurrency,
    currentUser,
    loading,
    goals,
    addGoal,
  } = useApp()

  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'activos' | 'cumplidos' | 'todos'>('activos')

  const scopedGoals = useMemo(() => {
    let list = isPersonal
      ? goals.filter((g) => g.scope === 'personal' && g.ownerId === currentUser?.id)
      : goals.filter((g) => g.scope === 'household' && g.householdId === activeHousehold!.id)

    if (filter === 'activos') {
      list = list.filter((g) => goalSaved(g) < g.target)
    } else if (filter === 'cumplidos') {
      list = list.filter((g) => goalSaved(g) >= g.target)
    }

    return [...list].sort((a, b) => {
      const aPct = goalSaved(a) / a.target
      const bPct = goalSaved(b) / b.target
      return aPct - bPct // closest to completion first
    })
  }, [goals, isPersonal, currentUser?.id, activeHousehold, filter])

  function handleCreate(data: Omit<Goal, 'id' | 'contributions'>) {
    addGoal(data)
    setAdding(false)
  }

  const totalTarget = scopedGoals.reduce((s, g) => s + g.target, 0)
  const totalSaved = scopedGoals.reduce((s, g) => s + goalSaved(g), 0)
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  if (loading || !currentUser) return null

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={isPersonal ? 'Mis objetivos' : 'Objetivos'}
        subtitle={
          isPersonal
            ? 'Lo que querés alcanzar'
            : activeHousehold
              ? activeHousehold.name
              : undefined
        }
        action={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            aria-label="Crear objetivo"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      {/* --- overall progress --- */}
      {scopedGoals.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Progreso total</span>
            <span className="text-sm font-bold tabular-nums">{overallPct}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {filter === 'activos' ? 'Faltan ' : ''}
            {filter === 'cumplidos' ? 'Completaron ' : ''}
            ${(totalTarget - totalSaved).toLocaleString('es-UY')} para llegar a las metas
          </p>
        </div>
      )}

      {/* --- filter tabs --- */}
      <div className="flex gap-1.5 rounded-2xl bg-muted p-1">
        {(['activos', 'cumplidos', 'todos'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-medium transition-colors',
              filter === f
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {f === 'activos' ? 'Activos' : f === 'cumplidos' ? 'Cumplidos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* --- list --- */}
      {scopedGoals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {scopedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} baseCurrency={activeCurrency} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={filter === 'cumplidos' ? Sparkles : Target}
          title={
            filter === 'cumplidos'
              ? 'Ninguno cumplido todavía'
              : filter === 'activos'
                ? 'No hay objetivos activos'
                : 'Todavía no hay objetivos'
          }
          description={
            filter !== 'todos'
              ? 'Probá cambiando el filtro a "Todos".'
              : isPersonal
                ? 'Creá tu primer objetivo personal y empezá a ahorrar.'
                : 'Creen su primer objetivo del hogar y empiecen a ahorrar juntos.'
          }
          action={
            filter === 'todos' && (
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="size-4" />
                Crear objetivo
              </button>
            )
          }
        />
      )}

      {/* --- create sheet --- */}
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title={isPersonal ? 'Nuevo objetivo personal' : 'Nuevo objetivo'}
      >
        <GoalForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />
      </Sheet>
    </div>
  )
}
