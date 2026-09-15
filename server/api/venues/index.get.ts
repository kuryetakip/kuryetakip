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

    const venues = await prisma.venue.findMany({
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
      data: venues.map(v => ({
        ...v,
        indoorPrice: Number(v.indoorPrice),
        outdoorPrice: Number(v.outdoorPrice),
        hasRecords: (v._count.deliveryRecords + v._count.courierVenuePrices) > 0
      }))
    }
  } catch (error: any) {
    console.error('Venues GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Mekanlar listelenirken bir hata oluştu.'
    })
  }
})
