'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { showError } from '@/lib/toast'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        showError(error)
        router.replace('/')
        return
      }
      if (!session) {
        router.replace('/')
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        showError(profileError)
        router.replace('/')
        return
      }

      if (!data) {
        router.replace('/onboarding')
        return
      }

      setReady(true)
    }).catch((error) => {
      showError(error)
      router.replace('/')
    })
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
