import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : (body?.phone ? String(body.phone).trim() : null)
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true

    // Server-side validations
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kurye ad ve soyadı zorunludur.'
      })
    }

    const courier = await prisma.courier.create({
      data: {
        name,
        phone: phone || null,
        isActive
      }
    })

    return {
      success: true,
      data: courier,
      message: 'Kurye başarıyla oluşturuldu.'
    }
  } catch (error: any) {
    console.error('Couriers POST error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kurye kaydedilirken bir hata oluştu.'
    })
  }
})
