import { prisma, DeliveryType } from './prisma'
import { createError } from 'h3'


export interface ResolvedRate {
  venueIndoorPrice: number
  venueOutdoorPrice: number
  courierIndoorPrice: number
  courierOutdoorPrice: number
  venueSelectedPrice: number
  courierSelectedPrice: number
  // Backwards-compatible aliases
  indoorPrice: number
  outdoorPrice: number
  selectedUnitPrice: number
  isCustomRate: boolean
  courierName: string
  venueName: string
}

/**
 * Resolves separate rates for both Venue (billed to restaurant) and Courier (paid to courier).
 * Priority for Courier:
 * 1. CourierVenuePrice override (if custom price defined for courier + venue)
 * 2. Courier's default rates (courier.indoorPrice / courier.outdoorPrice if > 0)
 * 3. Fallback to Venue default price
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

  const venueIndoorPrice = Number(venue.indoorPrice)
  const venueOutdoorPrice = Number(venue.outdoorPrice)

  // 3. Check custom CourierVenuePrice override
  const customPrice = await prisma.courierVenuePrice.findUnique({
    where: {
      courierId_venueId: {
        courierId,
        venueId
      }
    }
  })

  let courierIndoorPrice: number
  let courierOutdoorPrice: number
  let isCustomRate = false

  if (customPrice) {
    courierIndoorPrice = Number(customPrice.indoorPrice)
    courierOutdoorPrice = Number(customPrice.outdoorPrice)
    isCustomRate = true
  } else if (Number(courier.indoorPrice) > 0 || Number(courier.outdoorPrice) > 0) {
    courierIndoorPrice = Number(courier.indoorPrice)
    courierOutdoorPrice = Number(courier.outdoorPrice)
    isCustomRate = true
  } else {
    // Fallback to venue price if courier has no specific price set
    courierIndoorPrice = venueIndoorPrice
    courierOutdoorPrice = venueOutdoorPrice
    isCustomRate = false
  }

  const venueSelectedPrice = deliveryType === DeliveryType.INDOOR ? venueIndoorPrice : venueOutdoorPrice
  const courierSelectedPrice = deliveryType === DeliveryType.INDOOR ? courierIndoorPrice : courierOutdoorPrice

  return {
    venueIndoorPrice,
    venueOutdoorPrice,
    courierIndoorPrice,
    courierOutdoorPrice,
    venueSelectedPrice,
    courierSelectedPrice,
    // Aliases for compatibility
    indoorPrice: courierIndoorPrice,
    outdoorPrice: courierOutdoorPrice,
    selectedUnitPrice: courierSelectedPrice,
    isCustomRate,
    courierName: courier.name,
    venueName: venue.name
  }
}
