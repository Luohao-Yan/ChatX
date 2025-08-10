import { RequestError } from '@/lib/request-adapter'
import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  // eslint-disable-next-line no-console
  console.log(error)

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  if (error instanceof RequestError) {
    errMsg = (error.response?.data as any)?.title || (error.data as any)?.title || error.message
  }

  toast.error(errMsg)
}
