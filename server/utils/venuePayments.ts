import { prisma } from './prisma'

export interface VenuePaymentRecord {
  id: string
  venueId: string
  amount: number
  paymentMethod: string
  cashAmount: number
  transferAmount: number
  date: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export async function createVenuePaymentRecord(
  tx: any,
  data: {
    venueId: string
    amount: number
    paymentMethod: string
    cashAmount?: number
    transferAmount?: number
    date?: string | Date
    notes?: string
  }
): Promise<VenuePaymentRecord> {
  const d = data.date
    ? (typeof data.date === 'string' ? data.date : data.date.toISOString().substring(0, 10))
    : new Date().toISOString().substring(0, 10)

  const cash = Number((data.cashAmount || 0).toFixed(2))
  const transfer = Number((data.transferAmount || 0).toFixed(2))
  const amt = Number(data.amount.toFixed(2))
  const notes = data.notes?.trim() || null
  const now = new Date()

  const rows: any = await tx.$queryRawUnsafe(
    `INSERT INTO venue_payments (id, venue_id, amount, payment_method, cash_amount, transfer_amount, date, notes, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::date, $7, $8, $9)
     RETURNING id, venue_id as "venueId", amount::text as amount, payment_method as "paymentMethod",
               cash_amount::text as "cashAmount", transfer_amount::text as "transferAmount",
               date::text as date, notes, created_at as "createdAt", updated_at as "updatedAt"`,
    data.venueId,
    amt,
    data.paymentMethod || 'CASH',
    cash,
    transfer,
    d,
    notes,
    now,
    now
  )

  const row = rows[0]
  return {
    id: row.id,
    venueId: row.venueId,
    amount: Number(row.amount),
    paymentMethod: row.paymentMethod,
    cashAmount: Number(row.cashAmount || 0),
    transferAmount: Number(row.transferAmount || 0),
    date: row.date,
    notes: row.notes,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString()
  }
}

export async function getVenuePaymentsByVenueId(
  venueId: string,
  startDate?: string,
  endDate?: string
): Promise<VenuePaymentRecord[]> {
  let query = `
    SELECT id, venue_id as "venueId", amount::text as amount, payment_method as "paymentMethod",
           cash_amount::text as "cashAmount", transfer_amount::text as "transferAmount",
           date::text as date, notes, created_at as "createdAt", updated_at as "updatedAt"
    FROM venue_payments
    WHERE venue_id = $1
  `
  const params: any[] = [venueId]

  if (startDate && endDate) {
    query += ` AND date >= $2::date AND date <= $3::date`
    params.push(startDate, endDate)
  } else if (startDate) {
    query += ` AND date = $2::date`
    params.push(startDate)
  }

  query += ` ORDER BY date DESC, created_at DESC`

  const rows: any = await prisma.$queryRawUnsafe(query, ...params)
  return rows.map((r: any) => ({
    id: r.id,
    venueId: r.venueId,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    cashAmount: Number(r.cashAmount || 0),
    transferAmount: Number(r.transferAmount || 0),
    date: r.date,
    notes: r.notes,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString()
  }))
}

export async function getAllVenuePaymentsGrouped(): Promise<Map<string, VenuePaymentRecord[]>> {
  const query = `
    SELECT id, venue_id as "venueId", amount::text as amount, payment_method as "paymentMethod",
           cash_amount::text as "cashAmount", transfer_amount::text as "transferAmount",
           date::text as date, notes, created_at as "createdAt", updated_at as "updatedAt"
    FROM venue_payments
    ORDER BY date DESC, created_at DESC
  `
  const rows: any = await prisma.$queryRawUnsafe(query)
  const map = new Map<string, VenuePaymentRecord[]>()
  for (const r of rows) {
    const list = map.get(r.venueId) || []
    list.push({
      id: r.id,
      venueId: r.venueId,
      amount: Number(r.amount),
      paymentMethod: r.paymentMethod,
      cashAmount: Number(r.cashAmount || 0),
      transferAmount: Number(r.transferAmount || 0),
      date: r.date,
      notes: r.notes,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString()
    })
    map.set(r.venueId, list)
  }
  return map
}
