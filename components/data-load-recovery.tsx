'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { getSpanishErrorMessage } from '@/lib/error-message'

export function DataLoadRecovery() {
  const { loading, loadError, refresh } = useApp()
  const [retrying, setRetrying] = useState(false)

  if (loading || !loadError) return null

  async function retry() {
    setRetrying(true)
    try {
      await refresh()
    } catch {
      // The store keeps and reports the original error.
    } finally {
      setRetrying(false)
    }
  }

  return (
    <section className="mx-auto mb-4 max-w-xl rounded-2xl border border-destructive/30 bg-card p-5 text-center" role="alert">
      <h1 className="font-display text-xl font-semibold">No pudimos cargar tus datos</h1>
      <p className="mt-2 text-sm text-muted-foreground">{getSpanishErrorMessage(loadError)}</p>
      <button type="button" onClick={retry} disabled={retrying} className="mt-4 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">
        {retrying ? 'Reintentando...' : 'Intentar de nuevo'}
      </button>
    </section>
  )
}
