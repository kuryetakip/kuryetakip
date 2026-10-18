import { prisma } from '../../utils/prisma'
import { getCurrentCycleStart } from '../../utils/period'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const dateStr = typeof query.date === 'string' && query.date.trim()
      ? query.date.trim()
      : new Date().toISOString().substring(0, 10)

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Target date UTC boundary
    const [y, m, d] = dateStr.split('-').map(Number)
    const targetDate = (y && m && d) ? new Date(Date.UTC(y, m - 1, d)) : null

    // Monday 03:00 boundary for weekly cycle reset
    const { cycleStartUtc, mondayDateStr } = getCurrentCycleStart(new Date())

    const couriers = await prisma.courier.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            deliveryRecords: true,
            courierVenuePrices: true,
            advances: true
          }
        },
        deliveryRecords: {
          select: {
            id: true,
            date: true,
            packageCount: true,
            totalAmount: true,
            courierTotalAmount: true,
            deliveryType: true,
            courierPriceSnapshot: true,
            unitPriceSnapshot: true,
            isCourierSettled: true,
            courierSettledAt: true,
            createdAt: true
          }
        },
        advances: {
          select: {
            id: true,
            amount: true,
            date: true,
            time: true,
            status: true,
            description: true,
            createdAt: true
          },
          orderBy: [
            { date: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      }
    })

    const formattedCouriers = couriers.map(c => {
      let todayIndoorPackages = 0
      let todayOutdoorPackages = 0
      let todayIndoorAmount = 0
      let todayOutdoorAmount = 0

      // Haftalık Paket ve Kazanç (Her Pazartesi 03:00'te sıfırlanan aktif döngü)
      let weeklyIndoorPackages = 0
      let weeklyOutdoorPackages = 0
      let weeklyEarnings = 0

      // Aktif hakediş döngüsü (hesap kapatılana veya devredilene kadar)
      let cycleIndoorPackages = 0
      let cycleOutdoorPackages = 0
      let cycleIndoorAmount = 0
      let cycleOutdoorAmount = 0
      let cycleEarnings = 0

      // Tüm zamanlar toplam paket
      let allTimeTotalPackages = 0

      for (const rec of c.deliveryRecords) {
        const count = rec.packageCount || 0
        allTimeTotalPackages += count

        // Use courierTotalAmount if set, fallback to totalAmount
        const amount = Number(rec.courierTotalAmount || 0) > 0
          ? Number(rec.courierTotalAmount)
          : Number(rec.totalAmount || 0)

        const recDateStr = rec.date instanceof Date
          ? rec.date.toISOString().substring(0, 10)
          : String(rec.date).substring(0, 10)

        // Record timestamp checking for Monday 03:00 reset
        const recCreatedAt = rec.createdAt ? new Date(rec.createdAt) : (rec.date instanceof Date ? rec.date : new Date(rec.date))
        const isWithinCurrentCycle = recCreatedAt >= cycleStartUtc || recDateStr >= mondayDateStr

        if (isWithinCurrentCycle) {
          weeklyEarnings += amount
          if (rec.deliveryType === 'INDOOR') {
            weeklyIndoorPackages += count
          } else {
            weeklyOutdoorPackages += count
          }
        }

        // Only unsettled records count towards the current active settlement cycle
        if (!rec.isCourierSettled) {
          cycleEarnings += amount
          if (rec.deliveryType === 'INDOOR') {
            cycleIndoorPackages += count
            cycleIndoorAmount += amount
          } else {
            cycleOutdoorPackages += count
            cycleOutdoorAmount += amount
          }
        }

        if (recDateStr === dateStr) {
          if (rec.deliveryType === 'INDOOR') {
            todayIndoorPackages += count
            todayIndoorAmount += amount
          } else {
            todayOutdoorPackages += count
            todayOutdoorAmount += amount
          }
        }
      }

      // Calculate Advance totals
      let todayAdvanceAmount = 0
      let activeAdvanceAmount = 0
      let totalAdvanceAmount = 0

      for (const adv of c.advances) {
        const advAmt = Number(adv.amount || 0)
        totalAdvanceAmount += advAmt

        if (adv.status === 'ACTIVE') {
          activeAdvanceAmount += advAmt
        }

        const advDateStr = adv.date instanceof Date
          ? adv.date.toISOString().substring(0, 10)
          : String(adv.date).substring(0, 10)

        if (advDateStr === dateStr) {
          todayAdvanceAmount += advAmt
        }
      }

      const todayTotalPackages = todayIndoorPackages + todayOutdoorPackages
      const todayTotalAmount = Number((todayIndoorAmount + todayOutdoorAmount).toFixed(2))

      // Haftalık sıfırlanan toplam paket (Aktif döngü ile yedekli)
      const effectiveWeeklyIndoor = weeklyIndoorPackages > 0 ? weeklyIndoorPackages : cycleIndoorPackages
      const effectiveWeeklyOutdoor = weeklyOutdoorPackages > 0 ? weeklyOutdoorPackages : cycleOutdoorPackages
      const weeklyTotalPackages = effectiveWeeklyIndoor + effectiveWeeklyOutdoor

      // Aktif hakediş döngüsü paket ve tutarları
      const cumulativeTotalPackages = cycleIndoorPackages + cycleOutdoorPackages
      const carriedBalance = Number(c.carriedBalance || 0)
      // Toplam Hakediş = Aktif Dönem Hakedişi + Önceki Dönemden Devreden Bakiye
      const cumulativeTotalAmount = Number((cycleEarnings + carriedBalance).toFixed(2))

      // Aktif avanslar: kuryeye verilen avans girildikçe düşer
      const paidAmount = c.advances.length > 0 ? Number(activeAdvanceAmount.toFixed(2)) : Number(c.paidAmount || 0)
      const remainingBalance = Number((cumulativeTotalAmount - paidAmount).toFixed(2))

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        indoorPrice: Number(c.indoorPrice || 0),
        outdoorPrice: Number(c.outdoorPrice || 0),
        paidAmount,
        carriedBalance: Number(carriedBalance.toFixed(2)),
        lastSettledAt: c.lastSettledAt,
        lastSettledAmount: Number(c.lastSettledAmount || 0),
        todayAdvanceAmount: Number(todayAdvanceAmount.toFixed(2)),
        activeAdvanceAmount: Number(activeAdvanceAmount.toFixed(2)),
        totalAdvanceAmount: Number(totalAdvanceAmount.toFixed(2)),
        advanceCount: c._count.advances,
        recentAdvances: c.advances.slice(0, 5).map(adv => ({
          id: adv.id,
          amount: Number(adv.amount),
          date: adv.date instanceof Date ? adv.date.toISOString().substring(0, 10) : String(adv.date).substring(0, 10),
          time: adv.time || (adv.createdAt ? new Date(adv.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'),
          description: adv.description,
          status: adv.status
        })),
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        hasRecords: (c._count.deliveryRecords + c._count.courierVenuePrices) > 0,
        deliveryCount: c._count.deliveryRecords,
        customPriceCount: c._count.courierVenuePrices,
        targetDate: dateStr,
        todayIndoorPackages,
        todayOutdoorPackages,
        todayTotalPackages,
        todayIndoorAmount: Number(todayIndoorAmount.toFixed(2)),
        todayOutdoorAmount: Number(todayOutdoorAmount.toFixed(2)),
        todayTotalAmount,
        weeklyIndoorPackages: effectiveWeeklyIndoor,
        weeklyOutdoorPackages: effectiveWeeklyOutdoor,
        weeklyTotalPackages,
        weeklyEarnings: Number(weeklyEarnings.toFixed(2)),
        allTimeTotalPackages,
        cycleIndoorPackages,
        cycleOutdoorPackages,
        cycleEarnings: Number(cycleEarnings.toFixed(2)),
        cumulativeTotalPackages,
        cumulativeTotalAmount,
        totalEarnings: cumulativeTotalAmount,
        remainingBalance
      }
    })

    return {
      success: true,
      targetDate: dateStr,
      data: formattedCouriers
    }
  } catch (error: any) {
    console.error('Couriers GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kuryeler listelenirken bir hata oluştu.'
    })
  }
})
