import { prisma, DeliveryType } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const period = typeof query.period === 'string' ? query.period : 'month' // today, week, month, custom
    const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''
    const courierId = typeof query.courierId === 'string' ? query.courierId.trim() : ''
    const venueId = typeof query.venueId === 'string' ? query.venueId.trim() : ''
    const deliveryType = typeof query.deliveryType === 'string' ? query.deliveryType.trim() : ''

    // 1. Calculate date ranges based on period
    const now = new Date()
    let fromDate: Date
    let toDate: Date

    if (period === 'today') {
      fromDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
      toDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    } else if (period === 'week') {
      // Start of current week (Monday)
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      const monday = new Date(now)
      monday.setDate(diff)
      fromDate = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()))
      toDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    } else if (period === 'month') {
      // Start of current month (1st day)
      fromDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
      toDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    } else {
      // Custom date range
      if (startDateStr) {
        const s = new Date(startDateStr)
        fromDate = isNaN(s.getTime())
          ? new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
          : new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate()))
      } else {
        fromDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
      }

      if (endDateStr) {
        const e = new Date(endDateStr)
        toDate = isNaN(e.getTime())
          ? new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
          : new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()))
      } else {
        toDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
      }
    }

    // 2. Build where filter for Prisma query
    const where: any = {
      date: {
        gte: fromDate,
        lte: toDate
      }
    }

    if (courierId && courierId !== 'all') {
      where.courierId = courierId
    }

    if (venueId && venueId !== 'all') {
      where.venueId = venueId
    }

    if (deliveryType === 'INDOOR') {
      where.deliveryType = DeliveryType.INDOOR
    } else if (deliveryType === 'OUTDOOR') {
      where.deliveryType = DeliveryType.OUTDOOR
    }

    // 3. Fetch records with relational data
    const records = await prisma.deliveryRecord.findMany({
      where,
      include: {
        courier: true,
        venue: true
      },
      orderBy: [
        { date: 'asc' }
      ]
    })

    // 4. Server-Side Aggregations
    // A) Combined Courier + Venue matrix map
    const matrixMap = new Map<string, {
      courierId: string
      courierName: string
      venueId: string
      venueName: string
      indoorCount: number
      indoorAmount: number
      outdoorCount: number
      outdoorAmount: number
      totalCount: number
      totalAmount: number
    }>()

    // B) Courier-centric map
    const courierMap = new Map<string, {
      courierId: string
      courierName: string
      courierPhone: string | null
      indoorCount: number
      indoorAmount: number
      outdoorCount: number
      outdoorAmount: number
      totalCount: number
      totalAmount: number
      venues: Map<string, {
        venueId: string
        venueName: string
        indoorCount: number
        indoorAmount: number
        outdoorCount: number
        outdoorAmount: number
        totalCount: number
        totalAmount: number
      }>
    }>()

    // C) Venue-centric map
    const venueMap = new Map<string, {
      venueId: string
      venueName: string
      indoorCount: number
      indoorAmount: number
      outdoorCount: number
      outdoorAmount: number
      totalCount: number
      totalAmount: number
      couriers: Map<string, {
        courierId: string
        courierName: string
        indoorCount: number
        indoorAmount: number
        outdoorCount: number
        outdoorAmount: number
        totalCount: number
        totalAmount: number
      }>
    }>()

    let grandIndoorCount = 0
    let grandIndoorAmount = 0
    let grandOutdoorCount = 0
    let grandOutdoorAmount = 0
    let grandTotalCount = 0
    let grandTotalAmount = 0
    let grandVenueAmount = 0
    let grandCourierAmount = 0

    for (const r of records) {
      const isIndoor = r.deliveryType === DeliveryType.INDOOR
      const count = r.packageCount
      const courierAmount = Number(r.courierTotalAmount || 0) > 0 ? Number(r.courierTotalAmount) : Number(r.totalAmount)
      const venueAmount = Number(r.venueTotalAmount || 0) > 0 ? Number(r.venueTotalAmount) : courierAmount

      // Grand totals
      grandTotalCount += count
      grandTotalAmount += courierAmount
      grandCourierAmount += courierAmount
      grandVenueAmount += venueAmount

      if (isIndoor) {
        grandIndoorCount += count
        grandIndoorAmount += courierAmount
      } else {
        grandOutdoorCount += count
        grandOutdoorAmount += courierAmount
      }

      // Matrix entry key: courierId_venueId
      const matrixKey = `${r.courierId}_${r.venueId}`
      if (!matrixMap.has(matrixKey)) {
        matrixMap.set(matrixKey, {
          courierId: r.courierId,
          courierName: r.courier?.name || 'Bilinmeyen',
          venueId: r.venueId,
          venueName: r.venue?.name || 'Bilinmeyen',
          indoorCount: 0,
          indoorAmount: 0,
          outdoorCount: 0,
          outdoorAmount: 0,
          totalCount: 0,
          totalAmount: 0
        })
      }
      const mItem = matrixMap.get(matrixKey)!
      mItem.totalCount += count
      mItem.totalAmount += courierAmount
      if (isIndoor) {
        mItem.indoorCount += count
        mItem.indoorAmount += courierAmount
      } else {
        mItem.outdoorCount += count
        mItem.outdoorAmount += courierAmount
      }

      // Courier group (using courier payout amounts)
      if (!courierMap.has(r.courierId)) {
        courierMap.set(r.courierId, {
          courierId: r.courierId,
          courierName: r.courier?.name || 'Bilinmeyen',
          courierPhone: r.courier?.phone || null,
          indoorCount: 0,
          indoorAmount: 0,
          outdoorCount: 0,
          outdoorAmount: 0,
          totalCount: 0,
          totalAmount: 0,
          venues: new Map()
        })
      }
      const cGroup = courierMap.get(r.courierId)!
      cGroup.totalCount += count
      cGroup.totalAmount += courierAmount
      if (isIndoor) {
        cGroup.indoorCount += count
        cGroup.indoorAmount += courierAmount
      } else {
        cGroup.outdoorCount += count
        cGroup.outdoorAmount += courierAmount
      }

      if (!cGroup.venues.has(r.venueId)) {
        cGroup.venues.set(r.venueId, {
          venueId: r.venueId,
          venueName: r.venue?.name || 'Bilinmeyen',
          indoorCount: 0,
          indoorAmount: 0,
          outdoorCount: 0,
          outdoorAmount: 0,
          totalCount: 0,
          totalAmount: 0
        })
      }
      const cvItem = cGroup.venues.get(r.venueId)!
      cvItem.totalCount += count
      cvItem.totalAmount += courierAmount
      if (isIndoor) {
        cvItem.indoorCount += count
        cvItem.indoorAmount += courierAmount
      } else {
        cvItem.outdoorCount += count
        cvItem.outdoorAmount += courierAmount
      }

      // Venue group (using venue billing amounts)
      if (!venueMap.has(r.venueId)) {
        venueMap.set(r.venueId, {
          venueId: r.venueId,
          venueName: r.venue?.name || 'Bilinmeyen',
          indoorCount: 0,
          indoorAmount: 0,
          outdoorCount: 0,
          outdoorAmount: 0,
          totalCount: 0,
          totalAmount: 0,
          couriers: new Map()
        })
      }
      const vGroup = venueMap.get(r.venueId)!
      vGroup.totalCount += count
      vGroup.totalAmount += venueAmount
      if (isIndoor) {
        vGroup.indoorCount += count
        vGroup.indoorAmount += venueAmount
      } else {
        vGroup.outdoorCount += count
        vGroup.outdoorAmount += venueAmount
      }

      if (!vGroup.couriers.has(r.courierId)) {
        vGroup.couriers.set(r.courierId, {
          courierId: r.courierId,
          courierName: r.courier?.name || 'Bilinmeyen',
          indoorCount: 0,
          indoorAmount: 0,
          outdoorCount: 0,
          outdoorAmount: 0,
          totalCount: 0,
          totalAmount: 0
        })
      }
      const vcItem = vGroup.couriers.get(r.courierId)!
      vcItem.totalCount += count
      vcItem.totalAmount += venueAmount
      if (isIndoor) {
        vcItem.indoorCount += count
        vcItem.indoorAmount += venueAmount
      } else {
        vcItem.outdoorCount += count
        vcItem.outdoorAmount += venueAmount
      }
    }

    // Format output arrays
    const matrixRows = Array.from(matrixMap.values()).map(item => ({
      ...item,
      indoorAmount: Number(item.indoorAmount.toFixed(2)),
      outdoorAmount: Number(item.outdoorAmount.toFixed(2)),
      totalAmount: Number(item.totalAmount.toFixed(2))
    }))

    const courierReports = Array.from(courierMap.values()).map(c => ({
      ...c,
      indoorAmount: Number(c.indoorAmount.toFixed(2)),
      outdoorAmount: Number(c.outdoorAmount.toFixed(2)),
      totalAmount: Number(c.totalAmount.toFixed(2)),
      venues: Array.from(c.venues.values()).map(v => ({
        ...v,
        indoorAmount: Number(v.indoorAmount.toFixed(2)),
        outdoorAmount: Number(v.outdoorAmount.toFixed(2)),
        totalAmount: Number(v.totalAmount.toFixed(2))
      }))
    }))

    const venueReports = Array.from(venueMap.values()).map(v => ({
      ...v,
      indoorAmount: Number(v.indoorAmount.toFixed(2)),
      outdoorAmount: Number(v.outdoorAmount.toFixed(2)),
      totalAmount: Number(v.totalAmount.toFixed(2)),
      couriers: Array.from(v.couriers.values()).map(c => ({
        ...c,
        indoorAmount: Number(c.indoorAmount.toFixed(2)),
        outdoorAmount: Number(c.outdoorAmount.toFixed(2)),
        totalAmount: Number(c.totalAmount.toFixed(2))
      }))
    }))

    return {
      success: true,
      meta: {
        period,
        startDate: fromDate.toISOString().substring(0, 10),
        endDate: toDate.toISOString().substring(0, 10),
        totalRecordCount: records.length
      },
      grandSummary: {
        totalCount: grandTotalCount,
        indoorCount: grandIndoorCount,
        indoorAmount: Number(grandIndoorAmount.toFixed(2)),
        outdoorCount: grandOutdoorCount,
        outdoorAmount: Number(grandOutdoorAmount.toFixed(2)),
        totalAmount: Number(grandTotalAmount.toFixed(2)),
        venueTotalAmount: Number(grandVenueAmount.toFixed(2)),
        courierTotalAmount: Number(grandCourierAmount.toFixed(2)),
        netProfitAmount: Number((grandVenueAmount - grandCourierAmount).toFixed(2))
      },
      matrixRows,
      courierReports,
      venueReports
    }
  } catch (error: any) {
    console.error('Reports GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Hakediş raporları oluşturulurken bir hata oluştu.'
    })
  }
})
