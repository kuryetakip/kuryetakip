/**
 * Venue Financial Calculation Utilities
 * Unified calculation logic used by both Venues page and WhatsApp Reports.
 * All internal money math uses cents (kuruş) integers to eliminate floating point issues.
 */

export function toCents(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0
  const clean = typeof amount === 'number'
    ? amount
    : parseFloat(String(amount).trim().replace(',', '.'))
  if (isNaN(clean)) return 0
  return Math.round(clean * 100)
}

export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

export function formatCurrencyTr(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : (parseFloat(String(amount || 0)) || 0)
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ₺'
}

export interface VenueFinancialSummary {
  // Paket adetleri ve ciroları
  indoorCount: number
  outdoorCount: number
  totalCount: number
  indoorAmount: number
  outdoorAmount: number
  deliveriesAmount: number

  // Geçmiş devir bakiyesi (varsa)
  priorCarriedBalance: number

  // Toplam Hizmet / Brüt Borç = deliveriesAmount + priorCarriedBalance
  grossDueAmount: number

  // Yapılan Tahsilat Tutarı (Seçilen kapsam veya tüm zamanlar)
  totalCollectedAmount: number

  // Kalan Bakiye (Net Ödenecek / Tahsil Edilecek Tutar) = grossDueAmount - totalCollectedAmount
  remainingBalance: number
}

export function calculateVenueFinances(params: {
  deliveries: Array<{
    packageCount: number
    deliveryType: 'INDOOR' | 'OUTDOOR'
    amount: number
    date?: string
  }>
  payments: Array<{
    amount: number
    date?: string
    paymentMethod?: string
  }>
  priorCarriedBalance?: number
}): VenueFinancialSummary {
  let indoorCount = 0
  let outdoorCount = 0
  let indoorCents = 0
  let outdoorCents = 0

  for (const d of params.deliveries) {
    const count = d.packageCount || 0
    const cents = toCents(d.amount)
    if (d.deliveryType === 'INDOOR') {
      indoorCount += count
      indoorCents += cents
    } else {
      outdoorCount += count
      outdoorCents += cents
    }
  }

  const deliveriesCents = indoorCents + outdoorCents
  const priorCarriedCents = toCents(params.priorCarriedBalance || 0)
  const grossDueCents = deliveriesCents + priorCarriedCents

  let collectedCents = 0
  for (const p of params.payments) {
    collectedCents += toCents(p.amount)
  }

  const remainingCents = Math.max(0, grossDueCents - collectedCents)

  return {
    indoorCount,
    outdoorCount,
    totalCount: indoorCount + outdoorCount,
    indoorAmount: fromCents(indoorCents),
    outdoorAmount: fromCents(outdoorCents),
    deliveriesAmount: fromCents(deliveriesCents),
    priorCarriedBalance: fromCents(priorCarriedCents),
    grossDueAmount: fromCents(grossDueCents),
    totalCollectedAmount: fromCents(collectedCents),
    remainingBalance: fromCents(remainingCents)
  }
}
