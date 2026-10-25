import { prisma } from '../../utils/prisma'
import { getISOWeekString, getWeekDateRange } from '../../utils/period'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const venueId = typeof query.venueId === 'string' ? query.venueId.trim() : ''
    const weekFilter = typeof query.week === 'string' ? query.week.trim() : ''
    const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : ''

    // 1. Fetch all venues for metadata and quick lookup
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        indoorPrice: true,
        outdoorPrice: true,
        isActive: true,
        carriedBalance: true,
        totalCollectedAmount: true,
        totalCashAmount: true,
        totalTransferAmount: true,
        lastSettledAt: true,
        lastSettledAmount: true,
        lastPaymentMethod: true,
        lastCashAmount: true,
        lastTransferAmount: true
      }
    })

    const venueMap = new Map(venues.map(v => [v.id, v]))

    // 2. Fetch recorded settlement periods of type 'VENUE'
    const settlementPeriods = await prisma.settlementPeriod.findMany({
      where: {
        type: 'VENUE'
      },
      orderBy: { closedAt: 'desc' }
    })

    // 3. Fetch all settled delivery records to reconstruct full historical settlement records
    const settledDeliveryRecords = await prisma.deliveryRecord.findMany({
      where: {
        isSettled: true,
        venueId: venueId ? venueId : { not: null }
      },
      orderBy: [
        { settledAt: 'desc' },
        { date: 'desc' }
      ],
      select: {
        id: true,
        venueId: true,
        date: true,
        packageCount: true,
        venueTotalAmount: true,
        totalAmount: true,
        deliveryType: true,
        settledAt: true
      }
    })

    // Helper to get ISO week taking into account Monday 03:00 rollover
    const getBusinessWeek = (d: Date): string => {
      const shifted = new Date(d.getTime() - 3 * 3600 * 1000)
      const bDateStr = shifted.toISOString().substring(0, 10)
      return getISOWeekString(bDateStr)
    }

    // Key: weekCode -> Map of venueId -> Aggregated data
    const weeklyMap = new Map<string, {
      weekCode: string
      weekLabel: string
      startDate: string
      endDate: string
      totalCollectedAmount: number
      totalPackages: number
      indoorPackages: number
      outdoorPackages: number
      venueCount: number
      venues: Array<{
        venueId: string
        venueName: string
        collectedAmount: number
        totalPackages: number
        indoorPackages: number
        outdoorPackages: number
        settledDates: string[]
        lastSettledAt: string | null
      }>
    }>()

    // Session Map (Key: session id)
    const sessionMap = new Map<string, {
      id: string
      venueId: string
      venueName: string
      settledAt: string
      weekCode: string
      collectedAmount: number
      totalPackages: number
      indoorPackages: number
      outdoorPackages: number
      dates: Set<string>
      paymentMethod?: string
      cashAmount?: number
      transferAmount?: number
      remainingBalance?: number
      totalDue?: number
      notes?: string
    }>()

    const handledDeliveryRecordIds = new Set<string>()

    // 1. Process explicit SettlementPeriod records (authoritative source of truth for payments)
    for (const sp of settlementPeriods) {
      try {
        const noteData = sp.note ? JSON.parse(sp.note) : null
        const venueId = noteData?.venueId || ''
        if (!venueId) continue

        const venue = venueMap.get(venueId)
        const venueName = venue?.name || noteData?.venueName || 'Mekan'
        const closedAt = new Date(sp.closedAt)
        const weekCode = sp.week || getBusinessWeek(closedAt)
        const collectedAmount = Number(sp.paidAmount !== undefined && sp.paidAmount !== null ? sp.paidAmount : (noteData?.collectedAmount || 0))
        const paymentMethod = noteData?.paymentMethod || 'CASH'
        const cashAmount = Number(noteData?.cashAmount || (paymentMethod === 'CASH' ? collectedAmount : 0))
        const transferAmount = Number(noteData?.transferAmount || (paymentMethod === 'TRANSFER' ? collectedAmount : 0))
        const remainingBalance = Number(sp.remainingBalance !== undefined && sp.remainingBalance !== null ? sp.remainingBalance : (noteData?.remainingBalance || 0))
        const totalDue = Number(sp.totalEarnings !== undefined && sp.totalEarnings !== null ? sp.totalEarnings : (noteData?.totalDue || 0))

        // Match delivery records settled during this settlement session (within 2 minutes)
        let totalPackages = 0
        let indoorPackages = 0
        let outdoorPackages = 0
        const sessionDates = new Set<string>()

        for (const rec of settledDeliveryRecords) {
          if (rec.venueId !== venueId || !rec.settledAt) continue
          const recSettledTime = new Date(rec.settledAt).getTime()
          if (Math.abs(recSettledTime - closedAt.getTime()) <= 120000) {
            handledDeliveryRecordIds.add(rec.id)
            const count = rec.packageCount || 0
            totalPackages += count
            if (rec.deliveryType === 'INDOOR') {
              indoorPackages += count
            } else {
              outdoorPackages += count
            }
            sessionDates.add(rec.date.toISOString().substring(0, 10))
          }
        }

        // If no records matched (or fallback needed), use sp.totalPackages
        if (totalPackages === 0 && sp.totalPackages) {
          totalPackages = sp.totalPackages
        }

        const sessionKey = `sp_${sp.id}`
        sessionMap.set(sessionKey, {
          id: sp.id,
          venueId,
          venueName,
          settledAt: closedAt.toISOString(),
          weekCode,
          collectedAmount: Number(collectedAmount.toFixed(2)),
          totalPackages,
          indoorPackages,
          outdoorPackages,
          dates: sessionDates,
          paymentMethod,
          cashAmount,
          transferAmount,
          remainingBalance,
          totalDue,
          notes: noteData?.notes || ''
        })

        // Add to weeklyMap
        if (!weeklyMap.has(weekCode)) {
          const range = getWeekDateRange(weekCode)
          const formatShort = (d: Date) => {
            const day = String(d.getUTCDate()).padStart(2, '0')
            const month = String(d.getUTCMonth() + 1).padStart(2, '0')
            return `${day}.${month}.${d.getUTCFullYear()}`
          }
          weeklyMap.set(weekCode, {
            weekCode,
            weekLabel: `${formatShort(range.startDate)} - ${formatShort(range.endDate)} (${weekCode})`,
            startDate: range.startStr,
            endDate: range.endStr,
            totalCollectedAmount: 0,
            totalPackages: 0,
            indoorPackages: 0,
            outdoorPackages: 0,
            venueCount: 0,
            venues: []
          })
        }

        const weekEntry = weeklyMap.get(weekCode)!
        weekEntry.totalCollectedAmount = Number((weekEntry.totalCollectedAmount + collectedAmount).toFixed(2))
        weekEntry.totalPackages += totalPackages
        weekEntry.indoorPackages += indoorPackages
        weekEntry.outdoorPackages += outdoorPackages

        let venueInWeek = weekEntry.venues.find(v => v.venueId === venueId)
        if (!venueInWeek) {
          venueInWeek = {
            venueId,
            venueName,
            collectedAmount: 0,
            totalPackages: 0,
            indoorPackages: 0,
            outdoorPackages: 0,
            settledDates: [],
            lastSettledAt: closedAt.toISOString()
          }
          weekEntry.venues.push(venueInWeek)
        }

        venueInWeek.collectedAmount = Number((venueInWeek.collectedAmount + collectedAmount).toFixed(2))
        venueInWeek.totalPackages += totalPackages
        venueInWeek.indoorPackages += indoorPackages
        venueInWeek.outdoorPackages += outdoorPackages
        for (const dStr of sessionDates) {
          if (!venueInWeek.settledDates.includes(dStr)) {
            venueInWeek.settledDates.push(dStr)
          }
        }
      } catch (err) {
        console.warn('Error processing settlement period for collections report:', err)
      }
    }

    // 2. Process any remaining legacy settled delivery records not captured in SettlementPeriod
    for (const rec of settledDeliveryRecords) {
      if (handledDeliveryRecordIds.has(rec.id)) continue
      if (!rec.venueId || !rec.settledAt) continue
      const venue = venueMap.get(rec.venueId)
      if (!venue) continue

      const count = rec.packageCount || 0
      const amt = Number(rec.venueTotalAmount || 0) > 0
        ? Number(rec.venueTotalAmount)
        : Number(rec.totalAmount || 0)

      const settledDate = new Date(rec.settledAt)
      const weekCode = getBusinessWeek(settledDate)
      const dateStr = rec.date.toISOString().substring(0, 10)

      if (!weeklyMap.has(weekCode)) {
        const range = getWeekDateRange(weekCode)
        const formatShort = (d: Date) => {
          const day = String(d.getUTCDate()).padStart(2, '0')
          const month = String(d.getUTCMonth() + 1).padStart(2, '0')
          return `${day}.${month}.${d.getUTCFullYear()}`
        }
        weeklyMap.set(weekCode, {
          weekCode,
          weekLabel: `${formatShort(range.startDate)} - ${formatShort(range.endDate)} (${weekCode})`,
          startDate: range.startStr,
          endDate: range.endStr,
          totalCollectedAmount: 0,
          totalPackages: 0,
          indoorPackages: 0,
          outdoorPackages: 0,
          venueCount: 0,
          venues: []
        })
      }

      const weekEntry = weeklyMap.get(weekCode)!
      weekEntry.totalCollectedAmount = Number((weekEntry.totalCollectedAmount + amt).toFixed(2))
      weekEntry.totalPackages += count
      if (rec.deliveryType === 'INDOOR') {
        weekEntry.indoorPackages += count
      } else {
        weekEntry.outdoorPackages += count
      }

      let venueInWeek = weekEntry.venues.find(v => v.venueId === rec.venueId)
      if (!venueInWeek) {
        venueInWeek = {
          venueId: rec.venueId,
          venueName: venue.name,
          collectedAmount: 0,
          totalPackages: 0,
          indoorPackages: 0,
          outdoorPackages: 0,
          settledDates: [],
          lastSettledAt: rec.settledAt.toISOString()
        }
        weekEntry.venues.push(venueInWeek)
      }

      venueInWeek.collectedAmount = Number((venueInWeek.collectedAmount + amt).toFixed(2))
      venueInWeek.totalPackages += count
      if (rec.deliveryType === 'INDOOR') {
        venueInWeek.indoorPackages += count
      } else {
        venueInWeek.outdoorPackages += count
      }
      if (!venueInWeek.settledDates.includes(dateStr)) {
        venueInWeek.settledDates.push(dateStr)
      }

      // Legacy Session Aggregation (Group by 1-minute window)
      const sessionTimestamp = Math.floor(settledDate.getTime() / 60000) * 60000
      const sessionKey = `legacy_${rec.venueId}_${sessionTimestamp}`

      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          id: sessionKey,
          venueId: rec.venueId,
          venueName: venue.name,
          settledAt: rec.settledAt.toISOString(),
          weekCode,
          collectedAmount: 0,
          totalPackages: 0,
          indoorPackages: 0,
          outdoorPackages: 0,
          dates: new Set(),
          paymentMethod: 'CASH',
          notes: 'Geçmiş Kayıt'
        })
      }

      const session = sessionMap.get(sessionKey)!
      session.collectedAmount = Number((session.collectedAmount + amt).toFixed(2))
      session.totalPackages += count
      if (rec.deliveryType === 'INDOOR') {
        session.indoorPackages += count
      } else {
        session.outdoorPackages += count
      }
      session.dates.add(dateStr)
    }

    // Update venueCount for each week
    for (const weekEntry of weeklyMap.values()) {
      weekEntry.venueCount = weekEntry.venues.length
      weekEntry.venues.sort((a, b) => b.collectedAmount - a.collectedAmount)
    }

    // Convert sessions to chronological list
    let allSettlementsList = Array.from(sessionMap.values()).map(s => {
      const v = venueMap.get(s.venueId)
      const pMethod = s.paymentMethod || (v?.lastSettledAt && Math.abs(new Date(v.lastSettledAt).getTime() - new Date(s.settledAt).getTime()) < 120000 ? v.lastPaymentMethod : 'CASH')
      return {
        id: s.id,
        venueId: s.venueId,
        venueName: s.venueName,
        settledAt: s.settledAt,
        weekCode: s.weekCode,
        collectedAmount: s.collectedAmount,
        totalPackages: s.totalPackages,
        indoorPackages: s.indoorPackages,
        outdoorPackages: s.outdoorPackages,
        datesCount: s.dates.size,
        dates: Array.from(s.dates).sort(),
        paymentMethod: pMethod,
        cashAmount: s.cashAmount !== undefined ? s.cashAmount : (pMethod === 'CASH' ? s.collectedAmount : 0),
        transferAmount: s.transferAmount !== undefined ? s.transferAmount : (pMethod === 'TRANSFER' ? s.collectedAmount : 0),
        remainingBalance: s.remainingBalance || 0,
        totalDue: s.totalDue || s.collectedAmount,
        notes: s.notes || ''
      }
    }).sort((a, b) => b.settledAt.localeCompare(a.settledAt))

    // Convert weeklyMap to array sorted by week descending
    let weeksArray = Array.from(weeklyMap.values()).sort((a, b) => b.weekCode.localeCompare(a.weekCode))

    // Apply filters if provided
    if (venueId) {
      weeksArray = weeksArray.filter(w => w.venues.some(v => v.venueId === venueId))
      allSettlementsList = allSettlementsList.filter(s => s.venueId === venueId)
    }

    if (weekFilter) {
      weeksArray = weeksArray.filter(w => w.weekCode === weekFilter)
      allSettlementsList = allSettlementsList.filter(s => s.weekCode === weekFilter)
    }

    if (search) {
      weeksArray = weeksArray.filter(w => w.venues.some(v => v.venueName.toLowerCase().includes(search)))
      allSettlementsList = allSettlementsList.filter(s => s.venueName.toLowerCase().includes(search))
    }

    // Overall Grand Totals
    const grandTotalCollected = venues.reduce((sum, v) => sum + Number(v.totalCollectedAmount || 0), 0)
    const grandTotalCash = venues.reduce((sum, v) => sum + Number(v.totalCashAmount || 0), 0)
    const grandTotalTransfer = venues.reduce((sum, v) => sum + Number(v.totalTransferAmount || 0), 0)
    const totalCarriedDebt = venues.reduce((sum, v) => sum + Number(v.carriedBalance || 0), 0)

    return {
      success: true,
      summary: {
        grandTotalCollected: Number(grandTotalCollected.toFixed(2)),
        grandTotalCash: Number(grandTotalCash.toFixed(2)),
        grandTotalTransfer: Number(grandTotalTransfer.toFixed(2)),
        totalCarriedDebt: Number(totalCarriedDebt.toFixed(2)),
        venueCount: venues.length,
        settlementCount: allSettlementsList.length
      },
      weeks: weeksArray,
      settlements: allSettlementsList,
      venues: venues.map(v => ({
        id: v.id,
        name: v.name,
        totalCollectedAmount: Number(v.totalCollectedAmount || 0),
        carriedBalance: Number(v.carriedBalance || 0),
        lastSettledAt: v.lastSettledAt,
        lastSettledAmount: v.lastSettledAmount ? Number(v.lastSettledAmount) : null,
        lastPaymentMethod: v.lastPaymentMethod
      }))
    }
  } catch (error: any) {
    console.error('Venues collections report error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Mekan tahsilat raporu yüklenirken bir hata oluştu.'
    })
  }
})
