import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { getWeekDateRange, getISOWeekString } from '../../../utils/period'

const closeWeekSchema = z.object({
  week: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  courierId: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable()
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validationResult = closeWeekSchema.safeParse(body || {})

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: validationResult.error.errors[0]?.message || 'Geçersiz parametre.'
      })
    }

    const { week, startDate: startStr, endDate: endStr, courierId, note } = validationResult.data

    let fromDate: Date
    let toDate: Date
    let weekCode: string

    if (startStr && endStr) {
      const [sy, sm, sd] = startStr.split('-').map(Number)
      const [ey, em, ed] = endStr.split('-').map(Number)
      fromDate = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0))
      toDate = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999))
      weekCode = week || getISOWeekString(fromDate)
    } else {
      const range = getWeekDateRange(week || new Date())
      fromDate = range.startDate
      toDate = range.endDate
      weekCode = range.weekStr
    }

    // 1. Calculate Delivery Totals for the specified range
    const deliveryWhere: any = {
      date: {
        gte: fromDate,
        lte: toDate
      }
    }
    if (courierId) {
      deliveryWhere.courierId = courierId
    }

    const deliveries = await prisma.deliveryRecord.findMany({
      where: deliveryWhere,
      select: {
        packageCount: true,
        totalAmount: true,
        courierTotalAmount: true
      }
    })

    let totalPackages = 0
    let totalEarnings = 0

    for (const d of deliveries) {
      totalPackages += d.packageCount || 0
      const amt = Number(d.courierTotalAmount || 0) > 0 ? Number(d.courierTotalAmount) : Number(d.totalAmount || 0)
      totalEarnings += amt
    }

    // 2. Find ACTIVE advances within this range and week
    const advanceWhere: any = {
      status: 'ACTIVE',
      date: {
        gte: fromDate,
        lte: toDate
      }
    }
    if (courierId) {
      advanceWhere.courierId = courierId
    }

    const activeAdvances = await prisma.courierAdvance.findMany({
      where: advanceWhere
    })

    let totalAdvance = 0
    for (const adv of activeAdvances) {
      totalAdvance += Number(adv.amount)
    }

    const remainingBalance = Number((totalEarnings - totalAdvance).toFixed(2))

    // 3. Perform Settlement and archive advances in a database transaction
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      // Create SettlementPeriod record
      const period = await tx.settlementPeriod.create({
        data: {
          type: 'WEEKLY',
          courierId: courierId || null,
          week: weekCode,
          startDate: fromDate,
          endDate: toDate,
          totalPackages,
          totalEarnings: Number(totalEarnings.toFixed(2)),
          totalAdvance: Number(totalAdvance.toFixed(2)),
          remainingBalance,
          closedAt: now,
          note: note?.trim() || null
        }
      })

      // Update delivery records for the closed period
      await tx.deliveryRecord.updateMany({
        where: deliveryWhere,
        data: {
          isCourierSettled: true,
          courierSettledAt: now
        }
      })

      // Update all active advances to CLOSED and link to this settlement period
      if (activeAdvances.length > 0) {
        await tx.courierAdvance.updateMany({
          where: {
            id: { in: activeAdvances.map(a => a.id) }
          },
          data: {
            status: 'CLOSED',
            periodId: period.id,
            closedAt: now,
            archivedAt: now
          }
        })
      }

      // Sync affected couriers' paidAmount with their remaining ACTIVE advances
      const affectedCourierIds = courierId
        ? [courierId]
        : Array.from(new Set(activeAdvances.map(a => a.courierId)))

      for (const cId of affectedCourierIds) {
        const sumRes = await tx.courierAdvance.aggregate({
          where: {
            courierId: cId,
            status: 'ACTIVE'
          },
          _sum: { amount: true }
        })
        const newPaidAmount = Number(sumRes._sum.amount || 0)

        await tx.courier.update({
          where: { id: cId },
          data: { paidAmount: newPaidAmount }
        })
      }

      return period
    })

    const startFmt = `${String(fromDate.getUTCDate()).padStart(2, '0')}.${String(fromDate.getUTCMonth() + 1).padStart(2, '0')}.${fromDate.getUTCFullYear()}`
    const endFmt = `${String(toDate.getUTCDate()).padStart(2, '0')}.${String(toDate.getUTCMonth() + 1).padStart(2, '0')}.${toDate.getUTCFullYear()}`

    return {
      success: true,
      message: `${weekCode} (${startFmt} - ${endFmt}) haftası başarıyla kapatıldı ve arşivlendi.`,
      data: {
        ...result,
        week: weekCode,
        startDateFormatted: startFmt,
        endDateFormatted: endFmt,
        totalPackages,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        totalAdvance: Number(totalAdvance.toFixed(2)),
        remainingBalance,
        closedAdvancesCount: activeAdvances.length
      }
    }
  } catch (error: any) {
    console.error('Error closing settlement week:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Hafta kapatılırken bir hata oluştu.'
    })
  }
})
