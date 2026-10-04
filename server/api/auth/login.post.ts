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

    // Check credentials: allow 'admin123' and 'Admin@2026!'
    const isValidUsername = usernameOrEmail === 'admin' || usernameOrEmail === 'admin@kuryetakip.com'
    const isValidPassword = password === 'admin123' || password === 'Admin@2026!'

    if (!isValidUsername || !isValidPassword) {
      throw createError({
        statusCode: 401,
        message: 'Geçersiz kullanıcı adı veya şifre.'
      })
    }

    let userId = 'admin-default-id'

    // Try finding or ensuring User record in DB without blocking or crashing auth if DB is slow/offline
    try {
      const dbPromise = (async () => {
        let dbUser = await prisma.user.findFirst({
          where: { email: 'admin@kuryetakip.com' }
        })

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: 'Admin',
              email: 'admin@kuryetakip.com'
            }
          })
        }

        return dbUser?.id || null
      })()

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
      const foundId = await Promise.race([dbPromise, timeoutPromise])
      if (foundId) {
        userId = foundId
      }
    } catch (dbError) {
      console.warn('Veritabanına ulaşılamadı, yerel admin oturumuyla devam ediliyor:', dbError)
    }

    const authUser: AuthUser = {
      id: userId,
      name: 'Admin',
      email: 'admin@kuryetakip.com',
      username: 'admin',
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
