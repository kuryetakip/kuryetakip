import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'theme_preference'

export function useTheme() {
  // Global state across components
  const themePreference = useState<ThemeMode>('app-theme-preference', () => 'system')
  const systemIsDark = useState<boolean>('app-system-is-dark', () => false)

  // Computed whether the current active theme is effectively dark
  const isDark = computed(() => {
    if (themePreference.value === 'dark') return true
    if (themePreference.value === 'light') return false
    return systemIsDark.value
  })

  // Apply class to HTML element
  const applyTheme = (dark: boolean) => {
    if (import.meta.client) {
      const root = document.documentElement
      if (dark) {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    }
  }

  // Set theme preference and persist
  const setTheme = (mode: ThemeMode) => {
    themePreference.value = mode
    if (import.meta.client) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode)
      } catch (e) {
        console.error('Failed to save theme to localStorage:', e)
      }

      const activeDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      applyTheme(activeDark)
    }
  }

  // Quick toggle between light and dark
  const toggleTheme = () => {
    if (isDark.value) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  // Initialize and attach listener on client
  const initTheme = () => {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          themePreference.value = stored
        } else {
          themePreference.value = 'system'
        }
      } catch (e) {
        themePreference.value = 'system'
      }

      // Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemIsDark.value = mediaQuery.matches

      // Listen for system changes
      const updateSystemTheme = (e: MediaQueryListEvent) => {
        systemIsDark.value = e.matches
        if (themePreference.value === 'system') {
          applyTheme(e.matches)
        }
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateSystemTheme)
      } else {
        mediaQuery.addListener(updateSystemTheme)
      }

      applyTheme(isDark.value)
    }
  }

  // Watch for changes to effectively dark
  watch(isDark, (newIsDark) => {
    applyTheme(newIsDark)
  })

  return {
    themePreference,
    isDark,
    setTheme,
    toggleTheme,
    initTheme
  }
}
