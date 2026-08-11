'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Sparkles, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand'
import { Field, inputClass } from '@/components/field'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
  const [isRegister, setIsRegister] = useState(false)
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
      if (err) return setError(err.message)
      setMagicSent(true)
      return
    }

    if (isRegister) {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${redirect || '/onboarding'}` },
      })
      if (err) return setError(err.message)
      window.location.href = redirect || '/onboarding'
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) return setError(err.message)
    window.location.href = redirect || '/inicio'
  }

  return (
    <div className="flex flex-1 flex-col">
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

        <div className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1">
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
