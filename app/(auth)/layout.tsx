import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md md:w-full flex-col bg-background px-5 py-6">
      {children}
    </div>
  )
}
