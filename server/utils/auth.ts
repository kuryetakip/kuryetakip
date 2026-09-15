import type { H3Event } from 'h3'

export interface AuthUser {
  id: string
  name: string
  email: string
  username: string
  role: string
}

const AUTH_COOKIE_NAME = 'auth_session'
const SECRET_SALT = process.env.AUTH_SECRET || 'kuryetakip-production-session-secret-2026'

/**
 * Creates a signed session token
 */
export function createSessionToken(user: AuthUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
  })
  const base64 = Buffer.from(payload).toString('base64url')
  const signature = Buffer.from(`${base64}.${SECRET_SALT}`).toString('base64url')
  return `${base64}.${signature}`
}

/**
 * Verifies and decodes session token
 */
export function verifySessionToken(token?: string | null): AuthUser | null {
  if (!token) return null

  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [base64, signature] = parts
    const expectedSignature = Buffer.from(`${base64}.${SECRET_SALT}`).toString('base64url')

    if (signature !== expectedSignature) {
      return null
    }

    const payloadStr = Buffer.from(base64, 'base64url').toString('utf8')
    const data = JSON.parse(payloadStr)

    if (!data.exp || data.exp < Date.now()) {
      return null // Expired
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      username: data.username,
      role: data.role || 'admin'
    }
  } catch {
    return null
  }
}

/**
 * Extracts and verifies auth session from H3 event (cookie or header)
 */
export function getAuthenticatedUser(event: H3Event): AuthUser | null {
  // 1. Try cookie
  const cookieToken = getCookie(event, AUTH_COOKIE_NAME)
  if (cookieToken) {
    const user = verifySessionToken(cookieToken)
    if (user) return user
  }

  // 2. Try Authorization Bearer header
  const authHeader = getRequestHeader(event, 'authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    const user = verifySessionToken(token)
    if (user) return user
  }

  return null
}

/**
 * Sets secure HttpOnly session cookie
 */
export function setAuthCookie(event: H3Event, token: string) {
  setCookie(event, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
}

/**
 * Clears auth cookie on logout
 */
export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, AUTH_COOKIE_NAME, {
    path: '/'
  })
}
