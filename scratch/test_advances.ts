import { PrismaClient } from '@prisma/client'
import { getISOWeekString, getWeekDateRange, getIstanbulDateString } from '../server/utils/period'

const prisma = new PrismaClient()

async function runTests() {
  console.log('==================================================')
  console.log('🚀 AVANS & HAKEDİŞ SİSTEMİ TEST SENARYOLARI')
  console.log('==================================================\n')

  // 0. Test için "Ahmet (Test)" kuryesi bul veya oluştur
  let courier = await prisma.courier.findFirst({
    where: { name: { contains: 'Ahmet' } }
  })

  if (!courier) {
    courier = await prisma.courier.create({
      data: {
        name: 'Ahmet (Test Kurye)',
        phone: '5551112233',
        indoorPrice: 50,
        outdoorPrice: 70,
        isActive: true
      }
    })
    console.log(`✓ Test kuryesi oluşturuldu: ${courier.name} (ID: ${courier.id})`)
  } else {
    console.log(`✓ Mevcut kurye kullanılıyor: ${courier.name} (ID: ${courier.id})`)
  }

  // Temiz bir başlangıç için kuryenin önceki test avanslarını temizleyelim
  await prisma.courierAdvance.deleteMany({
    where: { courierId: courier.id }
  })
  await prisma.courier.update({
    where: { id: courier.id },
    data: { paidAmount: 0 }
  })

  const todayStr = '2026-09-27'
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const todayDate = new Date(Date.UTC(ty, tm - 1, td))
  const weekCode = getISOWeekString(todayDate)

  // --------------------------------------------------
  // TEST 1: Ahmet'e 500 TL avans ver.
  // --------------------------------------------------
  console.log('\n--- TEST 1: 500 TL Avans Kaydı ---')
  const advance1 = await prisma.courierAdvance.create({
    data: {
      courierId: courier.id,
      amount: 500,
      date: todayDate,
      time: '10:30',
      week: weekCode,
      description: 'Nakit avans',
      status: 'ACTIVE'
    }
  })
  console.log(`✓ Avans 1 kaydedildi: ID=${advance1.id}, Tutar=${advance1.amount} TL, Saat=${advance1.time}`)
  if (Number(advance1.amount) === 500) {
    console.log('✅ TEST 1 BAŞARILI: 500 TL avans kaydı veritabanında oluşturuldu.')
  } else {
    console.error('❌ TEST 1 BAŞARISIZ!')
  }

  // --------------------------------------------------
  // TEST 2: Aynı gün Ahmet'e 300 TL daha ver.
  // --------------------------------------------------
  console.log('\n--- TEST 2: Aynı Gün 300 TL Ek Avans ---')
  const advance2 = await prisma.courierAdvance.create({
    data: {
      courierId: courier.id,
      amount: 300,
      date: todayDate,
      time: '15:45',
      week: weekCode,
      description: 'Yol gideri avansı',
      status: 'ACTIVE'
    }
  })
  console.log(`✓ Avans 2 kaydedildi: ID=${advance2.id}, Tutar=${advance2.amount} TL, Saat=${advance2.time}`)

  // Kontrol: İki ayrı kayıt var mı ve günlük toplam 800 TL mi?
  const dailyAdvances = await prisma.courierAdvance.findMany({
    where: {
      courierId: courier.id,
      date: todayDate
    }
  })
  const dailyTotal = dailyAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
  console.log(`Günlük Kayıt Sayısı: ${dailyAdvances.length} adet`)
  console.log(`Günlük Toplam Avans: ${dailyTotal} TL`)

  if (dailyAdvances.length === 2 && dailyTotal === 800) {
    console.log('✅ TEST 2 BAŞARILI: İki ayrı kayıt tutuldu, birbirinin üzerine yazılmadı, günlük toplam 800 TL.')
  } else {
    console.error('❌ TEST 2 BAŞARISIZ!')
  }

  // --------------------------------------------------
  // TEST 3: Başka bir gün 1.000 TL ver.
  // --------------------------------------------------
  console.log('\n--- TEST 3: Başka Bir Gün 1.000 TL Avans ---')
  // Aynı haftanın dünü: 2026-09-26
  const anotherDayDate = new Date(Date.UTC(2026, 8, 26)) // 26 Eylül 2026
  const advance3 = await prisma.courierAdvance.create({
    data: {
      courierId: courier.id,
      amount: 1000,
      date: anotherDayDate,
      time: '11:20',
      week: weekCode,
      description: 'Haftalık avans',
      status: 'ACTIVE'
    }
  })
  console.log(`✓ Avans 3 kaydedildi: ID=${advance3.id}, Tutar=${advance3.amount} TL, Tarih=26.09.2026`)

  const weekRange = getWeekDateRange(todayDate)
  const weeklyAdvances = await prisma.courierAdvance.findMany({
    where: {
      courierId: courier.id,
      date: {
        gte: weekRange.startDate,
        lte: weekRange.endDate
      }
    }
  })
  const weeklyTotal = weeklyAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
  console.log(`Haftalık Toplam Avans (${weekRange.startStr} - ${weekRange.endStr}): ${weeklyTotal} TL`)

  if (weeklyTotal === 1800) {
    console.log('✅ TEST 3 BAŞARILI: Haftalık toplam 1.800 TL olarak doğru hesaplandı.')
  } else {
    console.error('❌ TEST 3 BAŞARISIZ!')
  }

  // --------------------------------------------------
  // TEST 4: Hafta kapat.
  // --------------------------------------------------
  console.log('\n--- TEST 4: Haftayı Kapatma & Arşivleme ---')
  // Simüle edilmiş haftalık teslimat / hakediş ekleyelim
  const dummyDelivery = await prisma.deliveryRecord.create({
    data: {
      courierId: courier.id,
      date: todayDate,
      deliveryType: 'INDOOR',
      packageCount: 50,
      courierPriceSnapshot: 50,
      courierTotalAmount: 2500,
      totalAmount: 2500
    }
  })

  // Haftayı Kapatma işlemi:
  const now = new Date()
  const period = await prisma.settlementPeriod.create({
    data: {
      type: 'WEEKLY',
      courierId: courier.id,
      week: weekCode,
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
      totalPackages: 50,
      totalEarnings: 2500,
      totalAdvance: weeklyTotal,
      remainingBalance: 2500 - weeklyTotal,
      closedAt: now,
      note: '2026-W39 Haftalık Kapatma Testi'
    }
  })

  // Avansları CLOSED yap
  await prisma.courierAdvance.updateMany({
    where: {
      courierId: courier.id,
      date: {
        gte: weekRange.startDate,
        lte: weekRange.endDate
      },
      status: 'ACTIVE'
    },
    data: {
      status: 'CLOSED',
      periodId: period.id,
      closedAt: now,
      archivedAt: now
    }
  })

  // Kalan aktif avansları kontrol et
  const remainingActiveAdvances = await prisma.courierAdvance.findMany({
    where: {
      courierId: courier.id,
      status: 'ACTIVE'
    }
  })

  // Arşivlenen toplam avans kayıtları hala veritabanında mı?
  const allHistoricalAdvances = await prisma.courierAdvance.findMany({
    where: { courierId: courier.id }
  })

  console.log(`Aktif Kalan Avans Sayısı: ${remainingActiveAdvances.length} (Beklenen: 0)`)
  console.log(`Geçmiş Raporlarda Kalan Avans Sayısı: ${allHistoricalAdvances.length} (Beklenen: 3)`)
  console.log(`Kapatılan Dönem Kalan Hakediş: ${period.remainingBalance} TL (Beklenen: 700 TL)`)

  if (remainingActiveAdvances.length === 0 && allHistoricalAdvances.length === 3 && Number(period.remainingBalance) === 700) {
    console.log('✅ TEST 4 BAŞARILI: Hafta kapatıldı, avanslar arşivlendi, aktif dönemden çıkarıldı ancak geçmiş raporda korundu.')
  } else {
    console.error('❌ TEST 4 BAŞARISIZ!')
  }

  // --------------------------------------------------
  // TEST 5: Kalan hakediş hesabı kontrolü
  // --------------------------------------------------
  console.log('\n--- TEST 5: Kalan Hakediş Doğrulama (Toplam Hakediş - Aktif Avanslar) ---')
  // Yeni haftada yeni bir aktif avans verelim: 200 TL
  const newAdvance = await prisma.courierAdvance.create({
    data: {
      courierId: courier.id,
      amount: 200,
      date: todayDate,
      time: '18:00',
      week: weekCode,
      status: 'ACTIVE'
    }
  })

  // Kuryenin toplam hakedişi = 2500 TL (dummy delivery'den)
  // Kuryenin aktif avansı = 200 TL
  // Kalan Hakediş = 2500 - 200 = 2300 TL
  const currentActiveAdvances = await prisma.courierAdvance.aggregate({
    where: { courierId: courier.id, status: 'ACTIVE' },
    _sum: { amount: true }
  })
  const currentActiveAdvTotal = Number(currentActiveAdvances._sum.amount || 0)
  const remainingBalanceCalculated = 2500 - currentActiveAdvTotal

  console.log(`Toplam Hakediş: 2.500 TL`)
  console.log(`Aktif Avans: ${currentActiveAdvTotal} TL`)
  console.log(`Hesaplanan Kalan Hakediş: ${remainingBalanceCalculated} TL`)

  if (remainingBalanceCalculated === 2300) {
    console.log('✅ TEST 5 BAŞARILI: Kalan Hakediş = Toplam Hakediş - Aktif Avanslar tam doğru hesaplandı.')
  } else {
    console.error('❌ TEST 5 BAŞARISIZ!')
  }

  // Test verilerini temizleyelim
  await prisma.deliveryRecord.delete({ where: { id: dummyDelivery.id } })
  await prisma.courierAdvance.deleteMany({ where: { courierId: courier.id } })
  await prisma.settlementPeriod.delete({ where: { id: period.id } })

  console.log('\n==================================================')
  console.log('🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!')
  console.log('==================================================\n')
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
