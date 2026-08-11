'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, ReceiptText, Target, PiggyBank, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/inicio', label: 'Inicio', icon: LayoutGrid },
  { href: '/gastos', label: 'Gastos', icon: ReceiptText },
  { href: '/objetivos', label: 'Objetivos', icon: Target },
  { href: '/ahorros', label: 'Ahorros', icon: PiggyBank },
  { href: '/historial', label: 'Historial', icon: Clock3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-border bg-card/85 backdrop-blur-lg"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 md:max-w-xl md:px-8">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-primary/12',
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={active ? 2.5 : 2} />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
