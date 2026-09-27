import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const courierId = getRouterParam(event, 'id')
    const advanceId = getRouterParam(event, 'advanceId')

    if (!courierId || !advanceId) {
      throw createError({ statusCode: 400, statusMessage: 'Parametreler eksik.' })
    }

    const advance = await prisma.courierAdvance.findUnique({
      where: { id: advanceId }
    })

    if (!advance || advance.courierId !== courierId) {
      throw createError({ statusCode: 404, statusMessage: 'Avans kaydı bulunamadı.' })
    }

    // Delete record
    await prisma.courierAdvance.delete({
      where: { id: advanceId }
    })

    // Recalculate remaining active advances
    const sumResult = await prisma.courierAdvance.aggregate({
      where: {
        courierId,
        status: 'ACTIVE'
      },
      _sum: {
        amount: true
      }
    })

    const updatedActiveTotal = Number(sumResult._sum.amount || 0)

    // Sync courier.paidAmount
    await prisma.courier.update({
      where: { id: courierId },
      data: {
        paidAmount: updatedActiveTotal
      }
    })

    return {
      success: true,
      message: 'Avans kaydı silindi ve kurye bakiyesi güncellendi.'
    }
  } catch (error: any) {
    console.error('Error deleting courier advance:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Avans silinirken bir hata oluştu.'
    })
  }
})
