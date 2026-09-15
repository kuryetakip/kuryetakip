import { defineNuxtPlugin } from '#app'
import { useTheme } from '~/composables/useTheme'

export default defineNuxtPlugin((nuxtApp) => {
  const { initTheme } = useTheme()
  initTheme()
})
