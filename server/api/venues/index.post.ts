import { prisma, Prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const indoorPriceNum = Number(body?.indoorPrice)
    const outdoorPriceNum = Number(body?.outdoorPrice)
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

    return {
      success: true,
      data: {
        ...venue,
        indoorPrice: Number(venue.indoorPrice),
        outdoorPrice: Number(venue.outdoorPrice)
      },
      message: 'Mekan başarıyla oluşturuldu.'
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
