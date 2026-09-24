import { prisma, DeliveryType } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const dateStr = typeof query.date === 'string' ? query.date.trim() : ''
    const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''
    const courierId = typeof query.courierId === 'string' ? query.courierId.trim() : ''
    const venueId = typeof query.venueId === 'string' ? query.venueId.trim() : ''
    const deliveryType = typeof query.deliveryType === 'string' ? query.deliveryType.trim() : ''

    const where: any = {}

    // Date filtering: single date or date range
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number)
      if (y && m && d) {
        where.date = new Date(Date.UTC(y, m - 1, d))
      }
    } else if (startDateStr || endDateStr) {
      where.date = {}
      if (startDateStr) {
        const [y, m, d] = startDateStr.split('-').map(Number)
        if (y && m && d) {
          where.date.gte = new Date(Date.UTC(y, m - 1, d))
        }
      }
      if (endDateStr) {
        const [y, m, d] = endDateStr.split('-').map(Number)
        if (y && m && d) {
          where.date.lte = new Date(Date.UTC(y, m - 1, d))
        }
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

    const records = await prisma.deliveryRecord.findMany({
      where,
      include: {
        courier: true,
        venue: true
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Calculate aggregated totals (Both package counts & settlement amounts for Indoor and Outdoor)
    let totalPackages = 0
    let indoorPackages = 0
    let outdoorPackages = 0
    let totalCourierAmount = 0
    let totalVenueAmount = 0
    let indoorSettlementAmount = 0
    let outdoorSettlementAmount = 0
    let totalSettlementAmount = 0

    const formattedRecords = records.map(r => {
      const count = r.packageCount
      const unitPrice = Number(r.unitPriceSnapshot)
      const amount = Number(r.totalAmount)

      const venuePrice = Number(r.venuePriceSnapshot || 0) > 0 ? Number(r.venuePriceSnapshot) : Number(r.venue?.indoorPrice || unitPrice)
      const venueAmount = Number(r.venueTotalAmount || 0) > 0 ? Number(r.venueTotalAmount) : Number((count * venuePrice).toFixed(2))

      const courierPrice = Number(r.courierPriceSnapshot || 0) > 0 ? Number(r.courierPriceSnapshot) : unitPrice
      const courierAmount = Number(r.courierTotalAmount || 0) > 0 ? Number(r.courierTotalAmount) : amount

      const profit = Number((venueAmount - courierAmount).toFixed(2))

      totalPackages += count
      totalCourierAmount += courierAmount
      totalVenueAmount += venueAmount

      if (r.deliveryType === DeliveryType.INDOOR) {
        indoorPackages += count
        indoorSettlementAmount += courierAmount
      } else {
        outdoorPackages += count
        outdoorSettlementAmount += courierAmount
      }
      totalSettlementAmount += courierAmount

      return {
        id: r.id,
        date: r.date.toISOString().substring(0, 10),
        courierId: r.courierId,
        venueId: r.venueId,
        deliveryType: r.deliveryType,
        packageCount: count,
        venuePriceSnapshot: venuePrice,
        venueTotalAmount: venueAmount,
        courierPriceSnapshot: courierPrice,
        courierTotalAmount: courierAmount,
        profitAmount: profit,
        unitPriceSnapshot: courierPrice,
        totalAmount: courierAmount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        courier: r.courier ? {
          id: r.courier.id,
          name: r.courier.name,
          phone: r.courier.phone,
          isActive: r.courier.isActive
        } : null,
        venue: r.venue ? {
          id: r.venue.id,
          name: r.venue.name,
          indoorPrice: Number(r.venue.indoorPrice),
          outdoorPrice: Number(r.venue.outdoorPrice),
          isActive: r.venue.isActive
        } : null
      }
    })

    const netProfit = Number((totalVenueAmount - totalCourierAmount).toFixed(2))

    return {
      success: true,
      data: formattedRecords,
      summary: {
        totalRecords: formattedRecords.length,
        totalPackages,
        indoorPackages,
        outdoorPackages,
        totalCourierAmount: Number(totalCourierAmount.toFixed(2)),
        totalVenueAmount: Number(totalVenueAmount.toFixed(2)),
        netProfitAmount: netProfit,
        indoorSettlementAmount: Number(indoorSettlementAmount.toFixed(2)),
        outdoorSettlementAmount: Number(outdoorSettlementAmount.toFixed(2)),
        totalSettlementAmount: Number(totalSettlementAmount.toFixed(2))
      }
    }
  } catch (error: any) {
    console.error('Deliveries GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Paket kayıtları listelenirken bir hata oluştu.'
    })
  }
})
