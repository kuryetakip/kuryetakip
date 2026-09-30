import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const dateStr = typeof query.date === 'string' ? query.date.trim() : ''
    const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''
    const scope = typeof query.scope === 'string' ? query.scope.trim() : '' // 'all' | 'pending' | 'settled'

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
            unitPriceSnapshot: true,
            isSettled: true,
            settledAt: true
          }
        }
      }
    })

    const formattedVenues = venues.map(v => {
      let filteredPackageCount = 0
      let filteredIndoorPackageCount = 0
      let filteredOutdoorPackageCount = 0
      let filteredTotalAmount = 0
      let filteredIndoorAmount = 0
      let filteredOutdoorAmount = 0

      // Unsettled / Pending (Tahsilat Bekleyen) metrics
      let pendingPackageCount = 0
      let pendingIndoorCount = 0
      let pendingOutdoorCount = 0
      let pendingAmount = 0
      let pendingIndoorAmount = 0
      let pendingOutdoorAmount = 0

      // All-time metrics
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
        isSettled: boolean
        settledAmount: number
        pendingAmount: number
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
        isSettled: boolean
        settledAmount: number
        pendingAmount: number
      }>()

      for (const rec of v.deliveryRecords) {
        const count = rec.packageCount || 0
        const amount = Number(rec.venueTotalAmount || 0) > 0
          ? Number(rec.venueTotalAmount)
          : Number(rec.totalAmount || 0)
        const dateKey = rec.date.toISOString().substring(0, 10)
        const isRecSettled = !!rec.isSettled

        // All-time aggregation
        allTimePackageCount += count
        allTimeTotalAmount += amount

        // Pending aggregation (unsettled)
        if (!isRecSettled) {
          pendingPackageCount += count
          pendingAmount += amount
          if (rec.deliveryType === 'INDOOR') {
            pendingIndoorCount += count
            pendingIndoorAmount += amount
          } else {
            pendingOutdoorCount += count
            pendingOutdoorAmount += amount
          }
        }

        // All-time daily map
        if (!allDailyMap.has(dateKey)) {
          allDailyMap.set(dateKey, {
            date: dateKey,
            indoorCount: 0,
            indoorAmount: 0,
            outdoorCount: 0,
            outdoorAmount: 0,
            totalCount: 0,
            totalAmount: 0,
            isSettled: true,
            settledAmount: 0,
            pendingAmount: 0
          })
        }
        const allDayEntry = allDailyMap.get(dateKey)!
        allDayEntry.totalCount += count
        allDayEntry.totalAmount = Number((allDayEntry.totalAmount + amount).toFixed(2))
        if (!isRecSettled) {
          allDayEntry.isSettled = false
          allDayEntry.pendingAmount = Number((allDayEntry.pendingAmount + amount).toFixed(2))
        } else {
          allDayEntry.settledAmount = Number((allDayEntry.settledAmount + amount).toFixed(2))
        }

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
        } else if (scope === 'pending') {
          matchesFilter = !isRecSettled
        }

        if (matchesFilter) {
          filteredPackageCount += count
          filteredTotalAmount += amount

          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
              date: dateKey,
              indoorCount: 0,
              indoorAmount: 0,
              outdoorCount: 0,
              outdoorAmount: 0,
              totalCount: 0,
              totalAmount: 0,
              isSettled: true,
              settledAmount: 0,
              pendingAmount: 0
            })
          }

          const dayEntry = dailyMap.get(dateKey)!
          dayEntry.totalCount += count
          dayEntry.totalAmount = Number((dayEntry.totalAmount + amount).toFixed(2))
          if (!isRecSettled) {
            dayEntry.isSettled = false
            dayEntry.pendingAmount = Number((dayEntry.pendingAmount + amount).toFixed(2))
          } else {
            dayEntry.settledAmount = Number((dayEntry.settledAmount + amount).toFixed(2))
          }

          if (rec.deliveryType === 'INDOOR') {
            filteredIndoorPackageCount += count
            filteredIndoorAmount += amount
            dayEntry.indoorCount += count
            dayEntry.indoorAmount = Number((dayEntry.indoorAmount + amount).toFixed(2))
          } else {
            filteredOutdoorPackageCount += count
            filteredOutdoorAmount += amount
            dayEntry.outdoorCount += count
            dayEntry.outdoorAmount = Number((dayEntry.outdoorAmount + amount).toFixed(2))
          }
        }
      }

      const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))
      const allDailyBreakdown = Array.from(allDailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))

      // When no date filter is active and not explicitly viewing all-time, the primary display
      // is the pending unsettled amount (the amount to be collected) plus any carried balance from previous settlement.
      const carriedBalance = Number(v.carriedBalance || 0)
      const pendingDeliveriesAmount = Number(pendingAmount.toFixed(2))
      const pendingTotalWithCarried = Number((pendingDeliveriesAmount + carriedBalance).toFixed(2))

      const hasExplicitDateFilter = !!(dateStr || startDateStr || endDateStr || scope === 'all')
      const totalAmount = hasExplicitDateFilter ? filteredTotalAmount : pendingTotalWithCarried
      const totalPackageCount = hasExplicitDateFilter ? filteredPackageCount : pendingPackageCount
      const indoorPackageCount = hasExplicitDateFilter ? filteredIndoorPackageCount : pendingIndoorCount
      const outdoorPackageCount = hasExplicitDateFilter ? filteredOutdoorPackageCount : pendingOutdoorCount
      const indoorAmount = hasExplicitDateFilter ? filteredIndoorAmount : pendingIndoorAmount
      const outdoorAmount = hasExplicitDateFilter ? filteredOutdoorAmount : pendingOutdoorAmount

      return {
        id: v.id,
        name: v.name,
        indoorPrice: Number(v.indoorPrice),
        outdoorPrice: Number(v.outdoorPrice),
        isActive: v.isActive,
        carriedBalance,
        lastSettledAt: v.lastSettledAt ? v.lastSettledAt.toISOString() : null,
        lastSettledAmount: v.lastSettledAmount ? Number(v.lastSettledAmount) : null,
        totalCollectedAmount: Number(v.totalCollectedAmount || 0),
        pendingPackageCount,
        pendingIndoorCount,
        pendingOutdoorCount,
        pendingAmount: pendingTotalWithCarried,
        pendingDeliveriesAmount,
        pendingIndoorAmount: Number(pendingIndoorAmount.toFixed(2)),
        pendingOutdoorAmount: Number(pendingOutdoorAmount.toFixed(2)),
        totalPackageCount,
        indoorPackageCount,
        outdoorPackageCount,
        totalAmount: Number(totalAmount.toFixed(2)),
        indoorAmount: Number(indoorAmount.toFixed(2)),
        outdoorAmount: Number(outdoorAmount.toFixed(2)),
        allTimePackageCount,
        allTimeTotalAmount: Number(allTimeTotalAmount.toFixed(2)),
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        hasRecords: (v._count.deliveryRecords + v._count.courierVenuePrices) > 0 || carriedBalance > 0,
        recordCount: v._count.deliveryRecords,
        filteredRecordCount: totalPackageCount,
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
