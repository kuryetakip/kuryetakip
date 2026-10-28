import { prisma } from '../../utils/prisma'
import { getCurrentCycleStart } from '../../utils/period'
import { getAllVenuePaymentsGrouped } from '../../utils/venuePayments'
import { toCents, fromCents } from '../../utils/venueFinance'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const dateStr = typeof query.date === 'string' ? query.date.trim() : ''
    const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''
    const scope = typeof query.scope === 'string' ? query.scope.trim() : '' // 'all' | 'pending' | 'settled'

    // Monday 03:00 boundary for weekly cycle reset
    const { cycleStartUtc, mondayDateStr } = getCurrentCycleStart(new Date())
    const sundayDateStr = new Date(cycleStartUtc.getTime() + 6 * 86400000).toISOString().substring(0, 10)

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
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            date: true,
            packageCount: true,
            totalAmount: true,
            venueTotalAmount: true,
            courierTotalAmount: true,
            courierPriceSnapshot: true,
            courierId: true,
            deliveryType: true,
            venuePriceSnapshot: true,
            unitPriceSnapshot: true,
            isSettled: true,
            settledAt: true,
            createdAt: true
          }
        }
      }
    })

    const paymentsByVenue = await getAllVenuePaymentsGrouped()

    const formattedVenues = venues.map(v => {
      const venuePayments = paymentsByVenue.get(v.id) || []
      let filteredPackageCount = 0
      let filteredIndoorPackageCount = 0
      let filteredOutdoorPackageCount = 0
      let filteredTotalAmount = 0
      let filteredCourierAmount = 0
      let filteredIndoorAmount = 0
      let filteredOutdoorAmount = 0

      // Aktif döngü (Pazartesi 03:00'ten itibaren başlayan aktif hafta) metrikleri
      let currentCycleIndoorCount = 0
      let currentCycleOutdoorCount = 0
      let currentCycleTotalCount = 0
      let currentCycleIndoorAmount = 0
      let currentCycleOutdoorAmount = 0
      let currentCycleTotalAmount = 0
      let currentCycleCourierAmount = 0

      // Geçmiş haftalardan kalan tahsil edilmemiş teslimat tutarları
      let priorUnsettledAmount = 0
      let priorUnsettledCourierAmount = 0

      // Unsettled / Pending (Tahsilat Bekleyen) metrics across all time
      let pendingPackageCount = 0
      let pendingIndoorCount = 0
      let pendingOutdoorCount = 0
      let pendingAmount = 0
      let pendingCourierAmount = 0
      let pendingIndoorAmount = 0
      let pendingOutdoorAmount = 0

      // All-time metrics
      let allTimePackageCount = 0
      let allTimeIndoorCount = 0
      let allTimeOutdoorCount = 0
      let allTimeIndoorAmount = 0
      let allTimeOutdoorAmount = 0
      let allTimeTotalAmount = 0
      let allTimeCourierAmount = 0

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
        const courierCost = rec.courierId
          ? (Number(rec.courierTotalAmount || 0) > 0
              ? Number(rec.courierTotalAmount)
              : (Number(rec.courierPriceSnapshot || 0) > 0 ? Number(rec.courierPriceSnapshot) * count : 0))
          : 0
        const dateKey = rec.date.toISOString().substring(0, 10)
        const isRecSettled = !!rec.isSettled

        // Current cycle checking for Monday 03:00 reset (only unsettled deliveries are active)
        const isWithinCurrentCycle = dateKey >= mondayDateStr && dateKey <= sundayDateStr

        if (!isRecSettled) {
          if (isWithinCurrentCycle) {
            currentCycleTotalCount += count
            currentCycleTotalAmount += amount
            currentCycleCourierAmount += courierCost
            if (rec.deliveryType === 'INDOOR') {
              currentCycleIndoorCount += count
              currentCycleIndoorAmount += amount
            } else {
              currentCycleOutdoorCount += count
              currentCycleOutdoorAmount += amount
            }
          } else {
            priorUnsettledAmount += amount
            priorUnsettledCourierAmount += courierCost
          }

          pendingPackageCount += count
          pendingAmount += amount
          pendingCourierAmount += courierCost
          if (rec.deliveryType === 'INDOOR') {
            pendingIndoorCount += count
            pendingIndoorAmount += amount
          } else {
            pendingOutdoorCount += count
            pendingOutdoorAmount += amount
          }
        }

        // All-time aggregation
        allTimePackageCount += count
        allTimeTotalAmount += amount
        allTimeCourierAmount += courierCost
        if (rec.deliveryType === 'INDOOR') {
          allTimeIndoorCount += count
          allTimeIndoorAmount += amount
        } else {
          allTimeOutdoorCount += count
          allTimeOutdoorAmount += amount
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
          filteredCourierAmount += courierCost

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

      // venue_payments tablosundaki ödemeleri kuruş hassasiyetinde topla
      let totalPaymentCents = 0
      let totalCashCents = 0
      let totalTransferCents = 0
      let periodPaymentCents = 0
      let periodCashCents = 0
      let periodTransferCents = 0

      for (const p of venuePayments) {
        const pCents = toCents(p.amount)
        const cashCents = toCents(p.cashAmount || 0)
        const transferCents = toCents(p.transferAmount || 0)

        totalPaymentCents += pCents
        totalCashCents += cashCents
        totalTransferCents += transferCents

        if ((!startDateStr || p.date >= startDateStr) && (!endDateStr || p.date <= endDateStr)) {
          periodPaymentCents += pCents
          periodCashCents += cashCents
          periodTransferCents += transferCents
        }
      }

      // Gerçek bekleyen borç: Açıkta kalan teslimat tutarları + devreden bakiye
      const pendingCents = toCents(pendingAmount)
      const venueCarriedCents = toCents(v.carriedBalance || 0)
      const actualPendingDebt = fromCents(pendingCents + venueCarriedCents)
      const carriedBalance = Number(v.carriedBalance || 0)

      const periodDeliveriesAmount = Number(filteredTotalAmount.toFixed(2))
      const periodCollectedAmount = fromCents(periodPaymentCents)
      const periodRemainingAmount = fromCents(Math.max(0, toCents(filteredTotalAmount) - periodPaymentCents))

      let totalAmount = 0
      let totalPackageCount = 0
      let indoorPackageCount = 0
      let outdoorPackageCount = 0
      let indoorAmount = 0
      let outdoorAmount = 0
      let courierAmount = 0

      if (scope === 'all') {
        // Tüm Zamanlar Seçildiğinde: Genel Toplam Hacim
        totalAmount = allTimeTotalAmount
        totalPackageCount = allTimePackageCount
        indoorPackageCount = allTimeIndoorCount
        outdoorPackageCount = allTimeOutdoorCount
        indoorAmount = allTimeIndoorAmount
        outdoorAmount = allTimeOutdoorAmount
        courierAmount = allTimeCourierAmount
      } else if (dateStr) {
        // Belirli tek bir gün seçildiğinde o günün değerleri
        totalAmount = filteredTotalAmount
        totalPackageCount = filteredPackageCount
        indoorPackageCount = filteredIndoorPackageCount
        outdoorPackageCount = filteredOutdoorPackageCount
        indoorAmount = filteredIndoorAmount
        outdoorAmount = filteredOutdoorAmount
        courierAmount = filteredCourierAmount
      } else if (startDateStr || endDateStr) {
        // Tarih aralığı (örn. Bu Hafta / Geçen Hafta): Mekanın güncel bekleyen borcu
        totalAmount = actualPendingDebt
        totalPackageCount = filteredPackageCount
        indoorPackageCount = filteredIndoorPackageCount
        outdoorPackageCount = filteredOutdoorPackageCount
        indoorAmount = filteredIndoorAmount
        outdoorAmount = filteredOutdoorAmount
        courierAmount = Number(filteredCourierAmount.toFixed(2))
      } else {
        // Varsayılan: Bekleyen Tahsilat (Aktif Hesap)
        totalAmount = actualPendingDebt
        totalPackageCount = actualPendingDebt > 0 ? (pendingPackageCount > 0 ? pendingPackageCount : allTimePackageCount) : 0
        indoorPackageCount = actualPendingDebt > 0 ? (pendingIndoorCount > 0 ? pendingIndoorCount : allTimeIndoorCount) : 0
        outdoorPackageCount = actualPendingDebt > 0 ? (pendingOutdoorCount > 0 ? pendingOutdoorCount : allTimeOutdoorCount) : 0
        indoorAmount = actualPendingDebt > 0 ? (pendingIndoorAmount > 0 ? pendingIndoorAmount : allTimeIndoorAmount) : 0
        outdoorAmount = actualPendingDebt > 0 ? (pendingOutdoorAmount > 0 ? pendingOutdoorAmount : allTimeOutdoorAmount) : 0
        courierAmount = Number((currentCycleCourierAmount + priorUnsettledCourierAmount).toFixed(2))
      }

      const netProfit = (startDateStr || endDateStr)
        ? Number((filteredTotalAmount - filteredCourierAmount).toFixed(2))
        : Number((allTimeTotalAmount - allTimeCourierAmount).toFixed(2))

      // Aktif döngüde sıfırlanmışlık kontrolü: Mekanın bekleyen borcu varsa eski haftanın sıfırlama bilgisi gösterilmez
      const showSettledInfo = actualPendingDebt === 0 && Boolean(v.lastSettledAt)

      return {
        id: v.id,
        name: v.name,
        phone: (v as any).phone || null,
        indoorPrice: Number(v.indoorPrice),
        outdoorPrice: Number(v.outdoorPrice),
        isActive: v.isActive,
        carriedBalance,
        lastSettledAt: showSettledInfo && v.lastSettledAt ? v.lastSettledAt.toISOString() : null,
        lastSettledAmount: showSettledInfo && v.lastSettledAmount ? Number(v.lastSettledAmount) : null,
        lastPaymentMethod: showSettledInfo ? ((v as any).lastPaymentMethod || null) : null,
        lastCashAmount: showSettledInfo && (v as any).lastCashAmount ? Number((v as any).lastCashAmount) : null,
        lastTransferAmount: showSettledInfo && (v as any).lastTransferAmount ? Number((v as any).lastTransferAmount) : null,
        totalCollectedAmount: fromCents(totalPaymentCents),
        totalCashAmount: fromCents(totalCashCents),
        totalTransferAmount: fromCents(totalTransferCents),
        periodDeliveriesAmount,
        periodCollectedAmount,
        periodCashAmount: fromCents(periodCashCents),
        periodTransferAmount: fromCents(periodTransferCents),
        periodRemainingAmount,
        payments: venuePayments,
        pendingPackageCount,
        pendingIndoorCount,
        pendingOutdoorCount,
        pendingAmount: actualPendingDebt,
        pendingDeliveriesAmount: actualPendingDebt,
        pendingIndoorAmount: Number(pendingIndoorAmount.toFixed(2)),
        pendingOutdoorAmount: Number(pendingOutdoorAmount.toFixed(2)),
        totalPackageCount,
        indoorPackageCount,
        outdoorPackageCount,
        totalAmount: Number(totalAmount.toFixed(2)),
        courierAmount: Number(courierAmount.toFixed(2)),
        netProfit,
        indoorAmount: Number(indoorAmount.toFixed(2)),
        outdoorAmount: Number(outdoorAmount.toFixed(2)),
        allTimePackageCount,
        allTimeTotalAmount: Number(allTimeTotalAmount.toFixed(2)),
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        hasRecords: (v._count.deliveryRecords + v._count.courierVenuePrices) > 0 || actualPendingDebt > 0,
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
