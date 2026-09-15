import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  try {
    // 1. Get or initialize default user account
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'admin@kuryetakip.com',
          name: 'Operasyon Yöneticisi'
        }
      })
    }

    // 2. Fetch live database telemetry
    const [courierCount, venueCount, deliveryCount] = await Promise.all([
      prisma.courier.count({ where: { isActive: true } }),
      prisma.venue.count({ where: { isActive: true } }),
      prisma.deliveryRecord.count()
    ])

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name || 'Operasyon Yöneticisi',
          email: user.email
        },
        app: {
          name: 'KuryeTakip',
          version: '1.0.0',
          description: 'Kurye & Mekan Hakediş Takip Sistemi',
          environment: process.env.NODE_ENV || 'production'
        },
        preferences: {
          currency: 'TRY',
          currencySymbol: '₺',
          defaultPeriod: 'month',
          pdfReportTitle: 'KURYE HAKEDİŞ RAPORU',
          whatsappDefaultNote: 'Hakediş raporu PDF olarak hazırlanmıştır.'
        },
        systemStats: {
          activeCouriers: courierCount,
          activeVenues: venueCount,
          totalDeliveries: deliveryCount,
          databaseStatus: 'connected',
          databaseEngine: 'Supabase PostgreSQL (Prisma ORM)'
        }
      }
    }
  } catch (error: any) {
    console.error('Settings GET error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ayarlar yüklenirken hata oluştu.'
    })
  }
})
