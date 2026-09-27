import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async () => {
  try {
    const periods = await prisma.settlementPeriod.findMany({
      orderBy: [
        { startDate: 'desc' },
        { closedAt: 'desc' }
      ],
      include: {
        courier: {
          select: { id: true, name: true, phone: true }
        },
        _count: {
          select: { advances: true }
        }
      }
    })

    const formatted = periods.map(p => {
      const s = new Date(p.startDate)
      const e = new Date(p.endDate)
      const c = new Date(p.closedAt)

      const startFormatted = `${String(s.getUTCDate()).padStart(2, '0')}.${String(s.getUTCMonth() + 1).padStart(2, '0')}.${s.getUTCFullYear()}`
      const endFormatted = `${String(e.getUTCDate()).padStart(2, '0')}.${String(e.getUTCMonth() + 1).padStart(2, '0')}.${e.getUTCFullYear()}`
      const closedFormatted = `${String(c.getUTCDate()).padStart(2, '0')}.${String(c.getUTCMonth() + 1).padStart(2, '0')}.${c.getUTCFullYear()} ${String(c.getHours()).padStart(2, '0')}:${String(c.getMinutes()).padStart(2, '0')}`

      return {
        id: p.id,
        type: p.type,
        week: p.week,
        startDate: p.startDate.toISOString().substring(0, 10),
        endDate: p.endDate.toISOString().substring(0, 10),
        startDateFormatted: startFormatted,
        endDateFormatted: endFormatted,
        totalPackages: p.totalPackages,
        totalEarnings: Number(p.totalEarnings),
        totalAdvance: Number(p.totalAdvance),
        remainingBalance: Number(p.remainingBalance),
        closedAtFormatted: closedFormatted,
        note: p.note,
        advancesCount: p._count.advances,
        courier: p.courier ? { id: p.courier.id, name: p.courier.name } : null
      }
    })

    return {
      success: true,
      data: formatted
    }
  } catch (error: any) {
    console.error('Error fetching settlement periods:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Kapatılan dönemler alınırken bir hata oluştu.'
    })
  }
})
