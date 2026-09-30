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
      const restoredCarriedBalance = Number(venue.prevCarriedBalance || 0)

      await prisma.venue.update({
        where: { id },
        data: {
          lastSettledAt: null,
          lastSettledAmount: null,
          carriedBalance: new Prisma.Decimal(restoredCarriedBalance.toFixed(2)),
          prevCarriedBalance: new Prisma.Decimal(0),
          totalCollectedAmount: new Prisma.Decimal(newTotalCollected.toFixed(2))
        }
      })

      return {
        success: true,
        message: `${venue.name} için son tahsilat işlemi geri alındı. Tutar ve kayıtlar eski haline döndürüldü.`,
        data: {
          venueId: id,
          revertedCount: revertedRecords.count,
          carriedBalance: restoredCarriedBalance
        }
      }
    }

    // Normal veya Kısmi Tahsilat ve Sıfırlama İşlemi
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
    let deliveriesAmount = 0
    let indoorPackages = 0
    let outdoorPackages = 0

    for (const rec of unsettledRecords) {
      const count = rec.packageCount || 0
      const amt = Number(rec.venueTotalAmount || 0) > 0
        ? Number(rec.venueTotalAmount)
        : Number(rec.totalAmount || 0)

      totalPackages += count
      deliveriesAmount += amt
      if (rec.deliveryType === 'INDOOR') {
        indoorPackages += count
      } else {
        outdoorPackages += count
      }
    }

    const currentCarriedBalance = Number(venue.carriedBalance || 0)
    // Mekanın toplam tahsil edilecek ana tutarı (teslimat tutarları + önceki devir)
    const totalDue = Number((deliveriesAmount + currentCarriedBalance).toFixed(2))

    // Tahsil edilen tutar ve kalan tutar hesaplaması
    let collectedAmount = totalDue
    let remainingBalance = 0

    if (body?.collectedAmount !== undefined && body?.collectedAmount !== null && !isNaN(Number(body.collectedAmount))) {
      collectedAmount = Math.max(0, Number(body.collectedAmount))
      remainingBalance = Number((totalDue - collectedAmount).toFixed(2))
    } else if (body?.remainingBalance !== undefined && body?.remainingBalance !== null && !isNaN(Number(body.remainingBalance))) {
      remainingBalance = Math.max(0, Number(body.remainingBalance))
      collectedAmount = Number((totalDue - remainingBalance).toFixed(2))
    }

    collectedAmount = Number(collectedAmount.toFixed(2))
    remainingBalance = Number(remainingBalance.toFixed(2))

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
        lastSettledAmount: new Prisma.Decimal(collectedAmount.toFixed(2)),
        carriedBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
        prevCarriedBalance: new Prisma.Decimal(currentCarriedBalance.toFixed(2)),
        totalCollectedAmount: {
          increment: new Prisma.Decimal(collectedAmount.toFixed(2))
        }
      }
    })

    const message = remainingBalance > 0
      ? `${venue.name} için ${collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ tahsilat alındı. Kalan ${remainingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ borç olarak devredildi.`
      : `${venue.name} için ${collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ tahsilat alındı ve toplam tutar sıfırlandı.`

    return {
      success: true,
      message,
      data: {
        venueId: id,
        settledAmount: collectedAmount,
        remainingBalance,
        totalDue,
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
