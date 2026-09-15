import { PrismaClient, DeliveryType } from '@prisma/client'
import { Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Veritabanı seed işlemi başlatılıyor...')

  // 1. Örnek Kullanıcı (User)
  const user = await prisma.user.upsert({
    where: { email: 'admin@kuryetakip.com' },
    update: {},
    create: {
      email: 'admin@kuryetakip.com',
      name: 'Yönetici'
    }
  })
  console.log('✅ Kullanıcı oluşturuldu:', user.email)

  // 2. Örnek Mekan (Venue): Terra Pizza (Indoor: 34 TL, Outdoor: 36 TL)
  const venue = await prisma.venue.upsert({
    where: { id: 'seed-venue-terra-pizza' },
    update: {
      name: 'Terra Pizza',
      indoorPrice: new Prisma.Decimal('34.00'),
      outdoorPrice: new Prisma.Decimal('36.00'),
      isActive: true
    },
    create: {
      id: 'seed-venue-terra-pizza',
      name: 'Terra Pizza',
      indoorPrice: new Prisma.Decimal('34.00'),
      outdoorPrice: new Prisma.Decimal('36.00'),
      isActive: true
    }
  })
  console.log('✅ Mekan oluşturuldu: %s (İç: %s TL, Dış: %s TL)', venue.name, venue.indoorPrice, venue.outdoorPrice)

  // 3. Örnek Kurye (Courier): Ahmet
  const courier = await prisma.courier.upsert({
    where: { id: 'seed-courier-ahmet' },
    update: {
      name: 'Ahmet',
      phone: '05551234567',
      isActive: true
    },
    create: {
      id: 'seed-courier-ahmet',
      name: 'Ahmet',
      phone: '05551234567',
      isActive: true
    }
  })
  console.log('✅ Kurye oluşturuldu: %s', courier.name)

  // 4. Kurye + Mekan Özel Fiyatı (CourierVenuePrice): Ahmet + Terra Pizza (Indoor: 30 TL, Outdoor: 32 TL)
  const customPrice = await prisma.courierVenuePrice.upsert({
    where: {
      courierId_venueId: {
        courierId: courier.id,
        venueId: venue.id
      }
    },
    update: {
      indoorPrice: new Prisma.Decimal('30.00'),
      outdoorPrice: new Prisma.Decimal('32.00')
    },
    create: {
      courierId: courier.id,
      venueId: venue.id,
      indoorPrice: new Prisma.Decimal('30.00'),
      outdoorPrice: new Prisma.Decimal('32.00')
    }
  })
  console.log('✅ Kurye-Mekan Özel Fiyatı tanımlandı: Ahmet @ Terra Pizza -> (İç: %s TL, Dış: %s TL)', customPrice.indoorPrice, customPrice.outdoorPrice)

  // 5. Örnek Paket Kayıtları (DeliveryRecord)
  const today = new Date()
  const todayDateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  // Örnek: 15 adet İç Paket (Ahmet'e özel 30 TL'den = 450 TL)
  await prisma.deliveryRecord.create({
    data: {
      date: todayDateOnly,
      courierId: courier.id,
      venueId: venue.id,
      deliveryType: DeliveryType.INDOOR,
      packageCount: 15,
      unitPriceSnapshot: new Prisma.Decimal('30.00'),
      totalAmount: new Prisma.Decimal('450.00')
    }
  })

  // Örnek: 10 adet Dış Paket (Ahmet'e özel 32 TL'den = 320 TL)
  await prisma.deliveryRecord.create({
    data: {
      date: todayDateOnly,
      courierId: courier.id,
      venueId: venue.id,
      deliveryType: DeliveryType.OUTDOOR,
      packageCount: 10,
      unitPriceSnapshot: new Prisma.Decimal('32.00'),
      totalAmount: new Prisma.Decimal('320.00')
    }
  })

  console.log('✅ Örnek teslimat kayıtları eklendi.')
  console.log('🎉 Seed tamamlandı!')
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
