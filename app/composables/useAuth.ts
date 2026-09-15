import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from './useToast'

export interface UserSession {
  id: string
  name: string
  email: string
  username: string
  role: string
}

export function useAuth() {
  const router = useRouter()
  const toast = useToast()

  // Nuxt global state for session so it is shared across all components
  const user = useState<UserSession | null>('auth_user', () => null)
  const loading = useState<boolean>('auth_loading', () => false)
  const initialized = useState<boolean>('auth_initialized', () => false)

  const isAuthenticated = computed(() => !!user.value)

  const fetchSession = async () => {
    loading.value = true
    try {
      const res = await $fetch<{ authenticated: boolean; user: UserSession | null }>('/api/auth/session')
      if (res.authenticated && res.user) {
        user.value = res.user
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; user: UserSession; message: string }>('/api/auth/login', {
        method: 'POST',
        body: { username, password }
      })

      if (res.success && res.user) {
        user.value = res.user
        toast.success(`Hoş geldiniz, ${res.user.name || res.user.username}!`)
        await router.push('/venues')
        return true
      }
      return false
    } catch (err: any) {
      const errorMsg = err.data?.statusMessage || err.message || 'Kullanıcı adı veya şifre hatalı.'
      toast.error(errorMsg)
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      toast.info('Oturum kapatıldı.')
      await router.push('/login')
    } catch (err: any) {
      console.error('Logout error:', err)
      user.value = null
      await router.push('/login')
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    initialized,
    isAuthenticated,
    fetchSession,
    login,
    logout
  }
}
