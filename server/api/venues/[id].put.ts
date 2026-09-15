import { prisma, DeliveryType, Prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz mekan ID.'
      })
    }

    const body = await readBody(event)

    const existing = await prisma.venue.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Güncellenmek istenen mekan bulunamadı.'
      })
    }

    const dataToUpdate: any = {}

    if (body?.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Mekan adı boş olamaz.'
        })
      }
      dataToUpdate.name = name
    }

    let finalIndoorPrice = Number(existing.indoorPrice)
    let finalOutdoorPrice = Number(existing.outdoorPrice)

    if (body?.indoorPrice !== undefined) {
      const indoorPriceNum = Number(body.indoorPrice)
      if (isNaN(indoorPriceNum) || indoorPriceNum < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geçerli bir iç teslimat fiyatı (>= 0) giriniz.'
        })
      }
      finalIndoorPrice = indoorPriceNum
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
      finalOutdoorPrice = outdoorPriceNum
      dataToUpdate.outdoorPrice = new Prisma.Decimal(outdoorPriceNum.toFixed(2))
    }

    if (body?.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(body.isActive)
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: dataToUpdate
    })

    // If daily delivery records are provided with the update
    const courierId = typeof body?.courierId === 'string' && body.courierId.trim() ? body.courierId.trim() : null
    const indoorCount = Number(body?.indoorCount || 0)
    const outdoorCount = Number(body?.outdoorCount || 0)
    const dateStr = typeof body?.date === 'string' ? body.date.trim() : ''

    if (indoorCount > 0 || outdoorCount > 0) {
      const d = dateStr ? new Date(dateStr) : new Date()
      const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))

      if (indoorCount > 0) {
        const total = Number((indoorCount * finalIndoorPrice).toFixed(2))
        await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId: updated.id,
            deliveryType: DeliveryType.INDOOR,
            packageCount: indoorCount,
            unitPriceSnapshot: new Prisma.Decimal(finalIndoorPrice.toFixed(2)),
            totalAmount: new Prisma.Decimal(total.toFixed(2))
          }
        })
      }

      if (outdoorCount > 0) {
        const total = Number((outdoorCount * finalOutdoorPrice).toFixed(2))
        await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId: updated.id,
            deliveryType: DeliveryType.OUTDOOR,
            packageCount: outdoorCount,
            unitPriceSnapshot: new Prisma.Decimal(finalOutdoorPrice.toFixed(2)),
            totalAmount: new Prisma.Decimal(total.toFixed(2))
          }
        })
      }
    }

    return {
      success: true,
      data: {
        ...updated,
        indoorPrice: Number(updated.indoorPrice),
        outdoorPrice: Number(updated.outdoorPrice)
      },
      message: 'Mekan ve günlük paket kayıtları başarıyla güncellendi.'
    }
  } catch (error: any) {
    console.error('Venues PUT error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Mekan güncellenirken bir hata oluştu.'
    })
  }
})

