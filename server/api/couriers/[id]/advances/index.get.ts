import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const courierId = getRouterParam(event, 'id')
    if (!courierId) {
      throw createError({ statusCode: 400, statusMessage: 'Kurye ID eksik.' })
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
      select: { id: true, name: true, phone: true, isActive: true }
    })

    if (!courier) {
      throw createError({ statusCode: 404, statusMessage: 'Kurye bulunamadı.' })
    }

    const query = getQuery(event)
    const status = typeof query.status === 'string' ? query.status.toUpperCase() : 'ALL'
    const startDate = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDate = typeof query.endDate === 'string' ? query.endDate.trim() : ''

    const where: any = { courierId }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        const [sy, sm, sd] = startDate.split('-').map(Number)
        where.date.gte = new Date(Date.UTC(sy, sm - 1, sd))
      }
      if (endDate) {
        const [ey, em, ed] = endDate.split('-').map(Number)
        where.date.lte = new Date(Date.UTC(ey, em - 1, ed))
      }
    }

    const advances = await prisma.courierAdvance.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    let totalAmount = 0
    let activeAmount = 0
    let closedAmount = 0

    const formattedAdvances = advances.map(adv => {
      const amt = Number(adv.amount)
      totalAmount += amt
      if (adv.status === 'ACTIVE') {
        activeAmount += amt
      } else {
        closedAmount += amt
      }

      const d = new Date(adv.date)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')

      return {
        id: adv.id,
        courierId: adv.courierId,
        courierName: courier.name,
        amount: amt,
        formattedAmount: amt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        date: `${y}-${m}-${day}`,
        dateFormatted: `${day}.${m}.${y}`,
        time: adv.time || (adv.createdAt ? new Date(adv.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'),
        week: adv.week,
        description: adv.description || 'Avans ödemesi',
        status: adv.status,
        closedAt: adv.closedAt,
        createdAt: adv.createdAt
      }
    })

    return {
      success: true,
      data: {
        courier,
        totalAmount: Number(totalAmount.toFixed(2)),
        activeAmount: Number(activeAmount.toFixed(2)),
        closedAmount: Number(closedAmount.toFixed(2)),
        count: formattedAdvances.length,
        advances: formattedAdvances
      }
    }
  } catch (error: any) {
    console.error('Error fetching courier advances:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kurye avans geçmişi alınırken bir hata oluştu.'
    })
  }
})
