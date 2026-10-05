import { prisma, DeliveryType } from '../../utils/prisma'

export interface DailyCourierRow {
  courierId: string
  name: string
  phone: string | null
  isActive: boolean
  workStatus: string
  deliveredCount: number
  indoorCount: number
  outdoorCount: number
  cancelledCount: number
  dailyEarnings: number
  todayAdvanceAmount: number
  notes: string
}

export interface DailyVenueRow {
  venueId: string
  name: string
  isActive: boolean
  totalOrders: number
  deliveredOrders: number
  indoorCount: number
  outdoorCount: number
  totalRevenue: number
  avgDeliveryTime: string
}

export interface DailyReportSummaryResponse {
  success: boolean
  date: string
  formattedDate: string
  generatedAt: string
  hasData: boolean
  summary: {
    totalDeliveries: number
    totalIndoor: number
    totalOutdoor: number
    activeCouriersCount: number
    totalCouriersCount: number
    totalVenuesCount: number
    activeVenuesWithOrders: number
    totalRevenue: number
    totalCourierEarnings: number
    netProfit: number
  }
  couriers: DailyCourierRow[]
  venues: DailyVenueRow[]
}

export default defineEventHandler(async (event): Promise<DailyReportSummaryResponse> => {
  try {
    const query = getQuery(event)
    const now = new Date()

    // Determine target date (Default: Today in YYYY-MM-DD)
    const targetDateStr = typeof query.date === 'string' && query.date.trim()
      ? query.date.trim()
      : now.toISOString().substring(0, 10)

    const [year, month, day] = targetDateStr.split('-').map(Number)
    const fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
    const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

    // 1. Fetch all couriers with their advances and today's deliveries
    const allCouriers = await prisma.courier.findMany({
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      include: {
        advances: {
          where: {
            date: {
              gte: fromDate,
              lte: toDate
            }
          }
        }
      }
    })

    // 2. Fetch all venues
    const allVenues = await prisma.venue.findMany({
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    // 3. Fetch all delivery records on this specific date
    const deliveryRecords = await prisma.deliveryRecord.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        courier: true,
        venue: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 4. Map records per courier
    const courierDataMap = new Map<string, {
      indoorCount: number
      outdoorCount: number
      earnings: number
    }>()

    // 5. Map records per venue
    const venueDataMap = new Map<string, {
      indoorCount: number
      outdoorCount: number
      revenue: number
    }>()

    let totalDeliveries = 0
    let totalIndoor = 0
    let totalOutdoor = 0
    let totalRevenue = 0
    let totalCourierEarnings = 0

    for (const record of deliveryRecords) {
      const count = record.packageCount || 0
      const isIndoor = record.deliveryType === DeliveryType.INDOOR

      // Courier payout: prefer courierTotalAmount, fallback to totalAmount
      const courierAmount = Number(record.courierTotalAmount || 0) > 0
        ? Number(record.courierTotalAmount)
        : Number(record.totalAmount || 0)

      // Venue billing: prefer venueTotalAmount, fallback to totalAmount / courierAmount
      const venueAmount = Number(record.venueTotalAmount || 0) > 0
        ? Number(record.venueTotalAmount)
        : (Number(record.totalAmount || 0) > 0 ? Number(record.totalAmount) : courierAmount)

      totalDeliveries += count
      totalRevenue += venueAmount
      totalCourierEarnings += courierAmount

      if (isIndoor) {
        totalIndoor += count
      } else {
        totalOutdoor += count
      }

      // Aggregate for courier
      if (record.courierId) {
        if (!courierDataMap.has(record.courierId)) {
          courierDataMap.set(record.courierId, { indoorCount: 0, outdoorCount: 0, earnings: 0 })
        }
        const cEntry = courierDataMap.get(record.courierId)!
        if (isIndoor) {
          cEntry.indoorCount += count
        } else {
          cEntry.outdoorCount += count
        }
        cEntry.earnings += courierAmount
      }

      // Aggregate for venue
      if (record.venueId) {
        if (!venueDataMap.has(record.venueId)) {
          venueDataMap.set(record.venueId, { indoorCount: 0, outdoorCount: 0, revenue: 0 })
        }
        const vEntry = venueDataMap.get(record.venueId)!
        if (isIndoor) {
          vEntry.indoorCount += count
        } else {
          vEntry.outdoorCount += count
        }
        vEntry.revenue += venueAmount
      }
    }

    // Build Courier List for report (Include couriers with deliveries first, then active ones)
    const courierRows: DailyCourierRow[] = allCouriers.map(courier => {
      const stat = courierDataMap.get(courier.id) || { indoorCount: 0, outdoorCount: 0, earnings: 0 }
      const totalPackages = stat.indoorCount + stat.outdoorCount

      const todayAdvance = courier.advances.reduce((acc, a) => acc + Number(a.amount || 0), 0)

      let notes = ''
      if (todayAdvance > 0) {
        notes = `Gün İçi Avans: ${todayAdvance.toFixed(2)} ₺`
      } else if (totalPackages > 0) {
        notes = `${stat.indoorCount} İç / ${stat.outdoorCount} Dış`
      } else {
        notes = 'Teslimat kaydı yok'
      }

      return {
        courierId: courier.id,
        name: courier.name,
        phone: courier.phone,
        isActive: courier.isActive,
        workStatus: courier.isActive ? (totalPackages > 0 ? 'Aktif (Görevde)' : 'Aktif (Boşta)') : 'Pasif',
        deliveredCount: totalPackages,
        indoorCount: stat.indoorCount,
        outdoorCount: stat.outdoorCount,
        cancelledCount: 0,
        dailyEarnings: Number(stat.earnings.toFixed(2)),
        todayAdvanceAmount: Number(todayAdvance.toFixed(2)),
        notes
      }
    })

    // Sort: Couriers with deliveries first, descending by package count, then alphabetically
    courierRows.sort((a, b) => {
      if (b.deliveredCount !== a.deliveredCount) {
        return b.deliveredCount - a.deliveredCount
      }
      return a.name.localeCompare(b.name, 'tr')
    })

    // Build Venue List for report
    const venueRows: DailyVenueRow[] = allVenues.map(venue => {
      const stat = venueDataMap.get(venue.id) || { indoorCount: 0, outdoorCount: 0, revenue: 0 }
      const totalP = stat.indoorCount + stat.outdoorCount

      return {
        venueId: venue.id,
        name: venue.name,
        isActive: venue.isActive,
        totalOrders: totalP,
        deliveredOrders: totalP,
        indoorCount: stat.indoorCount,
        outdoorCount: stat.outdoorCount,
        totalRevenue: Number(stat.revenue.toFixed(2)),
        avgDeliveryTime: totalP > 0 ? 'Standart (~25-35 dk)' : '—'
      }
    })

    // Sort: Venues with orders first, descending by total orders, then alphabetically
    venueRows.sort((a, b) => {
      if (b.totalOrders !== a.totalOrders) {
        return b.totalOrders - a.totalOrders
      }
      return a.name.localeCompare(b.name, 'tr')
    })

    const couriersWithDeliveries = courierRows.filter(c => c.deliveredCount > 0)
    const venuesWithDeliveries = venueRows.filter(v => v.totalOrders > 0)

    const dateFormatted = new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(year, month - 1, day))

    const generatedAt = new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date())

    return {
      success: true,
      date: targetDateStr,
      formattedDate: dateFormatted,
      generatedAt,
      hasData: totalDeliveries > 0 || deliveryRecords.length > 0,
      summary: {
        totalDeliveries,
        totalIndoor,
        totalOutdoor,
        activeCouriersCount: couriersWithDeliveries.length || allCouriers.filter(c => c.isActive).length,
        totalCouriersCount: allCouriers.length,
        totalVenuesCount: allVenues.length,
        activeVenuesWithOrders: venuesWithDeliveries.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCourierEarnings: Number(totalCourierEarnings.toFixed(2)),
        netProfit: Number((totalRevenue - totalCourierEarnings).toFixed(2))
      },
      couriers: courierRows,
      venues: venueRows
    }
  } catch (error: any) {
    console.error('Daily summary report error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Gün sonu rapor verisi oluşturulurken bir hata oluştu.'
    })
  }
})
