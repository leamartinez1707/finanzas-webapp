import { enqueueSnackbar } from 'notistack'
import { getSpanishErrorMessage } from './error-message'

export function showSuccess(message: string) {
  enqueueSnackbar(message, { variant: 'success' })
}

export function showError(error: unknown) {
  enqueueSnackbar(getSpanishErrorMessage(error), { variant: 'error' })
}
