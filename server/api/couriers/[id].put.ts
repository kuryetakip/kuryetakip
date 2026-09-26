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

    const body = await readBody(event)

    const existing = await prisma.courier.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Güncellenmek istenen kurye bulunamadı.'
      })
    }

    const dataToUpdate: any = {}

    if (body?.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Kurye ad ve soyadı boş olamaz.'
        })
      }
      dataToUpdate.name = name
    }

    if (body?.phone !== undefined) {
      dataToUpdate.phone = body.phone ? String(body.phone).trim() : null
    }

    if (body?.indoorPrice !== undefined) {
      const p = Number(String(body.indoorPrice).replace(',', '.'))
      dataToUpdate.indoorPrice = isNaN(p) ? 0 : p
    }

    if (body?.outdoorPrice !== undefined) {
      const p = Number(String(body.outdoorPrice).replace(',', '.'))
      dataToUpdate.outdoorPrice = isNaN(p) ? 0 : p
    }

    if (body?.paidAmount !== undefined) {
      const p = Number(String(body.paidAmount).replace(',', '.'))
      dataToUpdate.paidAmount = isNaN(p) ? 0 : p
    }

    if (body?.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(body.isActive)
    }

    const updated = await prisma.courier.update({
      where: { id },
      data: dataToUpdate
    })

    return {
      success: true,
      data: updated,
      message: 'Kurye bilgileri başarıyla güncellendi.'
    }
  } catch (error: any) {
    console.error('Couriers PUT error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kurye güncellenirken bir hata oluştu.'
    })
  }
})
