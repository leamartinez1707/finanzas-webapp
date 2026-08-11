import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { AuthGuard } from '@/components/auth-guard'
import { BusyBar } from '@/components/busy-bar'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <BusyBar />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-[0_0_60px_-20px_rgba(0,0,0,0.15)] md:max-w-4xl md:shadow-none md:border-x md:border-border">
        <AppHeader />
        <main className="flex-1 px-3 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}
