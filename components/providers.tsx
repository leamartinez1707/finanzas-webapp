'use client'

import { SnackbarProvider } from 'notistack'
import { AppProvider } from '@/lib/store'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={3500}
      maxSnack={3}
      preventDuplicate
      dense
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      <AppProvider>{children}</AppProvider>
    </SnackbarProvider>
  )
}
