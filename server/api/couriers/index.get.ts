import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const dateStr = typeof query.date === 'string' && query.date.trim()
      ? query.date.trim()
      : new Date().toISOString().substring(0, 10)

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Target date UTC boundary
    const [y, m, d] = dateStr.split('-').map(Number)
    const targetDate = (y && m && d) ? new Date(Date.UTC(y, m - 1, d)) : null

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
        },
        deliveryRecords: {
          where: targetDate ? { date: targetDate } : undefined,
          select: {
            id: true,
            packageCount: true,
            totalAmount: true,
            deliveryType: true,
            unitPriceSnapshot: true
          }
        }
      }
    })

    const formattedCouriers = couriers.map(c => {
      let todayIndoorPackages = 0
      let todayOutdoorPackages = 0
      let todayIndoorAmount = 0
      let todayOutdoorAmount = 0

      for (const rec of c.deliveryRecords) {
        const count = rec.packageCount || 0
        const amount = Number(rec.totalAmount || 0)

        if (rec.deliveryType === 'INDOOR') {
          todayIndoorPackages += count
          todayIndoorAmount += amount
        } else {
          todayOutdoorPackages += count
          todayOutdoorAmount += amount
        }
      }

      const todayTotalPackages = todayIndoorPackages + todayOutdoorPackages
      const todayTotalAmount = Number((todayIndoorAmount + todayOutdoorAmount).toFixed(2))

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        hasRecords: (c._count.deliveryRecords + c._count.courierVenuePrices) > 0,
        deliveryCount: c._count.deliveryRecords,
        customPriceCount: c._count.courierVenuePrices,
        targetDate: dateStr,
        todayIndoorPackages,
        todayOutdoorPackages,
        todayTotalPackages,
        todayIndoorAmount: Number(todayIndoorAmount.toFixed(2)),
        todayOutdoorAmount: Number(todayOutdoorAmount.toFixed(2)),
        todayTotalAmount
      }
    })

    return {
      success: true,
      targetDate: dateStr,
      data: formattedCouriers
    }
  } catch (error: any) {
    console.error('Couriers GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kuryeler listelenirken bir hata oluştu.'
    })
  }
})
