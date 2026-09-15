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
      const targetDate = new Date(dateStr)
      if (!isNaN(targetDate.getTime())) {
        where.date = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()))
      }
    } else if (startDateStr || endDateStr) {
      where.date = {}
      if (startDateStr) {
        const s = new Date(startDateStr)
        if (!isNaN(s.getTime())) {
          where.date.gte = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate()))
        }
      }
      if (endDateStr) {
        const e = new Date(endDateStr)
        if (!isNaN(e.getTime())) {
          where.date.lte = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()))
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
    let indoorSettlementAmount = 0
    let outdoorSettlementAmount = 0
    let totalSettlementAmount = 0

    const formattedRecords = records.map(r => {
      const count = r.packageCount
      const unitPrice = Number(r.unitPriceSnapshot)
      const amount = Number(r.totalAmount)

      totalPackages += count
      if (r.deliveryType === DeliveryType.INDOOR) {
        indoorPackages += count
        indoorSettlementAmount += amount
      } else {
        outdoorPackages += count
        outdoorSettlementAmount += amount
      }
      totalSettlementAmount += amount

      return {
        id: r.id,
        date: r.date.toISOString().substring(0, 10),
        courierId: r.courierId,
        venueId: r.venueId,
        deliveryType: r.deliveryType,
        packageCount: count,
        unitPriceSnapshot: unitPrice,
        totalAmount: amount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        courier: {
          id: r.courier.id,
          name: r.courier.name,
          phone: r.courier.phone,
          isActive: r.courier.isActive
        },
        venue: {
          id: r.venue.id,
          name: r.venue.name,
          indoorPrice: Number(r.venue.indoorPrice),
          outdoorPrice: Number(r.venue.outdoorPrice),
          isActive: r.venue.isActive
        }
      }
    })

    return {
      success: true,
      data: formattedRecords,
      summary: {
        totalRecords: formattedRecords.length,
        totalPackages,
        indoorPackages,
        outdoorPackages,
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
