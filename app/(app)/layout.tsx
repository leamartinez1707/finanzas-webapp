import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-background shadow-[0_0_60px_-20px_rgba(0,0,0,0.15)] sm:my-0">
      <AppHeader />
      <main className="flex-1 px-4 pb-6 pt-4">{children}</main>
      <BottomNav />
    </div>
  )
}
