import { getAuthenticatedUser } from '../utils/auth'

export default defineEventHandler((event) => {
  const path = getRequestPath(event)

  // Only guard /api/* routes
  if (!path.startsWith('/api/')) {
    return
  }

  // Public / Non-protected API routes
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/session'
  ]

  if (publicApiRoutes.some(route => path.startsWith(route))) {
    return
  }

  // Verify authentication
  const user = getAuthenticatedUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Giriş yapmanız gerekmektedir.'
    })
  }

  // Attach user to context for downstream API handlers
  event.context.user = user
})
