import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const courierId = getRouterParam(event, 'id')
    const priceId = getRouterParam(event, 'priceId')

    if (!courierId || !priceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz parametreler.'
      })
    }

    const existing = await prisma.courierVenuePrice.findFirst({
      where: {
        id: priceId,
        courierId
      },
      include: {
        venue: true
      }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Silinecek özel fiyat kaydı bulunamadı.'
      })
    }

    await prisma.courierVenuePrice.delete({
      where: { id: priceId }
    })

    return {
      success: true,
      message: `"${existing.venue.name}" için özel fiyat kaldırıldı. Kurye bu mekan için varsayılan mekan fiyatını kullanacaktır.`
    }
  } catch (error: any) {
    console.error('Courier Price DELETE error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Özel fiyat silinirken bir hata oluştu.'
    })
  }
})
