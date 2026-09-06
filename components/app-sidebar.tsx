"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  LayoutGrid,
  ListChecks,
  LogOut,
  PiggyBank,
  Wallet,
  ReceiptText,
  RefreshCw,
  Settings2,
  Target,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { ContextSwitcher } from "@/components/context-switcher";
import { useApp } from "@/lib/store";
import { signOut } from "@/lib/supabase/queries";
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { urgentPendingCount } from "@/lib/tasks";

// `primary` marks the items that get their own icon in the mobile bottom
// nav (limited real estate — 5 slots incl. "Más"); the rest live inside the
// "Más" sheet there. The desktop sidebar has room for all of them and
// ignores the flag.
export const NAV_ITEMS = [
  { href: "/inicio", label: "Inicio", icon: LayoutGrid, primary: true },
  { href: "/gastos", label: "Gastos", icon: ReceiptText, primary: true },
  { href: "/objetivos", label: "Objetivos", icon: Target, primary: false },
  { href: "/tareas", label: "Tareas", icon: ListChecks, primary: true },
  { href: "/ingresos", label: "Ingresos", icon: Wallet, primary: true },
  { href: "/ahorros", label: "Ahorros", icon: PiggyBank, primary: false },
  { href: "/historial", label: "Historial", icon: Clock3, primary: false },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isPersonal, refresh, tasks, currentUserId, activeHousehold, currentUser } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      showError(error);
    } finally {
      setRefreshing(false);
    }
  }

  // Solo tareas del contexto activo (personal o el household actual) — no
  // todas las de cualquier household mezcladas — y solo hoy + atrasadas.
  const taskBadge = currentUser
    ? urgentPendingCount(
        tasks,
        isPersonal
          ? { scope: "personal", ownerId: currentUser.id }
          : { scope: "household", householdId: activeHousehold?.id ?? "" },
        currentUserId!,
      )
    : 0;
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/70 px-4 py-5 lg:flex">
      <div className="px-2">
        <Logo showText={false} />
      </div>

      <div className="mt-8 md:mt-0">
        <ContextSwitcher />
      </div>
      <nav className="mt-8 flex-1" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Hogar
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon
                    className="size-4.5"
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                  {item.label}
                  {item.href === "/tareas" && taskBadge > 0 && (
                    // Cantidad de tareas urgentes (hoy + atrasadas) del
                    // contexto activo, tipo badge de notificaciones — oculto
                    // en 0, capeado en "9+" (ver NavBadge, mismo criterio).
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {taskBadge > 9 ? "9+" : taskBadge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!isPersonal && (
        <Link
          href="/ajustes"
          aria-current={pathname.startsWith("/ajustes") ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
            pathname.startsWith("/ajustes")
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Settings2 className="size-4.5" aria-hidden />
          Ajustes del hogar
        </Link>
      )}

      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:opacity-60"
      >
        <RefreshCw
          className={cn("size-4.5", refreshing && "animate-spin")}
          aria-hidden
        />
        Actualizar datos
      </button>
      <button
        type="button"
        onClick={() => signOut().catch(showError)}
        className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        <LogOut className="size-4.5" aria-hidden />
        Cerrar sesión
      </button>
    </aside>
  );
}
