import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Geçersiz mekan ID.'
      })
    }

    const venue = await prisma.venue.findUnique({
      where: { id }
    })

    if (!venue) {
      throw createError({
        statusCode: 404,
        message: 'Silinmek istenen mekan bulunamadı.'
      })
    }

    // Gerçek kalıcı silme işlemi (İlişkili kayıtlar onDelete: Cascade ile temizlenir)
    await prisma.venue.delete({
      where: { id }
    })

    return {
      success: true,
      action: 'deleted',
      message: `"${venue.name}" mekanı kalıcı olarak silindi.`
    }
  } catch (error: any) {
    console.error('Venues DELETE error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || 'Mekan silinirken bir hata oluştu.'
    })
  }
})
