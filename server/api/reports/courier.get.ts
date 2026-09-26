import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const courierId = typeof query.courierId === 'string' ? query.courierId.trim() : ''
    const startDateStr = typeof query.startDate === 'string' ? query.startDate.trim() : ''
    const endDateStr = typeof query.endDate === 'string' ? query.endDate.trim() : ''

    // 1. Validation: Courier ID
    if (!courierId) {
      throw createError({
        statusCode: 400,
        message: 'Lütfen bir kurye seçiniz.'
      })
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId }
    })

    if (!courier) {
      throw createError({
        statusCode: 404,
        message: 'Seçilen kurye bulunamadı.'
      })
    }

    // 2. Validation: Dates
    if (!startDateStr || !endDateStr) {
      throw createError({
        statusCode: 400,
        message: 'Lütfen başlangıç ve bitiş tarihlerini seçiniz.'
      })
    }

    const startParts = startDateStr.split('-').map(Number)
    const endParts = endDateStr.split('-').map(Number)

    if (
      startParts.length !== 3 ||
      endParts.length !== 3 ||
      isNaN(startParts[0]) ||
      isNaN(startParts[1]) ||
      isNaN(startParts[2]) ||
      isNaN(endParts[0]) ||
      isNaN(endParts[1]) ||
      isNaN(endParts[2])
    ) {
      throw createError({
        statusCode: 400,
        message: 'Geçersiz tarih formatı.'
      })
    }

    const [startYear, startMonth, startDay] = startParts
    const [endYear, endMonth, endDay] = endParts

    if (startDateStr > endDateStr) {
      throw createError({
        statusCode: 400,
        message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.'
      })
    }

    // Exact UTC boundaries for day comparison matching @db.Date midnight UTC
    const fromDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0))
    const toDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999))

    // 3. Fetch DeliveryRecord entries for the courier within date range
    const records = await prisma.deliveryRecord.findMany({
      where: {
        courierId: courier.id,
        date: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true
          }
        },
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
        { date: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // 4. Server-Side Calculations (Strictly using DeliveryRecord.totalAmount & packageCount)
    let totalAmount = 0
    let totalPackageCount = 0
    let indoorPackages = 0
    let outdoorPackages = 0
    let indoorAmount = 0
    let outdoorAmount = 0

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
    const dailyMap = new Map<string, {
      date: string
      dateFormatted: string
      dayName: string
      indoorCount: number
      indoorAmount: number
      outdoorCount: number
      outdoorAmount: number
      totalCount: number
      totalAmount: number
    }>()

    const formattedRecords = records.map((rec) => {
      const recordAmount = Number(rec.courierTotalAmount || 0) > 0 ? Number(rec.courierTotalAmount) : Number(rec.totalAmount)
      const recordCount = rec.packageCount
      const unitPrice = Number(rec.courierPriceSnapshot || 0) > 0 ? Number(rec.courierPriceSnapshot) : Number(rec.unitPriceSnapshot)

      totalAmount += recordAmount
      totalPackageCount += recordCount

      const d = new Date(rec.date)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      const dateKey = `${y}-${m}-${day}`
      const dateFormatted = `${day}.${m}.${y}`
      const dayOfWeek = d.getUTCDay()
      const dayName = dayNames[dayOfWeek] || ''

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          dateFormatted,
          dayName,
          indoorCount: 0,
          indoorAmount: 0,
          outdoorCount: 0,
          outdoorAmount: 0,
          totalCount: 0,
          totalAmount: 0
        })
      }

      const dayEntry = dailyMap.get(dateKey)!
      dayEntry.totalCount += recordCount
      dayEntry.totalAmount = Number((dayEntry.totalAmount + recordAmount).toFixed(2))

      if (rec.deliveryType === 'INDOOR') {
        indoorPackages += recordCount
        indoorAmount += recordAmount
        dayEntry.indoorCount += recordCount
        dayEntry.indoorAmount = Number((dayEntry.indoorAmount + recordAmount).toFixed(2))
      } else {
        outdoorPackages += recordCount
        outdoorAmount += recordAmount
        dayEntry.outdoorCount += recordCount
        dayEntry.outdoorAmount = Number((dayEntry.outdoorAmount + recordAmount).toFixed(2))
      }

      return {
        id: rec.id,
        courierId: rec.courierId,
        venueId: rec.venueId,
        date: dateKey,
        dateFormatted,
        time: rec.createdAt ? new Date(rec.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—',
        venueName: rec.venue?.name || 'Genel',
        deliveryType: rec.deliveryType,
        deliveryTypeLabel: rec.deliveryType === 'INDOOR' ? 'İç Mekan' : 'Dış Mekan',
        packageCount: recordCount,
        unitPriceSnapshot: unitPrice,
        courierPriceSnapshot: unitPrice,
        totalAmount: recordAmount
      }
    })

    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    return {
      success: true,
      data: {
        courier: {
          id: courier.id,
          name: courier.name,
          phone: courier.phone,
          isActive: courier.isActive
        },
        startDate: startDateStr,
        endDate: endDateStr,
        startDateFormatted: `${String(startDay).padStart(2, '0')}.${String(startMonth).padStart(2, '0')}.${startYear}`,
        endDateFormatted: `${String(endDay).padStart(2, '0')}.${String(endMonth).padStart(2, '0')}.${endYear}`,
        totalPackageCount,
        indoorPackages,
        outdoorPackages,
        indoorAmount: Number(indoorAmount.toFixed(2)),
        outdoorAmount: Number(outdoorAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        records: formattedRecords,
        dailyBreakdown
      }
    }
  } catch (error: any) {
    console.error('Error fetching courier report:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Kurye hakediş raporu hazırlanırken bir sunucu hatası oluştu.'
    })
  }
})

