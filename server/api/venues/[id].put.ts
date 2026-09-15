import { prisma, Prisma } from '../../utils/prisma'

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

    if (body?.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(body.isActive)
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: dataToUpdate
    })

    return {
      success: true,
      data: {
        ...updated,
        indoorPrice: Number(updated.indoorPrice),
        outdoorPrice: Number(updated.outdoorPrice)
      },
      message: 'Mekan başarıyla güncellendi.'
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
