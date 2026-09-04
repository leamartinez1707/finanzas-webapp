"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/sheet";
import { NAV_ITEMS } from "@/components/app-sidebar";
import { useApp } from "@/lib/store";
import { myTasks } from "@/lib/tasks";

const primaryItems = NAV_ITEMS.filter((item) => item.primary);
const moreItems = NAV_ITEMS.filter((item) => !item.primary);

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const moreActive = moreItems.some((item) => isActive(item.href));

  const { tasks, currentUserId } = useApp();

  const personalTasksCount = myTasks(tasks, currentUserId!).filter(
    (t) => !t.completed,
  ).length;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/85 backdrop-blur-lg lg:hidden"
        aria-label="Navegación principal"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 md:max-w-xl md:px-8">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors relative",
                      active && "bg-primary/12",
                    )}
                  >
                    {item.href === "/tareas" ? (
                      // Mostrar las tareas y la cantidad de tareas, como si fuese un badge de notificaciones
                      <span className="absolute -top-2 -right-1 mt-1 mr-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {personalTasksCount}
                      </span>
                    ) : null}
                    <Icon className="size-4.5" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors",
                moreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-haspopup="true"
              aria-expanded={moreOpen}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  moreActive && "bg-primary/12",
                )}
              >
                <MoreHorizontal
                  className="size-4.5"
                  strokeWidth={moreActive ? 2.5 : 2}
                />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Más">
        <ul className="space-y-1 pb-1">
          {moreItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-foreground hover:bg-muted/70",
                  )}
                >
                  <Icon
                    className="size-4.5"
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
