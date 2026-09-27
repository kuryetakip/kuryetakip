import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Mekan paket kayıtları ve tahsilat bakiyeleri sıfırlanıyor...')

  // 1. Mekanlara ait tüm teslimat kayıtlarını say ve sil
  const countBefore = await prisma.deliveryRecord.count({
    where: {
      venueId: { not: null }
    }
  })

  console.log(`📊 Silinecek mekan teslimat kaydı sayısı: ${countBefore}`)

  const deleteResult = await prisma.deliveryRecord.deleteMany({
    where: {
      venueId: { not: null }
    }
  })

  console.log(`✅ ${deleteResult.count} adet mekan teslimat kaydı başarıyla silindi.`)

  // 2. Mekanların tahsilat bakiye ve son tahsilat alanlarını sıfırla
  const venueUpdateResult = await prisma.venue.updateMany({
    data: {
      lastSettledAt: null,
      lastSettledAmount: null,
      totalCollectedAmount: 0
    }
  })

  console.log(`✅ ${venueUpdateResult.count} adet mekanın tahsilat bakiyesi sıfırlandı. Mekanlar ve fiyat ayarları korundu.`)
  console.log('✨ İşlem tamamlandı. Artık mekanlar sayfasına yeni güncel paket verilerini girebilirsiniz.')
}

main()
  .catch((e) => {
    console.error('❌ Hata oluştu:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
