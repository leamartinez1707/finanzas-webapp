'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bird, Clock3, LayoutGrid, PiggyBank, ReceiptText, Settings2, Target } from 'lucide-react'
import { ContextSwitcher } from '@/components/context-switcher'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

export const NAV_ITEMS = [
  { href: '/inicio', label: 'Inicio', icon: LayoutGrid },
  { href: '/gastos', label: 'Gastos', icon: ReceiptText },
  { href: '/objetivos', label: 'Objetivos', icon: Target },
  { href: '/ahorros', label: 'Ahorros', icon: PiggyBank },
  { href: '/historial', label: 'Historial', icon: Clock3 },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { isPersonal } = useApp()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/70 px-4 py-5 lg:flex">
      <div className="flex items-center gap-2 px-2 text-lg font-bold tracking-tight">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bird className="size-4.5" aria-hidden />
        </span>
        Nido
      </div>

      <div className="mt-8"><ContextSwitcher /></div>

      <nav className="mt-8 flex-1" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Finanzas
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                    active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={active ? 2.5 : 2} aria-hidden />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {!isPersonal && (
        <Link
          href="/ajustes"
          aria-current={pathname.startsWith('/ajustes') ? 'page' : undefined}
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
            pathname.startsWith('/ajustes') ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Settings2 className="size-[18px]" aria-hidden />
          Ajustes del hogar
        </Link>
      )}
    </aside>
  )
}
