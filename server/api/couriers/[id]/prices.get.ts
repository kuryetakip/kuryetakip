import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const courierId = getRouterParam(event, 'id')
    if (!courierId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz kurye ID.'
      })
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId }
    })

    if (!courier) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kurye bulunamadı.'
      })
    }

    const prices = await prisma.courierVenuePrice.findMany({
      where: { courierId },
      include: {
        venue: true
      },
      orderBy: {
        venue: {
          name: 'asc'
        }
      }
    })

    return {
      success: true,
      data: prices.map(p => ({
        id: p.id,
        courierId: p.courierId,
        venueId: p.venueId,
        indoorPrice: Number(p.indoorPrice),
        outdoorPrice: Number(p.outdoorPrice),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        venue: {
          id: p.venue.id,
          name: p.venue.name,
          indoorPrice: Number(p.venue.indoorPrice),
          outdoorPrice: Number(p.venue.outdoorPrice),
          isActive: p.venue.isActive
        }
      }))
    }
  } catch (error: any) {
    console.error('Courier Prices GET error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kurye özel fiyatları listelenirken bir hata oluştu.'
    })
  }
})
