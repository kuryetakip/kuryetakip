import { prisma, Prisma } from '../../../../utils/prisma'

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

    const body = await readBody(event)

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
        statusMessage: 'Güncellenecek özel fiyat kaydı bulunamadı.'
      })
    }

    const dataToUpdate: any = {}

    if (body?.indoorPrice !== undefined) {
      const indoorPriceNum = Number(body.indoorPrice)
      if (isNaN(indoorPriceNum) || indoorPriceNum < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geçerli bir iç teslimat fiyatı (>= 0) giriniz.'
        })
      }
      dataToUpdate.indoorPrice = new Prisma.Decimal(indoorPriceNum.toFixed(2))
    }

    if (body?.outdoorPrice !== undefined) {
      const outdoorPriceNum = Number(body.outdoorPrice)
      if (isNaN(outdoorPriceNum) || outdoorPriceNum < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geçerli bir dış teslimat fiyatı (>= 0) giriniz.'
        })
      }
      dataToUpdate.outdoorPrice = new Prisma.Decimal(outdoorPriceNum.toFixed(2))
    }

    const updated = await prisma.courierVenuePrice.update({
      where: { id: priceId },
      data: dataToUpdate,
      include: {
        venue: true
      }
    })

    return {
      success: true,
      data: {
        id: updated.id,
        courierId: updated.courierId,
        venueId: updated.venueId,
        indoorPrice: Number(updated.indoorPrice),
        outdoorPrice: Number(updated.outdoorPrice),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        venue: {
          id: updated.venue.id,
          name: updated.venue.name,
          indoorPrice: Number(updated.venue.indoorPrice),
          outdoorPrice: Number(updated.venue.outdoorPrice),
          isActive: updated.venue.isActive
        }
      },
      message: `"${updated.venue.name}" için özel fiyat güncellendi.`
    }
  } catch (error: any) {
    console.error('Courier Price PUT error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Özel fiyat güncellenirken bir hata oluştu.'
    })
  }
})
