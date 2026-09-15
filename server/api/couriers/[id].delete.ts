import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Geçersiz kurye ID.'
      })
    }

    const courier = await prisma.courier.findUnique({
      where: { id }
    })

    if (!courier) {
      throw createError({
        statusCode: 404,
        message: 'Silinmek istenen kurye bulunamadı.'
      })
    }

    // Gerçek kalıcı silme işlemi (İlişkili kayıtlar onDelete: Cascade ile temizlenir)
    await prisma.courier.delete({
      where: { id }
    })

    return {
      success: true,
      action: 'deleted',
      message: `"${courier.name}" kuryesi kalıcı olarak silindi.`
    }
  } catch (error: any) {
    console.error('Couriers DELETE error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || 'Kurye silinirken bir hata oluştu.'
    })
  }
})
