export default defineNuxtRouteMiddleware(async (to) => {
  const { user, initialized, fetchSession } = useAuth()

  // Always ensure session is checked on SSR / first client route entry
  if (!initialized.value) {
    await fetchSession()
  }

  const isAuth = !!user.value

  // If navigating to login page
  if (to.path === '/login') {
    if (isAuth) {
      return navigateTo('/deliveries')
    }
    return
  }

  // If navigating to any protected route (venues, couriers, deliveries, reports, settings, etc.)
  if (!isAuth) {
    return navigateTo('/login')
  }

  // If root route / redirect to default home /deliveries
  if (to.path === '/') {
    return navigateTo('/deliveries')
  }
})
