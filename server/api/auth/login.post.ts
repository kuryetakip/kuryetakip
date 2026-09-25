import { prisma } from '../../utils/prisma'
import { createSessionToken, setAuthCookie, type AuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const usernameOrEmail = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password.trim() : ''

    if (!usernameOrEmail || !password) {
      throw createError({
        statusCode: 400,
        message: 'Kullanıcı adı ve şifre zorunludur.'
      })
    }

    // Check credentials: user specified username "adem" and password "1"
    const isValidUsername = usernameOrEmail === 'adem' || usernameOrEmail === 'adem@kuryetakip.com' || usernameOrEmail === 'admin@kuryetakip.com'
    const isValidPassword = password === '1'

    if (!isValidUsername || !isValidPassword) {
      throw createError({
        statusCode: 401,
        message: 'Geçersiz kullanıcı adı veya şifre.'
      })
    }

    // Find or ensure User record in DB
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'adem@kuryetakip.com' },
          { email: 'admin@kuryetakip.com' }
        ]
      }
    })

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          name: 'Adem',
          email: 'adem@kuryetakip.com'
        }
      })
    }

    const authUser: AuthUser = {
      id: dbUser.id,
      name: dbUser.name || 'Adem',
      email: dbUser.email,
      username: 'adem',
      role: 'admin'
    }

    const token = createSessionToken(authUser)
    setAuthCookie(event, token)

    return {
      success: true,
      message: 'Giriş başarılı.',
      user: authUser
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Login error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Giriş yapılırken sunucu hatası oluştu.'
    })
  }
})
