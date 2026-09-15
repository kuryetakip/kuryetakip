import { getAuthenticatedUser } from '../../utils/auth'

export default defineEventHandler((event) => {
  const user = getAuthenticatedUser(event)

  if (!user) {
    return {
      authenticated: false,
      user: null
    }
  }

  return {
    authenticated: true,
    user
  }
})
