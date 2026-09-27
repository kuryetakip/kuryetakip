import { prisma } from '../../../../utils/prisma'
import { z } from 'zod'
import {
  parseMoneyAmount,
  getIstanbulDateString,
  getIstanbulTimeString,
  getISOWeekString
} from '../../../../utils/period'

const advanceSchema = z.object({
  amount: z.union([z.number(), z.string()]).refine(val => {
    const num = parseMoneyAmount(val)
    return !isNaN(num) && num > 0
  }, { message: 'Avans miktarı 0\'dan büyük geçerli bir tutar olmalıdır.' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih giriniz (YYYY-AA-GG).').optional(),
  time: z.string().optional(),
  description: z.string().max(255).optional().nullable()
})

export default defineEventHandler(async (event) => {
  try {
    const courierId = getRouterParam(event, 'id')
    if (!courierId) {
      throw createError({ statusCode: 400, statusMessage: 'Kurye ID eksik.' })
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId }
    })

    if (!courier) {
      throw createError({ statusCode: 404, statusMessage: 'Kurye bulunamadı.' })
    }

    const body = await readBody(event)
    const validationResult = advanceSchema.safeParse(body)

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: validationResult.error.errors[0]?.message || 'Geçersiz avans bilgisi.'
      })
    }

    const { amount: rawAmount, date: rawDate, time: rawTime, description } = validationResult.data
    const amount = parseMoneyAmount(rawAmount)

    const todayStr = getIstanbulDateString()
    const currentTimeStr = getIstanbulTimeString()
    const targetDateStr = rawDate || todayStr
    const targetTimeStr = rawTime || currentTimeStr

    const [y, m, d] = targetDateStr.split('-').map(Number)
    const targetDateUTC = new Date(Date.UTC(y, m - 1, d))
    const weekCode = getISOWeekString(targetDateUTC)

    // Duplicate submission protection: check if identical advance was submitted within last 3 seconds
    const threeSecondsAgo = new Date(Date.now() - 3000)
    const duplicate = await prisma.courierAdvance.findFirst({
      where: {
        courierId,
        amount,
        createdAt: { gte: threeSecondsAgo }
      }
    })

    if (duplicate) {
      return {
        success: true,
        data: duplicate,
        message: 'Bu avans kaydı zaten işlendi.'
      }
    }

    // Create CourierAdvance record
    const advance = await prisma.courierAdvance.create({
      data: {
        courierId,
        amount,
        date: targetDateUTC,
        time: targetTimeStr,
        week: weekCode,
        description: description?.trim() || null,
        status: 'ACTIVE'
      }
    })

    // Calculate updated active total advances for this courier to maintain sync
    const sumResult = await prisma.courierAdvance.aggregate({
      where: {
        courierId,
        status: 'ACTIVE'
      },
      _sum: {
        amount: true
      }
    })

    const updatedActiveTotal = Number(sumResult._sum.amount || 0)

    // Synchronize courier.paidAmount for backward compatibility
    await prisma.courier.update({
      where: { id: courierId },
      data: {
        paidAmount: updatedActiveTotal
      }
    })

    return {
      success: true,
      data: {
        ...advance,
        formattedAmount: amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        courierName: courier.name
      },
      message: `${courier.name} kuryesine ${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ avans başarıyla kaydedildi.`
    }
  } catch (error: any) {
    console.error('Error creating courier advance:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Avans kaydedilirken bir hata oluştu.'
    })
  }
})
