import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz kurye ID.'
      })
    }

    const courier = await prisma.courier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            deliveryRecords: true,
            courierVenuePrices: true
          }
        },
        courierVenuePrices: {
          include: {
            venue: true
          }
        }
      }
    })

    if (!courier) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kurye bulunamadı.'
      })
    }

    return {
      success: true,
      data: {
        ...courier,
        hasRecords: (courier._count.deliveryRecords + courier._count.courierVenuePrices) > 0,
        deliveryCount: courier._count.deliveryRecords,
        customPriceCount: courier._count.courierVenuePrices,
        courierVenuePrices: courier.courierVenuePrices.map(p => ({
          ...p,
          indoorPrice: Number(p.indoorPrice),
          outdoorPrice: Number(p.outdoorPrice),
          venue: {
            ...p.venue,
            indoorPrice: Number(p.venue.indoorPrice),
            outdoorPrice: Number(p.venue.outdoorPrice)
          }
        }))
      }
    }
  } catch (error: any) {
    console.error('Courier Detail GET error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kurye bilgileri getirilirken bir hata oluştu.'
    })
  }
})
