import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const transactionSchema = z.object({
  amount: z.number().positive('Tutar sıfırdan büyük olmalıdır.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih giriniz (YYYY-AA-GG).'),
  description: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Kurye ID eksik.' })
  }

  const body = await readBody(event)
  const validationResult = transactionSchema.safeParse({
    amount: Number(body.amount),
    date: body.date,
    description: body.description
  })

  if (!validationResult.success) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: validationResult.error.errors[0].message 
    })
  }

  const { amount, date, description } = validationResult.data

  try {
    const transaction = await prisma.courierTransaction.create({
      data: {
        courierId: id,
        amount,
        date: new Date(date),
        description
      }
    })

    return {
      success: true,
      data: transaction
    }
  } catch (error: any) {
    console.error('Error creating courier transaction:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Para girişi eklenirken bir hata oluştu.'
    })
  }
})
