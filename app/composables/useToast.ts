export interface ToastMessage {
  id: string
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export const useToast = () => {
  const toasts = useState<ToastMessage[]>('app-toasts', () => [])

  const remove = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const show = (options: { message: string; title?: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: ToastMessage = {
      id,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      duration: options.duration ?? 4000
    }

    toasts.value.push(toast)

    if (toast.duration > 0) {
      setTimeout(() => {
        remove(id)
      }, toast.duration)
    }
  }

  const success = (message: string, title?: string) => show({ message, title, type: 'success' })
  const error = (message: string, title?: string) => show({ message, title, type: 'error' })
  const warning = (message: string, title?: string) => show({ message, title, type: 'warning' })
  const info = (message: string, title?: string) => show({ message, title, type: 'info' })

  return {
    toasts: readonly(toasts),
    show,
    remove,
    success,
    error,
    warning,
    info
  }
}
