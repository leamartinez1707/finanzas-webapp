import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { AuthGuard } from '@/components/auth-guard'
import { BusyBar } from '@/components/busy-bar'
import { DataLoadRecovery } from '@/components/data-load-recovery'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <BusyBar />
      <div className="relative flex min-h-dvh w-full flex-col bg-background lg:flex-row">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="w-full flex-1 px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-4 lg:px-10 lg:pb-10 lg:pt-8"><DataLoadRecovery />{children}</main>
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}
