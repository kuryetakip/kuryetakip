import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const name = typeof body?.name === 'string' ? body.name.trim() : undefined
    const email = typeof body?.email === 'string' ? body.email.trim() : undefined

    if (email !== undefined && !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'E-posta adresi boş bırakılamaz.'
      })
    }

    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || 'admin@kuryetakip.com',
          name: name || 'Operasyon Yöneticisi'
        }
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {})
        }
      })
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      message: 'Ayarlar ve profil bilgileri başarıyla güncellendi.'
    }
  } catch (error: any) {
    console.error('Settings PUT error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ayarlar kaydedilirken hata oluştu.'
    })
  }
})
