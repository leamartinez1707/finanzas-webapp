'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand'
import { Field, inputClass } from '@/components/field'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getSpanishErrorMessage } from '@/lib/error-message'
import { showSuccess } from '@/lib/toast'
import { safeRedirect } from '@/lib/safe-redirect'

// Google sign-in needs an OAuth client configured in Supabase Auth first —
// flip this once that's set up (see supabase.com/docs/guides/auth/social-login/auth-google).
const GOOGLE_AUTH_ENABLED = false

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [isRegister, setIsRegister] = useState(searchParams.get('modo') === 'registro')
  const [magicSent, setMagicSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()

    if (mode === 'magic') {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/inicio` },
      })
       if (err) return setError(getSpanishErrorMessage(err))
       setMagicSent(true)
       showSuccess('Te enviamos el link de acceso.')
      return
    }

    if (isRegister) {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${safeRedirect(redirect, '/onboarding')}` },
      })
        if (err) return setError(getSpanishErrorMessage(err))
       window.location.href = safeRedirect(redirect, '/onboarding')
      return
    }

      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) return setError(getSpanishErrorMessage(err))
      window.location.href = safeRedirect(redirect, '/inicio')
  }

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${safeRedirect(redirect, '/inicio')}` },
    })
    if (err) setError(getSpanishErrorMessage(err))
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Nido
      </Link>

      <div className="flex flex-1 flex-col justify-center py-6">
        <Logo size="lg" />
        <h1 className="mt-8 text-balance text-3xl font-bold leading-tight tracking-tight">
          {isRegister ? 'Creá tu cuenta' : 'Hola de nuevo'}
        </h1>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
          {isRegister
            ? 'Empezá a llevar las cuentas de tu casa y las tuyas, sin planillas.'
            : 'Las cuentas de tu casa y las tuyas, en un solo lugar.'}
        </p>

        {GOOGLE_AUTH_ENABLED && (
          <>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-card py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              <GoogleIcon className="size-[18px]" />
              Continuar con Google
            </button>
            <div className="mt-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              o
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <div className={cn('grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1', GOOGLE_AUTH_ENABLED ? 'mt-5' : 'mt-6')}>
          <button
            onClick={() => setMode('password')}
            className={cn(
              'rounded-xl py-2 text-sm font-medium transition-colors',
              mode === 'password'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            Email y contraseña
          </button>
          <button
            onClick={() => setMode('magic')}
            className={cn(
              'rounded-xl py-2 text-sm font-medium transition-colors',
              mode === 'magic' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            Link mágico
          </button>
        </div>

        {magicSent ? (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/8 p-5 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </span>
            <p className="mt-3 font-semibold">Revisá tu correo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Te mandamos un link para entrar sin contraseña.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vos@ejemplo.com"
                    className={cn(inputClass, 'pl-11')}
                  />
              </div>
            </Field>

            {mode === 'password' && (
              <Field label="Contraseña" htmlFor="password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </Field>
            )}

            {error && (
              <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px"
            >
              {mode === 'magic'
                ? 'Enviarme el link'
                : isRegister
                  ? 'Crear cuenta'
                  : 'Entrar'}
              <ArrowRight className="size-[18px]" />
            </button>
          </form>
        )}
      </div>

      <p className="pb-2 text-center text-sm text-muted-foreground">
        {isRegister ? '¿Ya tenés cuenta?' : '¿Todavía no tenés cuenta?'}{' '}
        <button
          onClick={() => {
            setIsRegister((v) => !v)
            setMagicSent(false)
          }}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {isRegister ? 'Iniciá sesión' : 'Registrate'}
        </button>
      </p>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.61 4.6 1.79l3.44-3.44C17.94 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76Z"
      />
    </svg>
  )
}
