import { prisma, DeliveryType, Prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Geçersiz mekan ID.'
      })
    }

    const body = await readBody(event)

    const existing = await prisma.venue.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Güncellenmek istenen mekan bulunamadı.'
      })
    }

    const dataToUpdate: any = {}

    if (body?.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Mekan adı boş olamaz.'
        })
      }
      dataToUpdate.name = name
    }

    let finalIndoorPrice = Number(existing.indoorPrice)
    let finalOutdoorPrice = Number(existing.outdoorPrice)

    if (body?.indoorPrice !== undefined) {
      const indoorPriceNum = Number(String(body.indoorPrice).replace(',', '.'))
      if (isNaN(indoorPriceNum) || indoorPriceNum < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geçerli bir iç teslimat fiyatı (>= 0) giriniz.'
        })
      }
      finalIndoorPrice = indoorPriceNum
      dataToUpdate.indoorPrice = new Prisma.Decimal(indoorPriceNum.toFixed(2))
    }

    if (body?.outdoorPrice !== undefined) {
      const outdoorPriceNum = Number(String(body.outdoorPrice).replace(',', '.'))
      if (isNaN(outdoorPriceNum) || outdoorPriceNum < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Geçerli bir dış teslimat fiyatı (>= 0) giriniz.'
        })
      }
      finalOutdoorPrice = outdoorPriceNum
      dataToUpdate.outdoorPrice = new Prisma.Decimal(outdoorPriceNum.toFixed(2))
    }

    if (body?.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(body.isActive)
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: dataToUpdate
    })

    // If daily delivery records are provided with the update
    const courierId = typeof body?.courierId === 'string' && body.courierId.trim() ? body.courierId.trim() : null
    const hasIndoor = body?.indoorCount !== undefined && body?.indoorCount !== null && body?.indoorCount !== ''
    const hasOutdoor = body?.outdoorCount !== undefined && body?.outdoorCount !== null && body?.outdoorCount !== ''
    const dateStr = typeof body?.date === 'string' ? body.date.trim() : ''

    if (hasIndoor || hasOutdoor) {
      let utcDate: Date
      if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number)
        utcDate = new Date(Date.UTC(y, m - 1, d))
      } else {
        const d = new Date()
        utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      }

      let courierIndoorPrice = body?.courierIndoorPrice !== undefined && !isNaN(Number(body.courierIndoorPrice))
        ? Number(body.courierIndoorPrice)
        : 0
      let courierOutdoorPrice = body?.courierOutdoorPrice !== undefined && !isNaN(Number(body.courierOutdoorPrice))
        ? Number(body.courierOutdoorPrice)
        : 0

      if (courierId && (courierIndoorPrice === 0 && courierOutdoorPrice === 0)) {
        try {
          const cRate = await resolveCourierRate(courierId, updated.id, DeliveryType.INDOOR)
          courierIndoorPrice = cRate.courierIndoorPrice
          courierOutdoorPrice = cRate.courierOutdoorPrice
        } catch {
          // ignore if cannot resolve
        }
      }

      // Fetch existing UNSETTLED delivery records for this venue and target date
      const existingRecords = await prisma.deliveryRecord.findMany({
        where: {
          venueId: updated.id,
          date: utcDate,
          isSettled: false
        },
        orderBy: { createdAt: 'asc' }
      })

      const existingIndoorRecords = existingRecords.filter(r => r.deliveryType === DeliveryType.INDOOR)
      const existingOutdoorRecords = existingRecords.filter(r => r.deliveryType === DeliveryType.OUTDOOR)

      // Handle INDOOR packages
      if (hasIndoor) {
        const targetIndoor = Math.max(0, Math.floor(Number(body.indoorCount) || 0))
        if (targetIndoor > 0) {
          const venueTotal = Number((targetIndoor * finalIndoorPrice).toFixed(2))
          const courierTotal = Number((targetIndoor * courierIndoorPrice).toFixed(2))

          if (existingIndoorRecords.length > 0) {
            const [primary, ...duplicates] = existingIndoorRecords
            await prisma.deliveryRecord.update({
              where: { id: primary.id },
              data: {
                packageCount: targetIndoor,
                venuePriceSnapshot: new Prisma.Decimal(finalIndoorPrice.toFixed(2)),
                venueTotalAmount: new Prisma.Decimal(venueTotal.toFixed(2)),
                courierPriceSnapshot: new Prisma.Decimal(courierIndoorPrice.toFixed(2)),
                courierTotalAmount: new Prisma.Decimal(courierTotal.toFixed(2)),
                unitPriceSnapshot: new Prisma.Decimal(finalIndoorPrice.toFixed(2)),
                totalAmount: new Prisma.Decimal(venueTotal.toFixed(2)),
                ...(courierId ? { courierId } : {})
              }
            })
            if (duplicates.length > 0) {
              await prisma.deliveryRecord.deleteMany({
                where: { id: { in: duplicates.map(d => d.id) } }
              })
            }
          } else {
            await prisma.deliveryRecord.create({
              data: {
                date: utcDate,
                courierId,
                venueId: updated.id,
                deliveryType: DeliveryType.INDOOR,
                packageCount: targetIndoor,
                venuePriceSnapshot: new Prisma.Decimal(finalIndoorPrice.toFixed(2)),
                venueTotalAmount: new Prisma.Decimal(venueTotal.toFixed(2)),
                courierPriceSnapshot: new Prisma.Decimal(courierIndoorPrice.toFixed(2)),
                courierTotalAmount: new Prisma.Decimal(courierTotal.toFixed(2)),
                unitPriceSnapshot: new Prisma.Decimal(finalIndoorPrice.toFixed(2)),
                totalAmount: new Prisma.Decimal(venueTotal.toFixed(2))
              }
            })
          }
        } else {
          // targetIndoor is 0 -> delete any unsettled indoor records for this day
          if (existingIndoorRecords.length > 0) {
            await prisma.deliveryRecord.deleteMany({
              where: { id: { in: existingIndoorRecords.map(d => d.id) } }
            })
          }
        }
      }

      // Handle OUTDOOR packages
      if (hasOutdoor) {
        const targetOutdoor = Math.max(0, Math.floor(Number(body.outdoorCount) || 0))
        if (targetOutdoor > 0) {
          const venueTotal = Number((targetOutdoor * finalOutdoorPrice).toFixed(2))
          const courierTotal = Number((targetOutdoor * courierOutdoorPrice).toFixed(2))

          if (existingOutdoorRecords.length > 0) {
            const [primary, ...duplicates] = existingOutdoorRecords
            await prisma.deliveryRecord.update({
              where: { id: primary.id },
              data: {
                packageCount: targetOutdoor,
                venuePriceSnapshot: new Prisma.Decimal(finalOutdoorPrice.toFixed(2)),
                venueTotalAmount: new Prisma.Decimal(venueTotal.toFixed(2)),
                courierPriceSnapshot: new Prisma.Decimal(courierOutdoorPrice.toFixed(2)),
                courierTotalAmount: new Prisma.Decimal(courierTotal.toFixed(2)),
                unitPriceSnapshot: new Prisma.Decimal(finalOutdoorPrice.toFixed(2)),
                totalAmount: new Prisma.Decimal(venueTotal.toFixed(2)),
                ...(courierId ? { courierId } : {})
              }
            })
            if (duplicates.length > 0) {
              await prisma.deliveryRecord.deleteMany({
                where: { id: { in: duplicates.map(d => d.id) } }
              })
            }
          } else {
            await prisma.deliveryRecord.create({
              data: {
                date: utcDate,
                courierId,
                venueId: updated.id,
                deliveryType: DeliveryType.OUTDOOR,
                packageCount: targetOutdoor,
                venuePriceSnapshot: new Prisma.Decimal(finalOutdoorPrice.toFixed(2)),
                venueTotalAmount: new Prisma.Decimal(venueTotal.toFixed(2)),
                courierPriceSnapshot: new Prisma.Decimal(courierOutdoorPrice.toFixed(2)),
                courierTotalAmount: new Prisma.Decimal(courierTotal.toFixed(2)),
                unitPriceSnapshot: new Prisma.Decimal(finalOutdoorPrice.toFixed(2)),
                totalAmount: new Prisma.Decimal(venueTotal.toFixed(2))
              }
            })
          }
        } else {
          // targetOutdoor is 0 -> delete any unsettled outdoor records for this day
          if (existingOutdoorRecords.length > 0) {
            await prisma.deliveryRecord.deleteMany({
              where: { id: { in: existingOutdoorRecords.map(d => d.id) } }
            })
          }
        }
      }
    }

    return {
      success: true,
      data: {
        ...updated,
        indoorPrice: Number(updated.indoorPrice),
        outdoorPrice: Number(updated.outdoorPrice)
      },
      message: 'Mekan ve günlük paket kayıtları başarıyla güncellendi.'
    }
  } catch (error: any) {
    console.error('Venues PUT error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Mekan güncellenirken bir hata oluştu.'
    })
  }
})

