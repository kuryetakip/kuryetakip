import { prisma, Prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz kurye ID.'
      })
    }

    const body = await readBody(event).catch(() => ({}))
    const isUndo = body?.action === 'undo'

    const courier = await prisma.courier.findUnique({
      where: { id },
      include: {
        settlementPeriods: {
          orderBy: { closedAt: 'desc' },
          take: 2
        }
      }
    })

    if (!courier) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kurye bulunamadı.'
      })
    }

    // 1. GERİ ALMA (UNDO) İŞLEMİ
    if (isUndo) {
      if (!courier.lastSettledAt) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geri alınabilecek bir kurye hakediş ödeme kaydı bulunamadı.'
        })
      }

      const lastSettledDate = new Date(courier.lastSettledAt)
      const windowStart = new Date(lastSettledDate.getTime() - 120000) // 2 dk tolerans

      // Kuryenin son kapatılan teslimat kayıtlarını geri aç
      const revertedRecords = await prisma.deliveryRecord.updateMany({
        where: {
          courierId: id,
          isCourierSettled: true,
          courierSettledAt: {
            gte: windowStart
          }
        },
        data: {
          isCourierSettled: false,
          courierSettledAt: null
        }
      })

      // Son kapatılan avansları geri aç
      const revertedAdvances = await prisma.courierAdvance.updateMany({
        where: {
          courierId: id,
          status: 'CLOSED',
          closedAt: {
            gte: windowStart
          }
        },
        data: {
          status: 'ACTIVE',
          closedAt: null,
          archivedAt: null,
          periodId: null
        }
      })

      // En son oluşturulan settlementPeriod kaydını sil
      const latestPeriod = courier.settlementPeriods[0]
      if (latestPeriod && Math.abs(new Date(latestPeriod.closedAt).getTime() - lastSettledDate.getTime()) < 120000) {
        await prisma.settlementPeriod.delete({
          where: { id: latestPeriod.id }
        })
      }

      // Kuryenin aktif avans toplamını ve devreden bakiyesini eski haline getir
      const activeAdvSum = await prisma.courierAdvance.aggregate({
        where: {
          courierId: id,
          status: 'ACTIVE'
        },
        _sum: { amount: true }
      })

      const prevPeriod = courier.settlementPeriods[1]
      const restoredCarriedBalance = prevPeriod ? Number(prevPeriod.remainingBalance || 0) : 0

      await prisma.courier.update({
        where: { id },
        data: {
          lastSettledAt: prevPeriod ? prevPeriod.closedAt : null,
          lastSettledAmount: prevPeriod ? prevPeriod.paidAmount : new Prisma.Decimal(0),
          carriedBalance: new Prisma.Decimal(restoredCarriedBalance.toFixed(2)),
          paidAmount: new Prisma.Decimal((Number(activeAdvSum._sum.amount || 0)).toFixed(2))
        }
      })

      return {
        success: true,
        message: `${courier.name} için son hakediş ödemesi geri alındı. Teslimatlar ve avanslar aktif döneme aktarıldı.`,
        data: {
          courierId: id,
          revertedDeliveryCount: revertedRecords.count,
          revertedAdvanceCount: revertedAdvances.count
        }
      }
    }

    // 2. NORMAL HAKEDİŞ ÖDEMESİ / TAHSİLAT VE DÖNEM KAPATMA
    const unsettledRecords = await prisma.deliveryRecord.findMany({
      where: {
        courierId: id,
        isCourierSettled: false
      },
      orderBy: { date: 'asc' }
    })

    let cyclePackages = 0
    let cycleEarnings = 0

    for (const rec of unsettledRecords) {
      cyclePackages += rec.packageCount || 0
      const amt = Number(rec.courierTotalAmount || 0) > 0
        ? Number(rec.courierTotalAmount)
        : Number(rec.totalAmount || 0)
      cycleEarnings += amt
    }

    const carriedBalance = Number(courier.carriedBalance || 0)
    const totalEarnings = Number((cycleEarnings + carriedBalance).toFixed(2))

    // Aktif avanslar
    const activeAdvances = await prisma.courierAdvance.findMany({
      where: {
        courierId: id,
        status: 'ACTIVE'
      }
    })

    let totalAdvance = 0
    for (const adv of activeAdvances) {
      totalAdvance += Number(adv.amount || 0)
    }
    totalAdvance = Number(totalAdvance.toFixed(2))

    // Kuryeye ödenmesi gereken net tutar
    const netDue = Number((totalEarnings - totalAdvance).toFixed(2))

    // Kullanıcının kuryeye fiilen ödediği tutar (gönderilmemişse netDue varsayılır)
    const payoutAmount = (body?.payoutAmount !== undefined && body?.payoutAmount !== null && !isNaN(Number(body.payoutAmount)))
      ? Math.max(0, Number(body.payoutAmount))
      : Math.max(0, netDue)

    // Kullanıcının belirttiği: "kuryelere verdiğim tahsilat yapıldıktan sonra kalan tutar miktarı tutulsun"
    // Örnek: Hakediş 19.430 TL, Ödenen 19.000 TL -> Devreden Bakiye 430 TL olarak saklanır.
    const remainingBalance = Number((netDue - payoutAmount).toFixed(2))

    const now = new Date()
    const startDate = unsettledRecords.length > 0 ? unsettledRecords[0].date : now
    const endDate = unsettledRecords.length > 0 ? unsettledRecords[unsettledRecords.length - 1].date : now

    const result = await prisma.$transaction(async (tx) => {
      // Teslimat kayıtlarını kapat
      if (unsettledRecords.length > 0) {
        await tx.deliveryRecord.updateMany({
          where: {
            id: { in: unsettledRecords.map(r => r.id) }
          },
          data: {
            isCourierSettled: true,
            courierSettledAt: now
          }
        })
      }

      // Aktif avansları kapat
      if (activeAdvances.length > 0) {
        await tx.courierAdvance.updateMany({
          where: {
            id: { in: activeAdvances.map(a => a.id) }
          },
          data: {
            status: 'CLOSED',
            closedAt: now,
            archivedAt: now
          }
        })
      }

      // SettlementPeriod oluştur
      const period = await tx.settlementPeriod.create({
        data: {
          type: 'COURIER',
          courierId: id,
          startDate,
          endDate,
          totalPackages: cyclePackages,
          totalEarnings: new Prisma.Decimal(totalEarnings.toFixed(2)),
          totalAdvance: new Prisma.Decimal(totalAdvance.toFixed(2)),
          paidAmount: new Prisma.Decimal(payoutAmount.toFixed(2)),
          remainingBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
          closedAt: now,
          note: body?.note?.trim() || null
        }
      })

      // Kurye kaydını güncelle: devreden bakiyeyi yaz, son ödeme tutarını ve tarihini kaydet, aktif avansı sıfırla
      const updatedCourier = await tx.courier.update({
        where: { id },
        data: {
          carriedBalance: new Prisma.Decimal(remainingBalance.toFixed(2)),
          lastSettledAt: now,
          lastSettledAmount: new Prisma.Decimal(payoutAmount.toFixed(2)),
          paidAmount: new Prisma.Decimal(0)
        }
      })

      return { period, updatedCourier }
    })

    return {
      success: true,
      message: `${courier.name} için ${payoutAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ hakediş ödemesi kaydedildi.${remainingBalance > 0 ? ` Kalan ${remainingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ sonraki döneme devredildi.` : ''}`,
      data: {
        courierId: id,
        courierName: courier.name,
        settledDeliveriesCount: unsettledRecords.length,
        settledPackagesCount: cyclePackages,
        cycleEarnings,
        carriedBalance,
        totalEarnings,
        totalAdvance,
        payoutAmount,
        remainingBalance,
        lastSettledAt: now
      }
    }
  } catch (error: any) {
    console.error('Courier settle error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kurye hakediş ödemesi yapılırken bir hata oluştu.'
    })
  }
})
