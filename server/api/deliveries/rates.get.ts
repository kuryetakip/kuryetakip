import { resolveCourierRate } from '../../utils/pricing'
import { DeliveryType } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const courierId = typeof query.courierId === 'string' ? query.courierId.trim() : ''
    const venueId = typeof query.venueId === 'string' ? query.venueId.trim() : ''
    const deliveryType = query.deliveryType === 'OUTDOOR' ? DeliveryType.OUTDOOR : DeliveryType.INDOOR

    if (!courierId || !venueId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'courierId ve venueId zorunludur.'
      })
    }

    const rateInfo = await resolveCourierRate(courierId, venueId, deliveryType)

    return {
      success: true,
      data: rateInfo
    }
  } catch (error: any) {
    console.error('Resolve Rate GET error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Fiyat bilgisi hesaplanırken bir hata oluştu.'
    })
  }
})
