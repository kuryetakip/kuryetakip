import { prisma, Prisma } from '../../../utils/prisma'
import { getISOWeekString, getWeekDateRange } from '../../../utils/period'
import { toCents, fromCents } from '../../../utils/venueFinance'
import { createVenuePaymentRecord } from '../../../utils/venuePayments'

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

    // 1. Kalan Borcu Manuel Sıfırla / Sil İşlemi (Ayrı Onay Penceresi ile)
    if (isClearCarried) {
      const currentCarried = Number(venue.carriedBalance || 0)
      if (currentCarried <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Mekanda silinebilecek aktif bir kalan borç bulunmuyor.'
        })
      }

      const now = new Date()

      return await prisma.$transaction(async (tx) => {
        // Açıkta kalan tüm teslimat kayıtlarını kapat
        await tx.deliveryRecord.updateMany({
          where: {
            venueId: id,
            isSettled: false
          },
          data: {
            isSettled: true,
            settledAt: now
          }
        })

        await tx.venue.update({
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
      })
    }

    // 2. Geri alma işlemi (Undo)
    if (isUndo) {
      // En son yapılan tahsilat kaydını bul
      const latestPayments: any = await prisma.$queryRawUnsafe(
        `SELECT id, amount::text as amount, cash_amount::text as "cashAmount", transfer_amount::text as "transferAmount"
         FROM venue_payments
         WHERE venue_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        id
      )

      if (!latestPayments || latestPayments.length === 0) {
        if (!venue.lastSettledAt) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Geri alınabilecek bir tahsilat kaydı bulunamadı.'
          })
        }
      }

      const latestPayment = latestPayments && latestPayments.length > 0 ? latestPayments[0] : null
      const revertAmount = latestPayment ? Number(latestPayment.amount) : Number(venue.lastSettledAmount || 0)
      const revertCash = latestPayment ? Number(latestPayment.cashAmount || 0) : Number((venue as any).lastCashAmount || 0)
      const revertTransfer = latestPayment ? Number(latestPayment.transferAmount || 0) : Number((venue as any).lastTransferAmount || 0)

      return await prisma.$transaction(async (tx) => {
        if (latestPayment) {
          await tx.$executeRawUnsafe(`DELETE FROM venue_payments WHERE id = $1`, latestPayment.id)
        }

        // Tüm teslimatları topla
        const allRecords = await tx.deliveryRecord.findMany({
          where: { venueId: id },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
        })

        // Kalan ödemeleri topla
        const remainingPaymentsRes: any = await tx.$queryRawUnsafe(
          `SELECT COALESCE(SUM(amount), 0)::text as "totalCollected",
                  COALESCE(SUM(cash_amount), 0)::text as "totalCash",
                  COALESCE(SUM(transfer_amount), 0)::text as "totalTransfer"
           FROM venue_payments
           WHERE venue_id = $1`,
          id
        )

        const newTotalCollected = Number(remainingPaymentsRes[0]?.totalCollected || 0)
        const newTotalCash = Number(remainingPaymentsRes[0]?.totalCash || 0)
        const newTotalTransfer = Number(remainingPaymentsRes[0]?.totalTransfer || 0)

        let totalDeliveriesCents = 0
        for (const rec of allRecords) {
          const amt = Number(rec.venueTotalAmount || 0) > 0
            ? Number(rec.venueTotalAmount)
            : Number(rec.totalAmount || 0)
          totalDeliveriesCents += toCents(amt)
        }

        const newCollectedCents = toCents(newTotalCollected)
        const restoredCarriedBalance = fromCents(Math.max(0, totalDeliveriesCents - newCollectedCents))

        // FIFO teslimat kayıtlarını yeni toplama göre güncelle
        let runningBudgetCents = newCollectedCents
        for (const rec of allRecords) {
          const amtCents = toCents(Number(rec.venueTotalAmount || 0) > 0 ? Number(rec.venueTotalAmount) : Number(rec.totalAmount || 0))
          if (runningBudgetCents >= amtCents && amtCents > 0) {
            if (!rec.isSettled) {
              await tx.deliveryRecord.update({
                where: { id: rec.id },
                data: { isSettled: true, settledAt: rec.settledAt || new Date() }
              })
            }
            runningBudgetCents -= amtCents
          } else {
            if (rec.isSettled) {
              await tx.deliveryRecord.update({
                where: { id: rec.id },
                data: { isSettled: false, settledAt: null }
              })
            }
          }
        }

        // En son settlementPeriod kaydını sil
        const latestPeriod = await tx.settlementPeriod.findFirst({
          where: {
            type: 'VENUE',
            note: { contains: `"venueId":"${id}"` }
          },
          orderBy: { closedAt: 'desc' }
        })

        if (latestPeriod) {
          await tx.settlementPeriod.delete({
            where: { id: latestPeriod.id }
          }).catch(() => {})
        }

        await tx.venue.update({
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
          message: `${venue.name} için son tahsilat işlemi (${revertAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺) geri alındı. Kalan borç güncellendi.`,
          data: {
            venueId: id,
            carriedBalance: restoredCarriedBalance,
            totalCollectedAmount: newTotalCollected
          }
        }
      })
    }

    // 3. Normal veya Kısmi Tahsilat İşlemi
    // Doğrulama: Tutar boş, 0, negatif veya sayı olmama durumu
    if (body?.collectedAmount === undefined || body?.collectedAmount === null || body?.collectedAmount === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Lütfen tahsilat tutarını giriniz.'
      })
    }

    const cleanInput = String(body.collectedAmount).trim().replace(',', '.')
    const parsedAmount = parseFloat(cleanInput)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tahsilat tutarı 0\'dan büyük geçerli bir sayı olmalıdır.'
      })
    }

    // Mekanın açıkta (ödenmemiş) teslimat kayıtlarını topla
    const unsettledRecords = await prisma.deliveryRecord.findMany({
      where: {
        venueId: id,
        isSettled: false
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
    })

    let unsettledDeliveriesCents = 0
    let totalPackages = 0
    let indoorPackages = 0
    let outdoorPackages = 0

    for (const rec of unsettledRecords) {
      const count = rec.packageCount || 0
      const amt = Number(rec.venueTotalAmount || 0) > 0
        ? Number(rec.venueTotalAmount)
        : Number(rec.totalAmount || 0)

      totalPackages += count
      unsettledDeliveriesCents += toCents(amt)
      if (rec.deliveryType === 'INDOOR') {
        indoorPackages += count
      } else {
        outdoorPackages += count
      }
    }

    const currentCarriedCents = toCents(venue.carriedBalance || 0)
    // Mekanın şu anki bekleyen net borcu: Açık Teslimatlar + Devreden Bakiye
    const currentDueCents = unsettledDeliveriesCents + currentCarriedCents
    const collectedCents = toCents(parsedAmount)

    // Fazla tahsilat kontrolü: Tahsilat tutarı kalan bakiyeden büyükse engelle
    if (collectedCents > currentDueCents && currentDueCents > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Girilen tahsilat tutarı (${fromCents(collectedCents).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺), mekanın kalan borcundan (${fromCents(currentDueCents).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺) fazla olamaz.`
      })
    }

    const collectedAmount = fromCents(collectedCents)
    const newRemainingCents = Math.max(0, currentDueCents - collectedCents)
    const remainingBalance = fromCents(newRemainingCents)

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
      if (toCents(cashAmount + transferAmount) === 0 && collectedAmount > 0) {
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

    // 4. Veritabanı İşlemleri (Tek Transaction İçinde)
    return await prisma.$transaction(async (tx) => {
      // A. Yeni Tahsilat Kaydını venue_payments tablosuna ekle
      const paymentRecord = await createVenuePaymentRecord(tx, {
        venueId: id,
        amount: collectedAmount,
        paymentMethod,
        cashAmount,
        transferAmount,
        date: body?.date || now,
        notes: body?.notes
      })

      // B. Teslimat Kayıtları Kapatma
      if (remainingBalance === 0) {
        // Tam Tahsilat: Mekanın açık olan TÜM teslimatları kapatılır ve borç sıfırlanır!
        await tx.deliveryRecord.updateMany({
          where: {
            venueId: id,
            isSettled: false
          },
          data: {
            isSettled: true,
            settledAt: now
          }
        })
      } else {
        // Kısmi Tahsilat: Alınan tahsilat tutarı kadar en eskiden başlayarak teslimat kayıtları kapatılır
        let runningBudgetCents = collectedCents
        for (const rec of unsettledRecords) {
          const amtCents = toCents(Number(rec.venueTotalAmount || 0) > 0 ? Number(rec.venueTotalAmount) : Number(rec.totalAmount || 0))
          if (runningBudgetCents >= amtCents && amtCents > 0) {
            await tx.deliveryRecord.update({
              where: { id: rec.id },
              data: {
                isSettled: true,
                settledAt: now
              }
            })
            runningBudgetCents -= amtCents
          }
        }
      }

      // C. Mekan kaydını güncelle
      const updatedVenue = await tx.venue.update({
        where: { id },
        data: {
          lastSettledAt: now,
          lastSettledAmount: new Prisma.Decimal(collectedAmount.toFixed(2)),
          lastPaymentMethod: paymentMethod,
          lastCashAmount: new Prisma.Decimal(cashAmount.toFixed(2)),
          lastTransferAmount: new Prisma.Decimal(transferAmount.toFixed(2)),
          carriedBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
          prevCarriedBalance: venue.carriedBalance,
          totalCollectedAmount: {
            increment: new Prisma.Decimal(collectedAmount.toFixed(2))
          },
          totalCashAmount: {
            increment: new Prisma.Decimal(cashAmount.toFixed(2))
          },
          totalTransferAmount: {
            increment: new Prisma.Decimal(transferAmount.toFixed(2))
          }
        }
      })

      // D. SettlementPeriod log kaydı (Geriye dönük uyumluluk ve denetim logu)
      try {
        const shifted = new Date(now.getTime() - 3 * 3600 * 1000)
        const bDateStr = shifted.toISOString().substring(0, 10)
        const weekCode = getISOWeekString(bDateStr)
        const weekRange = getWeekDateRange(weekCode)
        await tx.settlementPeriod.create({
          data: {
            type: 'VENUE',
            week: weekCode,
            startDate: weekRange.startDate,
            endDate: weekRange.endDate,
            totalPackages,
            totalEarnings: new Prisma.Decimal(fromCents(currentDueCents).toFixed(2)),
            totalAdvance: new Prisma.Decimal(0),
            paidAmount: new Prisma.Decimal(collectedAmount.toFixed(2)),
            remainingBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
            closedAt: now,
            note: JSON.stringify({
              paymentId: paymentRecord.id,
              venueId: id,
              venueName: venue.name,
              paymentMethod,
              cashAmount,
              transferAmount,
              collectedAmount,
              remainingBalance,
              totalDue: fromCents(currentDueCents),
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
        ? `${venue.name} için ${collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ ${paymentMethodLabel} tahsilat alındı. Kalan bakiye: ${remainingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺.`
        : `${venue.name} için ${collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ ${paymentMethodLabel} tahsilat alındı ve mekanın borcu tamamen kapatıldı.`

      return {
        success: true,
        message,
        data: {
          paymentId: paymentRecord.id,
          venueId: id,
          settledAmount: collectedAmount,
          remainingBalance,
          totalDue: fromCents(currentDueCents),
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
    })
  } catch (error: any) {
    console.error('Venue settle error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Mekan tahsilat işlemi gerçekleştirilemedi.'
    })
  }
})
