import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim() : ''

    const where: any = {}

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const couriers = await prisma.courier.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            deliveryRecords: true,
            courierVenuePrices: true
          }
        }
      }
    })

    return {
      success: true,
      data: couriers.map(c => ({
        ...c,
        hasRecords: (c._count.deliveryRecords + c._count.courierVenuePrices) > 0,
        deliveryCount: c._count.deliveryRecords,
        customPriceCount: c._count.courierVenuePrices
      }))
    }
  } catch (error: any) {
    console.error('Couriers GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kuryeler listelenirken bir hata oluştu.'
    })
  }
})
