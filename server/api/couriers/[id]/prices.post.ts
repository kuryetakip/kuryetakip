import { prisma, Prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const courierId = getRouterParam(event, 'id')
    if (!courierId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz kurye ID.'
      })
    }

    const body = await readBody(event)

    const venueId = typeof body?.venueId === 'string' ? body.venueId.trim() : ''
    const indoorPriceNum = Number(body?.indoorPrice)
    const outdoorPriceNum = Number(body?.outdoorPrice)

    if (!venueId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Lütfen bir mekan seçiniz.'
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

    // 1. Kurye kontrolü
    const courier = await prisma.courier.findUnique({
      where: { id: courierId }
    })

    if (!courier) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kurye bulunamadı.'
      })
    }

    if (!courier.isActive) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Pasif durumdaki kuryeye yeni özel fiyat eklenemez.'
      })
    }

    // 2. Mekan kontrolü
    const venue = await prisma.venue.findUnique({
      where: { id: venueId }
    })

    if (!venue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Seçilen mekan bulunamadı.'
      })
    }

    if (!venue.isActive) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Pasif durumdaki mekana özel fiyat tanımlanamaz.'
      })
    }

    // 3. Duplicate kontrolü (Unique constraint check)
    const existing = await prisma.courierVenuePrice.findUnique({
      where: {
        courierId_venueId: {
          courierId,
          venueId
        }
      }
    })

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `Bu kurye için "${venue.name}" mekanına ait özel fiyat zaten tanımlanmış. Mevcut fiyatı düzenleyebilirsiniz.`
      })
    }

    // 4. Kayıt oluşturma
    const newPrice = await prisma.courierVenuePrice.create({
      data: {
        courierId,
        venueId,
        indoorPrice: new Prisma.Decimal(indoorPriceNum.toFixed(2)),
        outdoorPrice: new Prisma.Decimal(outdoorPriceNum.toFixed(2))
      },
      include: {
        venue: true
      }
    })

    return {
      success: true,
      data: {
        id: newPrice.id,
        courierId: newPrice.courierId,
        venueId: newPrice.venueId,
        indoorPrice: Number(newPrice.indoorPrice),
        outdoorPrice: Number(newPrice.outdoorPrice),
        createdAt: newPrice.createdAt,
        updatedAt: newPrice.updatedAt,
        venue: {
          id: newPrice.venue.id,
          name: newPrice.venue.name,
          indoorPrice: Number(newPrice.venue.indoorPrice),
          outdoorPrice: Number(newPrice.venue.outdoorPrice),
          isActive: newPrice.venue.isActive
        }
      },
      message: `"${venue.name}" için kurye özel fiyatı başarıyla tanımlandı.`
    }
  } catch (error: any) {
    console.error('Courier Price POST error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Özel fiyat kaydedilirken bir hata oluştu.'
    })
  }
})
