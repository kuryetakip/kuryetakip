import { prisma, DeliveryType, Prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const parsePrice = (val: any) => {
      if (val === undefined || val === null || val === '') return 0
      const n = Number(String(val).replace(',', '.'))
      return isNaN(n) ? 0 : n
    }

    const indoorPriceNum = parsePrice(body?.indoorPrice)
    const outdoorPriceNum = parsePrice(body?.outdoorPrice)
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true

    // Server-side validations
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mekan adı zorunludur.'
      })
    }

    if (isNaN(indoorPriceNum) || indoorPriceNum < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçerli bir iç teslimat fiyatı (>= 0) giriniz.'
      })
    }

    if (isNaN(outdoorPriceNum) || outdoorPriceNum < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçerli bir dış teslimat fiyatı (>= 0) giriniz.'
      })
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        indoorPrice: new Prisma.Decimal(indoorPriceNum.toFixed(2)),
        outdoorPrice: new Prisma.Decimal(outdoorPriceNum.toFixed(2)),
        isActive
      }
    })

    // If daily delivery records are provided with the venue
    const courierId = typeof body?.courierId === 'string' && body.courierId.trim() ? body.courierId.trim() : null
    const indoorCount = Number(body?.indoorCount || 0)
    const outdoorCount = Number(body?.outdoorCount || 0)
    const dateStr = typeof body?.date === 'string' ? body.date.trim() : ''

    if (indoorCount > 0 || outdoorCount > 0) {
      const d = dateStr ? new Date(dateStr) : new Date()
      const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))

      if (indoorCount > 0) {
        const total = Number((indoorCount * indoorPriceNum).toFixed(2))
        await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId: venue.id,
            deliveryType: DeliveryType.INDOOR,
            packageCount: indoorCount,
            unitPriceSnapshot: new Prisma.Decimal(indoorPriceNum.toFixed(2)),
            totalAmount: new Prisma.Decimal(total.toFixed(2))
          }
        })
      }

      if (outdoorCount > 0) {
        const total = Number((outdoorCount * outdoorPriceNum).toFixed(2))
        await prisma.deliveryRecord.create({
          data: {
            date: utcDate,
            courierId,
            venueId: venue.id,
            deliveryType: DeliveryType.OUTDOOR,
            packageCount: outdoorCount,
            unitPriceSnapshot: new Prisma.Decimal(outdoorPriceNum.toFixed(2)),
            totalAmount: new Prisma.Decimal(total.toFixed(2))
          }
        })
      }
    }

    return {
      success: true,
      data: {
        ...venue,
        indoorPrice: Number(venue.indoorPrice),
        outdoorPrice: Number(venue.outdoorPrice)
      },
      message: 'Mekan ve günlük paket kayıtları başarıyla kaydedildi.'
    }
  } catch (error: any) {
    console.error('Venues POST error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Mekan kaydedilirken bir hata oluştu.'
    })
  }
})

