import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const courierId = query.courierId as string | undefined
  const type = query.type as 'daily' | 'weekly' | 'monthly' | undefined || 'daily'
  
  let startDate: Date
  let endDate: Date = new Date()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (type === 'daily') {
    startDate = new Date(today)
  } else if (type === 'weekly') {
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Start of week (Monday)
    startDate = new Date(today.setDate(diff))
  } else if (type === 'monthly') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1)
  } else {
    startDate = new Date(today)
  }
  
  try {
    const whereClause: any = {
      entryDate: {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (courierId) {
      whereClause.courierId = courierId
    }
    
    const transactions = await prisma.courierTransaction.findMany({
      where: whereClause,
      include: {
        courier: {
          select: { name: true }
        }
      },
      orderBy: { entryDate: 'desc' }
    })
    
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
    
    return {
      success: true,
      data: {
        transactions,
        totalAmount,
        startDate,
        endDate,
        type
      }
    }
  } catch (error: any) {
    console.error('Error fetching earnings report:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Rapor verileri alınırken bir hata oluştu.'
    })
  }
})
