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
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            packageCount: true,
            totalAmount: true,
            venueTotalAmount: true,
            deliveryType: true,
            venuePriceSnapshot: true,
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

      let allTimePackageCount = 0
      let allTimeTotalAmount = 0

      // Filtered daily breakdown map
      const dailyMap = new Map<string, {
        date: string
        indoorCount: number
        indoorAmount: number
        outdoorCount: number
        outdoorAmount: number
        totalCount: number
        totalAmount: number
      }>()

      // All-time daily breakdown map (guarantees all history is preserved)
      const allDailyMap = new Map<string, {
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
        const amount = Number(rec.venueTotalAmount || 0) > 0
          ? Number(rec.venueTotalAmount)
          : Number(rec.totalAmount || 0)
        const dateKey = rec.date.toISOString().substring(0, 10)

        // All-time aggregation
        allTimePackageCount += count
        allTimeTotalAmount += amount

        if (!allDailyMap.has(dateKey)) {
          allDailyMap.set(dateKey, {
            date: dateKey,
            indoorCount: 0,
            indoorAmount: 0,
            outdoorCount: 0,
            outdoorAmount: 0,
            totalCount: 0,
            totalAmount: 0
          })
        }
        const allDayEntry = allDailyMap.get(dateKey)!
        allDayEntry.totalCount += count
        allDayEntry.totalAmount = Number((allDayEntry.totalAmount + amount).toFixed(2))

        if (rec.deliveryType === 'INDOOR') {
          allDayEntry.indoorCount += count
          allDayEntry.indoorAmount = Number((allDayEntry.indoorAmount + amount).toFixed(2))
        } else {
          allDayEntry.outdoorCount += count
          allDayEntry.outdoorAmount = Number((allDayEntry.outdoorAmount + amount).toFixed(2))
        }

        // Filter evaluation
        let matchesFilter = true
        if (dateStr) {
          matchesFilter = dateKey === dateStr
        } else if (startDateStr || endDateStr) {
          if (startDateStr && dateKey < startDateStr) matchesFilter = false
          if (endDateStr && dateKey > endDateStr) matchesFilter = false
        }

        if (matchesFilter) {
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
      }

      const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))
      const allDailyBreakdown = Array.from(allDailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))

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
        filteredRecordCount: totalPackageCount,
        totalPackageCount,
        indoorPackageCount,
        outdoorPackageCount,
        totalAmount: Number(totalAmount.toFixed(2)),
        indoorAmount: Number(indoorAmount.toFixed(2)),
        outdoorAmount: Number(outdoorAmount.toFixed(2)),
        allTimePackageCount,
        allTimeTotalAmount: Number(allTimeTotalAmount.toFixed(2)),
        dailyBreakdown,
        allDailyBreakdown
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

