import { prisma, DeliveryType } from './prisma'
import { createError } from 'h3'


export interface ResolvedRate {
  indoorPrice: number
  outdoorPrice: number
  selectedUnitPrice: number
  isCustomRate: boolean
  courierName: string
  venueName: string
}

/**
 * Resolves the unit price for a given courier, venue, and delivery type.
 * Priority:
 * 1. CourierVenuePrice (if exists for courier + venue)
 * 2. Venue default price (fallback)
 */
export async function resolveCourierRate(
  courierId: string,
  venueId: string,
  deliveryType: DeliveryType
): Promise<ResolvedRate> {
  // 1. Fetch courier
  const courier = await prisma.courier.findUnique({
    where: { id: courierId }
  })

  if (!courier) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Kurye bulunamadı.'
    })
  }

  // 2. Fetch venue
  const venue = await prisma.venue.findUnique({
    where: { id: venueId }
  })

  if (!venue) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Mekan bulunamadı.'
    })
  }

  // 3. Check custom CourierVenuePrice override
  const customPrice = await prisma.courierVenuePrice.findUnique({
    where: {
      courierId_venueId: {
        courierId,
        venueId
      }
    }
  })

  let indoorPrice: number
  let outdoorPrice: number
  let isCustomRate = false

  if (customPrice) {
    indoorPrice = Number(customPrice.indoorPrice)
    outdoorPrice = Number(customPrice.outdoorPrice)
    isCustomRate = true
  } else {
    indoorPrice = Number(venue.indoorPrice)
    outdoorPrice = Number(venue.outdoorPrice)
    isCustomRate = false
  }

  const selectedUnitPrice = deliveryType === DeliveryType.INDOOR ? indoorPrice : outdoorPrice

  return {
    indoorPrice,
    outdoorPrice,
    selectedUnitPrice,
    isCustomRate,
    courierName: courier.name,
    venueName: venue.name
  }
}
