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

    const startDateParsed = new Date(startDateStr)
    const endDateParsed = new Date(endDateStr)

    if (isNaN(startDateParsed.getTime()) || isNaN(endDateParsed.getTime())) {
      throw createError({
        statusCode: 400,
        message: 'Geçersiz tarih formatı.'
      })
    }

    if (startDateStr > endDateStr) {
      throw createError({
        statusCode: 400,
        message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.'
      })
    }

    // Exact UTC boundaries for day comparison
    const startYear = startDateParsed.getFullYear()
    const startMonth = startDateParsed.getMonth()
    const startDay = startDateParsed.getDate()

    const endYear = endDateParsed.getFullYear()
    const endMonth = endDateParsed.getMonth()
    const endDay = endDateParsed.getDate()

    const fromDate = new Date(Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0))
    const toDate = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999))

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

    const formattedRecords = records.map((rec) => {
      const recordAmount = Number(rec.totalAmount)
      const recordCount = rec.packageCount
      const unitPrice = Number(rec.unitPriceSnapshot)

      totalAmount += recordAmount
      totalPackageCount += recordCount

      if (rec.deliveryType === 'INDOOR') {
        indoorPackages += recordCount
        indoorAmount += recordAmount
      } else {
        outdoorPackages += recordCount
        outdoorAmount += recordAmount
      }

      const d = new Date(rec.date)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      const dateFormatted = `${day}.${m}.${y}`

      return {
        id: rec.id,
        date: `${y}-${m}-${day}`,
        dateFormatted,
        venueName: rec.venue?.name || 'Genel',
        deliveryType: rec.deliveryType,
        deliveryTypeLabel: rec.deliveryType === 'INDOOR' ? 'İç Mekan' : 'Dış Mekan',
        packageCount: recordCount,
        unitPriceSnapshot: unitPrice,
        totalAmount: recordAmount
      }
    })

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
        startDateFormatted: `${String(startDay).padStart(2, '0')}.${String(startMonth + 1).padStart(2, '0')}.${startYear}`,
        endDateFormatted: `${String(endDay).padStart(2, '0')}.${String(endMonth + 1).padStart(2, '0')}.${endYear}`,
        totalPackageCount,
        indoorPackages,
        outdoorPackages,
        indoorAmount: Number(indoorAmount.toFixed(2)),
        outdoorAmount: Number(outdoorAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        records: formattedRecords
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
