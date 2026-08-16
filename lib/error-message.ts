export function getSpanishErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'El email o la contraseña no son correctos.'
  }
  if (message.includes('email not confirmed')) return 'Confirmá tu email antes de entrar.'
  if (message.includes('user already registered')) return 'Ya existe una cuenta con ese email.'
  if (message.includes('password')) return 'La contraseña no cumple los requisitos.'
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Demasiados intentos. Esperá un momento y probá de nuevo.'
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('offline')) {
    return 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.'
  }
  if (message.includes('permission') || message.includes('not authorized') || message.includes('row-level security')) {
    return 'No tenés permiso para realizar esta acción.'
  }
  if (message.includes('duplicate') || message.includes('already exists')) {
    return 'Ese registro ya existe.'
  }
  if (message.includes('not authenticated') || message.includes('jwt')) {
    return 'Tu sesión venció. Iniciá sesión nuevamente.'
  }

  return 'No pudimos completar la acción. Intentá de nuevo.'
}
