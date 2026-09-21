import { prisma, DeliveryType, Prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const dateStr = typeof body?.date === 'string' ? body.date.trim() : ''
    const courierId = typeof body?.courierId === 'string' ? body.courierId.trim() : ''
    let venueId = typeof body?.venueId === 'string' ? body.venueId.trim() : ''

    // Validations: Date & Courier
    if (!dateStr) {
      throw createError({
        statusCode: 400,
        message: 'Kayıt tarihi zorunludur.'
      })
    }

    const parsedDate = new Date(dateStr)
    if (isNaN(parsedDate.getTime())) {
      throw createError({
        statusCode: 400,
        message: 'Geçersiz tarih formatı.'
      })
    }
    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()))

    if (!courierId) {
      throw createError({
        statusCode: 400,
        message: 'Lütfen bir kurye seçiniz.'
      })
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId }
    })
    if (!courier) {
      throw createError({
        statusCode: 404,
        message: 'Seçilen kurye bulunamadı.'
      })
    }

    // Resolve venue: Optional
    let finalVenueId: string | null = venueId || null
    if (finalVenueId) {
      const venueExists = await prisma.venue.findUnique({
        where: { id: finalVenueId }
      })
      if (!venueExists) {
        finalVenueId = null
      }
    }

    // Resolve default rates for fallback if needed
    const resolvedDefault = finalVenueId
      ? await resolveCourierRate(courierId, finalVenueId, DeliveryType.INDOOR).catch(() => null)
      : null

    // Check if submitting combined indoor + outdoor form
    const hasCombinedFields = body?.indoorCount !== undefined || body?.outdoorCount !== undefined

    if (hasCombinedFields) {
      const indoorCount = Number(body?.indoorCount || 0)
      const outdoorCount = Number(body?.outdoorCount || 0)

      // Venue prices
      const rawVenueIndoor = body?.venueIndoorPrice !== undefined ? body.venueIndoorPrice : body?.indoorPrice
      const rawVenueOutdoor = body?.venueOutdoorPrice !== undefined ? body.venueOutdoorPrice : body?.outdoorPrice
      const venueIndoorPrice = Number(rawVenueIndoor ?? resolvedDefault?.venueIndoorPrice ?? 0)
      const venueOutdoorPrice = Number(rawVenueOutdoor ?? resolvedDefault?.venueOutdoorPrice ?? 0)

      // Courier prices
      const rawCourierIndoor = body?.courierIndoorPrice !== undefined ? body.courierIndoorPrice : body?.indoorPrice
      const rawCourierOutdoor = body?.courierOutdoorPrice !== undefined ? body.courierOutdoorPrice : body?.outdoorPrice
      const courierIndoorPrice = Number(rawCourierIndoor ?? resolvedDefault?.courierIndoorPrice ?? courier.indoorPrice ?? 0)
      const courierOutdoorPrice = Number(rawCourierOutdoor ?? resolvedDefault?.courierOutdoorPrice ?? courier.outdoorPrice ?? 0)

      if (indoorCount <= 0 && outdoorCount <= 0) {
        throw createError({
          statusCode: 400,
          message: 'En az bir teslimat tipi için (İç veya Dış Paket) geçerli paket sayısı girilmelidir.'
        })
      }

      if (indoorCount > 0 && (isNaN(courierIndoorPrice) || courierIndoorPrice < 0)) {
        throw createError({
          statusCode: 400,
          message: 'İç paket birim hakediş fiyatı 0 veya daha büyük bir sayı olmalıdır.'
        })
      }

      if (outdoorCount > 0 && (isNaN(courierOutdoorPrice) || courierOutdoorPrice < 0)) {
        throw createError({
          statusCode: 400,
          message: 'Dış paket birim hakediş fiyatı 0 veya daha büyük bir sayı olmalıdır.'
        })
      }

      const createdRecords = []
      let totalCourierSum = 0
      let totalVenueSum = 0
      let totalCount = 0

      // 1. Create INDOOR record if count > 0
      if (indoorCount > 0) {
        const vSnap = finalVenueId ? Number(venueIndoorPrice.toFixed(2)) : 0
        const vTot = Number((indoorCount * vSnap).toFixed(2))
        const cSnap = Number(courierIndoorPrice.toFixed(2))
        const cTot = Number((indoorCount * cSnap).toFixed(2))

        totalVenueSum += vTot
        totalCourierSum += cTot
        totalCount += indoorCount

        const rec = await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId: finalVenueId,
            deliveryType: DeliveryType.INDOOR,
            packageCount: indoorCount,
            venuePriceSnapshot: new Prisma.Decimal(vSnap.toFixed(2)),
            venueTotalAmount: new Prisma.Decimal(vTot.toFixed(2)),
            courierPriceSnapshot: new Prisma.Decimal(cSnap.toFixed(2)),
            courierTotalAmount: new Prisma.Decimal(cTot.toFixed(2)),
            unitPriceSnapshot: new Prisma.Decimal(cSnap.toFixed(2)),
            totalAmount: new Prisma.Decimal(cTot.toFixed(2))
          },
          include: { courier: true, venue: true }
        })
        createdRecords.push(rec)
      }

      // 2. Create OUTDOOR record if count > 0
      if (outdoorCount > 0) {
        const vSnap = finalVenueId ? Number(venueOutdoorPrice.toFixed(2)) : 0
        const vTot = Number((outdoorCount * vSnap).toFixed(2))
        const cSnap = Number(courierOutdoorPrice.toFixed(2))
        const cTot = Number((outdoorCount * cSnap).toFixed(2))

        totalVenueSum += vTot
        totalCourierSum += cTot
        totalCount += outdoorCount

        const rec = await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId: finalVenueId,
            deliveryType: DeliveryType.OUTDOOR,
            packageCount: outdoorCount,
            venuePriceSnapshot: new Prisma.Decimal(vSnap.toFixed(2)),
            venueTotalAmount: new Prisma.Decimal(vTot.toFixed(2)),
            courierPriceSnapshot: new Prisma.Decimal(cSnap.toFixed(2)),
            courierTotalAmount: new Prisma.Decimal(cTot.toFixed(2)),
            unitPriceSnapshot: new Prisma.Decimal(cSnap.toFixed(2)),
            totalAmount: new Prisma.Decimal(cTot.toFixed(2))
          },
          include: { courier: true, venue: true }
        })
        createdRecords.push(rec)
      }

      return {
        success: true,
        data: createdRecords,
        message: `${courier.name} için toplam ${totalCount} paket kaydı (Kurye Hakedişi: ${totalCourierSum.toFixed(2)} ₺, Mekan Tutar: ${totalVenueSum.toFixed(2)} ₺) başarıyla kaydedildi.`
      }
    }

    // Single record submission (for edit or single add)
    const deliveryTypeStr = body?.deliveryType === 'OUTDOOR' ? 'OUTDOOR' : 'INDOOR'
    const packageCount = Number(body?.packageCount)
    const deliveryType = deliveryTypeStr === 'OUTDOOR' ? DeliveryType.OUTDOOR : DeliveryType.INDOOR

    const rawVenuePrice = body?.venueUnitPrice !== undefined ? body.venueUnitPrice : body?.unitPrice
    const rawCourierPrice = body?.courierUnitPrice !== undefined ? body.courierUnitPrice : body?.unitPrice

    const venueUnitPrice = Number(rawVenuePrice ?? (deliveryType === DeliveryType.INDOOR ? resolvedDefault?.venueIndoorPrice : resolvedDefault?.venueOutdoorPrice) ?? 0)
    const courierUnitPrice = Number(rawCourierPrice ?? (deliveryType === DeliveryType.INDOOR ? resolvedDefault?.courierIndoorPrice : resolvedDefault?.courierOutdoorPrice) ?? venueUnitPrice)

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

    const vSnap = finalVenueId ? Number(venueUnitPrice.toFixed(2)) : 0
    const vTot = Number((packageCount * vSnap).toFixed(2))
    const cSnap = Number(courierUnitPrice.toFixed(2))
    const cTot = Number((packageCount * cSnap).toFixed(2))

    const record = await prisma.deliveryRecord.create({
      data: {
        date: utcDate,
        courierId,
        venueId: finalVenueId,
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
        id: record.id,
        date: record.date.toISOString().substring(0, 10),
        courierId: record.courierId,
        venueId: record.venueId,
        deliveryType: record.deliveryType,
        packageCount: record.packageCount,
        venuePriceSnapshot: Number(record.venuePriceSnapshot),
        venueTotalAmount: Number(record.venueTotalAmount),
        courierPriceSnapshot: Number(record.courierPriceSnapshot),
        courierTotalAmount: Number(record.courierTotalAmount),
        unitPriceSnapshot: Number(record.unitPriceSnapshot),
        totalAmount: Number(record.totalAmount),
        courier: record.courier,
        venue: record.venue
      },
      message: `${courier.name} için ${packageCount} adet ${deliveryType === DeliveryType.INDOOR ? 'İç Mekan' : 'Dış Mekan'} paket kaydı oluşturuldu (Kurye: ${cTot.toFixed(2)} ₺, Mekan: ${vTot.toFixed(2)} ₺).`
    }
  } catch (error: any) {
    console.error('Deliveries POST error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || 'Paket kaydı oluşturulurken bir hata oluştu.'
    })
  }
})
