import { prisma, Prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz mekan ID.'
      })
    }

    const body = await readBody(event).catch(() => ({}))
    const isUndo = body?.action === 'undo'

    const venue = await prisma.venue.findUnique({
      where: { id }
    })

    if (!venue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mekan bulunamadı.'
      })
    }

    // Geri alma işlemi (Undo)
    if (isUndo) {
      if (!venue.lastSettledAt) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geri alınabilecek bir tahsilat kaydı bulunamadı.'
        })
      }

      // En son tahsilat tarihine yakın settled olan kayıtları tekrar aç (unsettled yap)
      const lastSettledDate = new Date(venue.lastSettledAt)
      const windowStart = new Date(lastSettledDate.getTime() - 60000) // 1 dk tolerans

      const revertedRecords = await prisma.deliveryRecord.updateMany({
        where: {
          venueId: id,
          isSettled: true,
          settledAt: {
            gte: windowStart
          }
        },
        data: {
          isSettled: false,
          settledAt: null
        }
      })

      const lastAmount = Number(venue.lastSettledAmount || 0)
      const newTotalCollected = Math.max(0, Number(venue.totalCollectedAmount || 0) - lastAmount)

      await prisma.venue.update({
        where: { id },
        data: {
          lastSettledAt: null,
          lastSettledAmount: null,
          totalCollectedAmount: new Prisma.Decimal(newTotalCollected.toFixed(2))
        }
      })

      return {
        success: true,
        message: `${venue.name} için son tahsilat işlemi geri alındı. Toplam tutar tekrar hesaplamaya dahil edildi.`,
        data: {
          venueId: id,
          revertedCount: revertedRecords.count
        }
      }
    }

    // Normal Tahsilat ve Sıfırlama İşlemi
    const unsettledRecords = await prisma.deliveryRecord.findMany({
      where: {
        venueId: id,
        isSettled: false
      },
      select: {
        id: true,
        packageCount: true,
        venueTotalAmount: true,
        totalAmount: true,
        deliveryType: true
      }
    })

    let totalPackages = 0
    let totalAmount = 0
    let indoorPackages = 0
    let outdoorPackages = 0

    for (const rec of unsettledRecords) {
      const count = rec.packageCount || 0
      const amt = Number(rec.venueTotalAmount || 0) > 0
        ? Number(rec.venueTotalAmount)
        : Number(rec.totalAmount || 0)

      totalPackages += count
      totalAmount += amt
      if (rec.deliveryType === 'INDOOR') {
        indoorPackages += count
      } else {
        outdoorPackages += count
      }
    }

    totalAmount = Number(totalAmount.toFixed(2))
    const now = new Date()

    if (unsettledRecords.length > 0) {
      await prisma.deliveryRecord.updateMany({
        where: {
          venueId: id,
          isSettled: false
        },
        data: {
          isSettled: true,
          settledAt: now
        }
      })
    }

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: {
        lastSettledAt: now,
        lastSettledAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
        totalCollectedAmount: {
          increment: new Prisma.Decimal(totalAmount.toFixed(2))
        }
      }
    })

    return {
      success: true,
      message: `${venue.name} için ${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ tahsilat alındı ve toplam tutar sıfırlandı.`,
      data: {
        venueId: id,
        settledAmount: totalAmount,
        settledPackages: totalPackages,
        indoorPackages,
        outdoorPackages,
        lastSettledAt: now,
        totalCollectedAmount: Number(updatedVenue.totalCollectedAmount)
      }
    }
  } catch (error: any) {
    console.error('Venue settle error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Mekan tahsilat işlemi gerçekleştirilemedi.'
    })
  }
})
