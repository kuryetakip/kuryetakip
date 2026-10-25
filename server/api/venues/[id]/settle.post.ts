import { prisma, Prisma } from '../../../utils/prisma'
import { getISOWeekString, getWeekDateRange } from '../../../utils/period'

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
    const isClearCarried = body?.action === 'clear-carried'

    const venue = await prisma.venue.findUnique({
      where: { id }
    })

    if (!venue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mekan bulunamadı.'
      })
    }

    // 1. Kalan Borcu Sıfırla / Sil İşlemi
    if (isClearCarried) {
      const currentCarried = Number(venue.carriedBalance || 0)
      if (currentCarried <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Mekanda silinebilecek aktif bir kalan borç bulunmuyor.'
        })
      }

      const now = new Date()

      // Açıkta kalan tüm teslimat kayıtlarını da kapat
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

      await prisma.venue.update({
        where: { id },
        data: {
          carriedBalance: new Prisma.Decimal(0),
          prevCarriedBalance: new Prisma.Decimal(currentCarried.toFixed(2))
        }
      })

      return {
        success: true,
        message: `${venue.name} için kalan ${currentCarried.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ borç başarıyla silindi ve sıfırlandı.`,
        data: {
          venueId: id,
          carriedBalance: 0,
          clearedAmount: currentCarried
        }
      }
    }

    // 2. Geri alma işlemi (Undo)
    if (isUndo) {
      if (!venue.lastSettledAt) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geri alınabilecek bir tahsilat kaydı bulunamadı.'
        })
      }

      const lastAmount = Number(venue.lastSettledAmount || 0)
      const currentTotalCollected = Number(venue.totalCollectedAmount || 0)
      const newTotalCollected = Math.max(0, Number((currentTotalCollected - lastAmount).toFixed(2)))

      const lastCash = Number((venue as any).lastCashAmount || 0)
      const lastTransfer = Number((venue as any).lastTransferAmount || 0)
      const newTotalCash = Math.max(0, Number(((venue as any).totalCashAmount || 0) - lastCash))
      const newTotalTransfer = Math.max(0, Number(((venue as any).totalTransferAmount || 0) - lastTransfer))

      // Teslimat kayıtlarını FIFO ile yeni toplam tahsilata göre tekrar ayarla
      const allRecords = await prisma.deliveryRecord.findMany({
        where: { venueId: id },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
      })

      let runningBudget = newTotalCollected
      let totalDeliveriesSum = 0

      for (const rec of allRecords) {
        const amt = Number(rec.venueTotalAmount || 0) > 0
          ? Number(rec.venueTotalAmount)
          : Number(rec.totalAmount || 0)
        totalDeliveriesSum += amt

        if (runningBudget >= amt && amt > 0) {
          if (!rec.isSettled) {
            await prisma.deliveryRecord.update({
              where: { id: rec.id },
              data: { isSettled: true, settledAt: rec.settledAt || new Date() }
            })
          }
          runningBudget -= amt
        } else {
          if (rec.isSettled) {
            await prisma.deliveryRecord.update({
              where: { id: rec.id },
              data: { isSettled: false, settledAt: null }
            })
          }
        }
      }

      const restoredCarriedBalance = Math.max(0, Number((totalDeliveriesSum - newTotalCollected).toFixed(2)))

      // En son loglanan settlementPeriod kaydını sil
      const latestPeriod = await prisma.settlementPeriod.findFirst({
        where: {
          type: 'VENUE',
          note: { contains: `"venueId":"${id}"` }
        },
        orderBy: { closedAt: 'desc' }
      })

      if (latestPeriod) {
        await prisma.settlementPeriod.delete({
          where: { id: latestPeriod.id }
        }).catch(() => {})
      }

      await prisma.venue.update({
        where: { id },
        data: {
          lastSettledAt: null,
          lastSettledAmount: null,
          lastPaymentMethod: null,
          lastCashAmount: null,
          lastTransferAmount: null,
          carriedBalance: new Prisma.Decimal(restoredCarriedBalance.toFixed(2)),
          prevCarriedBalance: new Prisma.Decimal(0),
          totalCollectedAmount: new Prisma.Decimal(newTotalCollected.toFixed(2)),
          totalCashAmount: new Prisma.Decimal(newTotalCash.toFixed(2)),
          totalTransferAmount: new Prisma.Decimal(newTotalTransfer.toFixed(2))
        }
      })

      return {
        success: true,
        message: `${venue.name} için son tahsilat işlemi (${lastAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺) geri alındı. Kalan borç ve kayıtlar güncellendi.`,
        data: {
          venueId: id,
          carriedBalance: restoredCarriedBalance,
          totalCollectedAmount: newTotalCollected
        }
      }
    }

    // 3. Normal veya Kısmi Tahsilat İşlemi
    const allRecords = await prisma.deliveryRecord.findMany({
      where: { venueId: id },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
    })

    let totalDeliveriesAmount = 0
    let totalPackages = 0
    let indoorPackages = 0
    let outdoorPackages = 0

    for (const rec of allRecords) {
      const count = rec.packageCount || 0
      const amt = Number(rec.venueTotalAmount || 0) > 0
        ? Number(rec.venueTotalAmount)
        : Number(rec.totalAmount || 0)

      totalPackages += count
      totalDeliveriesAmount += amt
      if (rec.deliveryType === 'INDOOR') {
        indoorPackages += count
      } else {
        outdoorPackages += count
      }
    }

    totalDeliveriesAmount = Number(totalDeliveriesAmount.toFixed(2))
    const currentTotalCollected = Math.max(0, Number(venue.totalCollectedAmount || 0))

    // Mekanın şu anki bekleyen net borcu
    const currentPendingDue = Math.max(0, Number((totalDeliveriesAmount - currentTotalCollected).toFixed(2)))
    const totalDue = currentPendingDue

    // Kullanıcının ödediği tutar ve yeni kalan borç
    let collectedAmount = totalDue
    let remainingBalance = 0

    if (body?.collectedAmount !== undefined && body?.collectedAmount !== null && !isNaN(Number(body.collectedAmount))) {
      collectedAmount = Math.max(0, Number(body.collectedAmount))
      remainingBalance = Math.max(0, Number((totalDue - collectedAmount).toFixed(2)))
    } else if (body?.remainingBalance !== undefined && body?.remainingBalance !== null && !isNaN(Number(body.remainingBalance))) {
      remainingBalance = Math.max(0, Number(body.remainingBalance))
      collectedAmount = Math.max(0, Number((totalDue - remainingBalance).toFixed(2)))
    }

    collectedAmount = Number(collectedAmount.toFixed(2))
    remainingBalance = Number(remainingBalance.toFixed(2))

    // Yeni toplam tahsilat
    const newTotalCollected = Number((currentTotalCollected + collectedAmount).toFixed(2))

    // Ödeme Yöntemi Belirleme (CASH, TRANSFER, SPLIT)
    let paymentMethod: string = body?.paymentMethod || 'CASH'
    let cashAmount = 0
    let transferAmount = 0

    if (paymentMethod === 'TRANSFER') {
      transferAmount = collectedAmount
      cashAmount = 0
    } else if (paymentMethod === 'SPLIT') {
      cashAmount = Number(body?.cashAmount || 0)
      transferAmount = Number(body?.transferAmount || 0)
      if (cashAmount + transferAmount === 0 && collectedAmount > 0) {
        cashAmount = collectedAmount
        paymentMethod = 'CASH'
      }
    } else {
      paymentMethod = 'CASH'
      cashAmount = collectedAmount
      transferAmount = 0
    }

    cashAmount = Number(cashAmount.toFixed(2))
    transferAmount = Number(transferAmount.toFixed(2))

    const now = new Date()

    // 4. FIFO (First-In, First-Out) Teslimat Kayıtları Kapatma
    // Toplam tahsilat tutarına göre en eski tarihten başlayarak gerçekten karşılanan teslimat kayıtları kapatılır.
    // Karşılanmayan kayıtlar açık (isSettled: false) kalır ve dökümde "Bekliyor" görünür!
    let runningBudget = newTotalCollected

    for (const rec of allRecords) {
      const amt = Number(rec.venueTotalAmount || 0) > 0
        ? Number(rec.venueTotalAmount)
        : Number(rec.totalAmount || 0)

      if (runningBudget >= amt && amt > 0) {
        if (!rec.isSettled) {
          await prisma.deliveryRecord.update({
            where: { id: rec.id },
            data: {
              isSettled: true,
              settledAt: rec.settledAt || now
            }
          })
        }
        runningBudget -= amt
      } else {
        if (rec.isSettled) {
          await prisma.deliveryRecord.update({
            where: { id: rec.id },
            data: {
              isSettled: false,
              settledAt: null
            }
          })
        }
      }
    }

    // 5. Mekan kaydını güncelle
    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: {
        lastSettledAt: now,
        lastSettledAmount: new Prisma.Decimal(collectedAmount.toFixed(2)),
        lastPaymentMethod: paymentMethod,
        lastCashAmount: new Prisma.Decimal(cashAmount.toFixed(2)),
        lastTransferAmount: new Prisma.Decimal(transferAmount.toFixed(2)),
        carriedBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
        prevCarriedBalance: venue.carriedBalance,
        totalCollectedAmount: new Prisma.Decimal(newTotalCollected.toFixed(2)),
        totalCashAmount: {
          increment: new Prisma.Decimal(cashAmount.toFixed(2))
        },
        totalTransferAmount: {
          increment: new Prisma.Decimal(transferAmount.toFixed(2))
        }
      }
    })

    // 6. SettlementPeriod log kaydı
    try {
      const shifted = new Date(now.getTime() - 3 * 3600 * 1000)
      const bDateStr = shifted.toISOString().substring(0, 10)
      const weekCode = getISOWeekString(bDateStr)
      const weekRange = getWeekDateRange(weekCode)
      await prisma.settlementPeriod.create({
        data: {
          type: 'VENUE',
          week: weekCode,
          startDate: weekRange.startDate,
          endDate: weekRange.endDate,
          totalPackages,
          totalEarnings: new Prisma.Decimal(totalDue.toFixed(2)),
          totalAdvance: new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(collectedAmount.toFixed(2)),
          remainingBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
          closedAt: now,
          note: JSON.stringify({
            venueId: id,
            venueName: venue.name,
            paymentMethod,
            cashAmount,
            transferAmount,
            collectedAmount,
            remainingBalance,
            totalDue,
            notes: body?.notes || ''
          })
        }
      })
    } catch (spErr) {
      console.warn('Could not create settlementPeriod log for venue:', spErr)
    }

    const paymentMethodLabel = paymentMethod === 'TRANSFER'
      ? 'Havale ile'
      : paymentMethod === 'SPLIT'
        ? `(${cashAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ Nakit + ${transferAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ Havale)`
        : 'Nakit olarak'

    const message = remainingBalance > 0
      ? `${venue.name} için ${collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ ${paymentMethodLabel} tahsilat alındı. Kalan ${remainingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ borç olarak devredildi.`
      : `${venue.name} için ${collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ ${paymentMethodLabel} tahsilat alındı ve toplam tutar sıfırlandı.`

    return {
      success: true,
      message,
      data: {
        venueId: id,
        settledAmount: collectedAmount,
        remainingBalance,
        totalDue,
        paymentMethod,
        cashAmount,
        transferAmount,
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
