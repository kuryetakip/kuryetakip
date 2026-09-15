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

    // Resolve venue: If not provided, find first active venue or create default
    if (!venueId) {
      const activeVenue = await prisma.venue.findFirst({
        where: { isActive: true }
      }) || await prisma.venue.findFirst()

      if (activeVenue) {
        venueId = activeVenue.id
      } else {
        const defaultVenue = await prisma.venue.create({
          data: {
            name: 'Genel Operasyon',
            indoorPrice: new Prisma.Decimal('30.00'),
            outdoorPrice: new Prisma.Decimal('32.00'),
            isActive: true
          }
        })
        venueId = defaultVenue.id
      }
    }

    // Check if submitting combined indoor + outdoor form
    const hasCombinedFields = body?.indoorCount !== undefined || body?.outdoorCount !== undefined

    if (hasCombinedFields) {
      const indoorCount = Number(body?.indoorCount || 0)
      const outdoorCount = Number(body?.outdoorCount || 0)
      const indoorPrice = Number(body?.indoorPrice ?? 0)
      const outdoorPrice = Number(body?.outdoorPrice ?? 0)

      if (indoorCount <= 0 && outdoorCount <= 0) {
        throw createError({
          statusCode: 400,
          message: 'En az bir teslimat tipi için (İç veya Dış Mekan) geçerli paket sayısı girilmelidir.'
        })
      }

      if (indoorCount > 0 && (isNaN(indoorPrice) || indoorPrice < 0)) {
        throw createError({
          statusCode: 400,
          message: 'İç mekan birim fiyatı 0 veya daha büyük bir sayı olmalıdır.'
        })
      }

      if (outdoorCount > 0 && (isNaN(outdoorPrice) || outdoorPrice < 0)) {
        throw createError({
          statusCode: 400,
          message: 'Dış mekan birim fiyatı 0 veya daha büyük bir sayı olmalıdır.'
        })
      }

      const createdRecords = []
      let totalSum = 0
      let totalCount = 0

      // 1. Create INDOOR record if count > 0
      if (indoorCount > 0) {
        const unitSnap = Number(indoorPrice.toFixed(2))
        const tot = Number((indoorCount * unitSnap).toFixed(2))
        totalSum += tot
        totalCount += indoorCount

        const rec = await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId,
            deliveryType: DeliveryType.INDOOR,
            packageCount: indoorCount,
            unitPriceSnapshot: new Prisma.Decimal(unitSnap.toFixed(2)),
            totalAmount: new Prisma.Decimal(tot.toFixed(2))
          },
          include: { courier: true, venue: true }
        })
        createdRecords.push(rec)
      }

      // 2. Create OUTDOOR record if count > 0
      if (outdoorCount > 0) {
        const unitSnap = Number(outdoorPrice.toFixed(2))
        const tot = Number((outdoorCount * unitSnap).toFixed(2))
        totalSum += tot
        totalCount += outdoorCount

        const rec = await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId,
            deliveryType: DeliveryType.OUTDOOR,
            packageCount: outdoorCount,
            unitPriceSnapshot: new Prisma.Decimal(unitSnap.toFixed(2)),
            totalAmount: new Prisma.Decimal(tot.toFixed(2))
          },
          include: { courier: true, venue: true }
        })
        createdRecords.push(rec)
      }

      return {
        success: true,
        data: createdRecords,
        message: `${courier.name} için toplam ${totalCount} paket kaydı ve ${totalSum.toFixed(2)} ₺ hakediş başarıyla kaydedildi.`
      }
    }

    // Single record submission (for edit or single add)
    const deliveryTypeStr = body?.deliveryType === 'OUTDOOR' ? 'OUTDOOR' : 'INDOOR'
    const packageCount = Number(body?.packageCount)
    const rawUnitPrice = body?.unitPrice !== undefined ? body.unitPrice : body?.unitPriceSnapshot
    const unitPrice = Number(rawUnitPrice)

    if (isNaN(unitPrice) || unitPrice < 0) {
      throw createError({
        statusCode: 400,
        message: 'Birim fiyat 0 veya daha büyük bir sayı olmalıdır.'
      })
    }

    if (isNaN(packageCount) || !Number.isInteger(packageCount) || packageCount <= 0) {
      throw createError({
        statusCode: 400,
        message: 'Paket sayısı 0\'dan büyük bir tam sayı olmalıdır.'
      })
    }

    const deliveryType = deliveryTypeStr === 'OUTDOOR' ? DeliveryType.OUTDOOR : DeliveryType.INDOOR
    const unitPriceSnapshot = Number(unitPrice.toFixed(2))
    const totalAmount = Number((packageCount * unitPriceSnapshot).toFixed(2))

    const record = await prisma.deliveryRecord.create({
      data: {
        date: utcDate,
        courierId,
        venueId,
        deliveryType,
        packageCount,
        unitPriceSnapshot: new Prisma.Decimal(unitPriceSnapshot.toFixed(2)),
        totalAmount: new Prisma.Decimal(totalAmount.toFixed(2))
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
        unitPriceSnapshot: Number(record.unitPriceSnapshot),
        totalAmount: Number(record.totalAmount),
        courier: record.courier,
        venue: record.venue
      },
      message: `${courier.name} için ${packageCount} adet ${deliveryType === DeliveryType.INDOOR ? 'İç Mekan' : 'Dış Mekan'} paket kaydı oluşturuldu (Birim: ${unitPriceSnapshot.toFixed(2)} ₺, Toplam: ${totalAmount.toFixed(2)} ₺).`
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
