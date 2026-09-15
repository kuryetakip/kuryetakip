import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz kayıt ID.'
      })
    }

    const existing = await prisma.deliveryRecord.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Silinecek paket kaydı bulunamadı.'
      })
    }

    await prisma.deliveryRecord.delete({
      where: { id }
    })

    return {
      success: true,
      message: 'Paket kaydı başarıyla silindi.'
    }
  } catch (error: any) {
    console.error('Deliveries DELETE error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Paket kaydı silinirken bir hata oluştu.'
    })
  }
})
