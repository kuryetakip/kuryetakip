import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const dateStr = typeof query.date === 'string' ? query.date.trim() : ''
    const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''

    const where: any = {}

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const deliveryWhere: any = {}
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number)
      if (y && m && d) {
        deliveryWhere.date = new Date(Date.UTC(y, m - 1, d))
      }
    } else if (startDateStr || endDateStr) {
      deliveryWhere.date = {}
      if (startDateStr) {
        const [y, m, d] = startDateStr.split('-').map(Number)
        if (y && m && d) {
          deliveryWhere.date.gte = new Date(Date.UTC(y, m - 1, d))
        }
      }
      if (endDateStr) {
        const [y, m, d] = endDateStr.split('-').map(Number)
        if (y && m && d) {
          deliveryWhere.date.lte = new Date(Date.UTC(y, m - 1, d))
        }
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
        },
        deliveryRecords: {
          where: deliveryWhere,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            packageCount: true,
            totalAmount: true,
            deliveryType: true,
            unitPriceSnapshot: true
          }
        }
      }
    })

    const formattedVenues = venues.map(v => {
      let totalPackageCount = 0
      let indoorPackageCount = 0
      let outdoorPackageCount = 0
      let totalAmount = 0
      let indoorAmount = 0
      let outdoorAmount = 0

      // Map day by day breakdown
      const dailyMap = new Map<string, {
        date: string
        indoorCount: number
        indoorAmount: number
        outdoorCount: number
        outdoorAmount: number
        totalCount: number
        totalAmount: number
      }>()

      for (const rec of v.deliveryRecords) {
        const count = rec.packageCount || 0
        const amount = Number(rec.totalAmount || 0)
        const dateKey = rec.date.toISOString().substring(0, 10)

        totalPackageCount += count
        totalAmount += amount

        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey,
            indoorCount: 0,
            indoorAmount: 0,
            outdoorCount: 0,
            outdoorAmount: 0,
            totalCount: 0,
            totalAmount: 0
          })
        }

        const dayEntry = dailyMap.get(dateKey)!
        dayEntry.totalCount += count
        dayEntry.totalAmount = Number((dayEntry.totalAmount + amount).toFixed(2))

        if (rec.deliveryType === 'INDOOR') {
          indoorPackageCount += count
          indoorAmount += amount
          dayEntry.indoorCount += count
          dayEntry.indoorAmount = Number((dayEntry.indoorAmount + amount).toFixed(2))
        } else {
          outdoorPackageCount += count
          outdoorAmount += amount
          dayEntry.outdoorCount += count
          dayEntry.outdoorAmount = Number((dayEntry.outdoorAmount + amount).toFixed(2))
        }
      }

      const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))

      return {
        id: v.id,
        name: v.name,
        indoorPrice: Number(v.indoorPrice),
        outdoorPrice: Number(v.outdoorPrice),
        isActive: v.isActive,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        hasRecords: (v._count.deliveryRecords + v._count.courierVenuePrices) > 0,
        recordCount: v._count.deliveryRecords,
        filteredRecordCount: v.deliveryRecords.length,
        totalPackageCount,
        indoorPackageCount,
        outdoorPackageCount,
        totalAmount: Number(totalAmount.toFixed(2)),
        indoorAmount: Number(indoorAmount.toFixed(2)),
        outdoorAmount: Number(outdoorAmount.toFixed(2)),
        dailyBreakdown
      }
    })

    return {
      success: true,
      data: formattedVenues
    }
  } catch (error: any) {
    console.error('Venues GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Mekanlar listelenirken bir hata oluştu.'
    })
  }
})

