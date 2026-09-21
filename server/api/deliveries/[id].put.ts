import { prisma, DeliveryType, Prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Geçersiz kayıt ID.'
      })
    }

    const body = await readBody(event)

    const existing = await prisma.deliveryRecord.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Güncellenecek paket kaydı bulunamadı.'
      })
    }

    const dateStr = body?.date ? String(body.date).trim() : null
    const courierId = body?.courierId ? String(body.courierId).trim() : existing.courierId
    const venueId = body?.venueId ? String(body.venueId).trim() : existing.venueId
    const deliveryTypeStr = body?.deliveryType !== undefined ? body.deliveryType : existing.deliveryType
    const packageCount = body?.packageCount !== undefined ? Number(body.packageCount) : existing.packageCount
    
    const rawVenuePrice = body?.venueUnitPrice !== undefined
      ? body.venueUnitPrice
      : (body?.venuePriceSnapshot !== undefined ? body.venuePriceSnapshot : Number(existing.venuePriceSnapshot || existing.unitPriceSnapshot))
    const rawCourierPrice = body?.courierUnitPrice !== undefined
      ? body.courierUnitPrice
      : (body?.courierPriceSnapshot !== undefined ? body.courierPriceSnapshot : (body?.unitPrice !== undefined ? body.unitPrice : Number(existing.courierPriceSnapshot || existing.unitPriceSnapshot)))

    const venueUnitPrice = Number(rawVenuePrice)
    const courierUnitPrice = Number(rawCourierPrice)

    if (isNaN(packageCount) || !Number.isInteger(packageCount) || packageCount <= 0) {
      throw createError({
        statusCode: 400,
        message: 'Paket sayısı 0\'dan büyük bir tam sayı olmalıdır.'
      })
    }

    if (isNaN(venueUnitPrice) || venueUnitPrice < 0 || isNaN(courierUnitPrice) || courierUnitPrice < 0) {
      throw createError({
        statusCode: 400,
        message: 'Birim fiyatlar 0 veya daha büyük bir sayı olmalıdır.'
      })
    }

    const deliveryType = deliveryTypeStr === 'OUTDOOR' ? DeliveryType.OUTDOOR : DeliveryType.INDOOR

    let utcDate = existing.date
    if (dateStr) {
      const parsedDate = new Date(dateStr)
      if (isNaN(parsedDate.getTime())) {
        throw createError({
          statusCode: 400,
          message: 'Geçersiz tarih formatı.'
        })
      }
      utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()))
    }

    // Server-side total calculation
    const vSnap = Number(venueUnitPrice.toFixed(2))
    const vTot = Number((packageCount * vSnap).toFixed(2))
    const cSnap = Number(courierUnitPrice.toFixed(2))
    const cTot = Number((packageCount * cSnap).toFixed(2))

    const updated = await prisma.deliveryRecord.update({
      where: { id },
      data: {
        date: utcDate,
        courierId,
        venueId,
        deliveryType,
        packageCount,
        venuePriceSnapshot: new Prisma.Decimal(vSnap.toFixed(2)),
        venueTotalAmount: new Prisma.Decimal(vTot.toFixed(2)),
        courierPriceSnapshot: new Prisma.Decimal(cSnap.toFixed(2)),
        courierTotalAmount: new Prisma.Decimal(cTot.toFixed(2)),
        unitPriceSnapshot: new Prisma.Decimal(cSnap.toFixed(2)),
        totalAmount: new Prisma.Decimal(cTot.toFixed(2))
      },
      include: {
        courier: true,
        venue: true
      }
    })

    return {
      success: true,
      data: {
        id: updated.id,
        date: updated.date.toISOString().substring(0, 10),
        courierId: updated.courierId,
        venueId: updated.venueId,
        deliveryType: updated.deliveryType,
        packageCount: updated.packageCount,
        venuePriceSnapshot: Number(updated.venuePriceSnapshot),
        venueTotalAmount: Number(updated.venueTotalAmount),
        courierPriceSnapshot: Number(updated.courierPriceSnapshot),
        courierTotalAmount: Number(updated.courierTotalAmount),
        unitPriceSnapshot: Number(updated.unitPriceSnapshot),
        totalAmount: Number(updated.totalAmount),
        courier: updated.courier,
        venue: updated.venue
      },
      message: 'Paket kaydı başarıyla güncellendi.'
    }
  } catch (error: any) {
    console.error('Deliveries PUT error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || 'Paket kaydı güncellenirken bir hata oluştu.'
    })
  }
})
