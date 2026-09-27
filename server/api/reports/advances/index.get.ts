import { prisma } from '../../../utils/prisma'
import {
  getIstanbulDateString,
  getWeekDateRange,
  getISOWeekString
} from '../../../utils/period'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const period = typeof query.period === 'string' ? query.period : 'week' // today, week, lastWeek, month, custom
    const courierId = typeof query.courierId === 'string' && query.courierId !== 'all' ? query.courierId.trim() : ''
    const status = typeof query.status === 'string' && query.status !== 'all' ? query.status.toUpperCase() : ''
    const minAmount = query.minAmount ? Number(query.minAmount) : undefined
    const maxAmount = query.maxAmount ? Number(query.maxAmount) : undefined

    const todayStr = getIstanbulDateString()
    const [currY, currM, currD] = todayStr.split('-').map(Number)
    const todayDate = new Date(Date.UTC(currY, currM - 1, currD))

    let fromDate: Date
    let toDate: Date

    if (period === 'today') {
      fromDate = new Date(Date.UTC(currY, currM - 1, currD, 0, 0, 0, 0))
      toDate = new Date(Date.UTC(currY, currM - 1, currD, 23, 59, 59, 999))
    } else if (period === 'week') {
      const { startDate, endDate } = getWeekDateRange(todayDate)
      fromDate = startDate
      toDate = endDate
    } else if (period === 'lastWeek') {
      const lastWeekDate = new Date(todayDate.getTime() - 7 * 86400000)
      const { startDate, endDate } = getWeekDateRange(lastWeekDate)
      fromDate = startDate
      toDate = endDate
    } else if (period === 'month') {
      fromDate = new Date(Date.UTC(currY, currM - 1, 1, 0, 0, 0, 0))
      // Last day of current month
      const lastDay = new Date(Date.UTC(currY, currM, 0, 23, 59, 59, 999))
      toDate = lastDay
    } else {
      // custom date range
      const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
      const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''

      if (startDateStr) {
        const [sy, sm, sd] = startDateStr.split('-').map(Number)
        fromDate = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0))
      } else {
        fromDate = new Date(Date.UTC(currY, currM - 1, 1, 0, 0, 0, 0))
      }

      if (endDateStr) {
        const [ey, em, ed] = endDateStr.split('-').map(Number)
        toDate = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999))
      } else {
        toDate = new Date(Date.UTC(currY, currM - 1, currD, 23, 59, 59, 999))
      }
    }

    // Build Prisma where
    const where: any = {
      date: {
        gte: fromDate,
        lte: toDate
      }
    }

    if (courierId) {
      where.courierId = courierId
    }

    if (status) {
      where.status = status
    }

    if (minAmount !== undefined && !isNaN(minAmount)) {
      where.amount = { ...(where.amount || {}), gte: minAmount }
    }

    if (maxAmount !== undefined && !isNaN(maxAmount)) {
      where.amount = { ...(where.amount || {}), lte: maxAmount }
    }

    // Database Aggregations: SUM and COUNT
    const totalAggregate = await prisma.courierAdvance.aggregate({
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    const totalAmount = Number(totalAggregate._sum.amount || 0)
    const totalCount = totalAggregate._count.id || 0

    // Fetch all advances in period with courier details
    const advances = await prisma.courierAdvance.findMany({
      where,
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Grouping by courier
    const courierMap = new Map<string, {
      courierId: string
      courierName: string
      phone: string | null
      totalAmount: number
      count: number
      lastDate: string
    }>()

    // Grouping by date
    const dailyMap = new Map<string, {
      date: string
      dateFormatted: string
      dayName: string
      totalAmount: number
      count: number
    }>()

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

    for (const adv of advances) {
      const amt = Number(adv.amount)
      const cId = adv.courierId
      const cName = adv.courier?.name || 'Bilinmeyen Kurye'
      const cPhone = adv.courier?.phone || null

      const d = new Date(adv.date)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      const dateKey = `${y}-${m}-${day}`
      const dateFormatted = `${day}.${m}.${y}`
      const dayName = dayNames[d.getUTCDay()] || ''

      // Courier group
      if (!courierMap.has(cId)) {
        courierMap.set(cId, {
          courierId: cId,
          courierName: cName,
          phone: cPhone,
          totalAmount: 0,
          count: 0,
          lastDate: dateKey
        })
      }
      const cEntry = courierMap.get(cId)!
      cEntry.totalAmount = Number((cEntry.totalAmount + amt).toFixed(2))
      cEntry.count += 1

      // Daily group
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          dateFormatted,
          dayName,
          totalAmount: 0,
          count: 0
        })
      }
      const dEntry = dailyMap.get(dateKey)!
      dEntry.totalAmount = Number((dEntry.totalAmount + amt).toFixed(2))
      dEntry.count += 1
    }

    const courierBreakdown = Array.from(courierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))

    const formattedRecords = advances.map(adv => {
      const amt = Number(adv.amount)
      const d = new Date(adv.date)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')

      return {
        id: adv.id,
        courierId: adv.courierId,
        courierName: adv.courier?.name || 'Bilinmeyen',
        courierPhone: adv.courier?.phone,
        amount: amt,
        formattedAmount: amt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        date: `${y}-${m}-${day}`,
        dateFormatted: `${day}.${m}.${y}`,
        time: adv.time || (adv.createdAt ? new Date(adv.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'),
        week: adv.week,
        periodId: adv.periodId,
        description: adv.description || 'Avans ödemesi',
        status: adv.status,
        closedAt: adv.closedAt,
        createdAt: adv.createdAt
      }
    })

    const startFormatted = `${String(fromDate.getUTCDate()).padStart(2, '0')}.${String(fromDate.getUTCMonth() + 1).padStart(2, '0')}.${fromDate.getUTCFullYear()}`
    const endFormatted = `${String(toDate.getUTCDate()).padStart(2, '0')}.${String(toDate.getUTCMonth() + 1).padStart(2, '0')}.${toDate.getUTCFullYear()}`

    return {
      success: true,
      data: {
        period,
        startDate: fromDate.toISOString().substring(0, 10),
        endDate: toDate.toISOString().substring(0, 10),
        startDateFormatted: startFormatted,
        endDateFormatted: endFormatted,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalCount,
        averageAmount: totalCount > 0 ? Number((totalAmount / totalCount).toFixed(2)) : 0,
        courierBreakdown,
        dailyBreakdown,
        records: formattedRecords
      }
    }
  } catch (error: any) {
    console.error('Error fetching advance reports:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Avans raporları hazırlanırken bir hata oluştu.'
    })
  }
})
