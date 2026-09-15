import { PrismaClient, Prisma } from '@prisma/client'

export const DeliveryType = {
  INDOOR: 'INDOOR',
  OUTDOOR: 'OUTDOOR'
} as const

export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType]

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function getDatasourceUrl(): string | undefined {
  let url = process.env.DATABASE_URL
  if (!url) return undefined
  if (url.includes('pooler.supabase.com') && !url.includes('pgbouncer=true')) {
    url += url.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true'
  }
  return url
}

const dbUrl = getDatasourceUrl()

export const prisma = globalThis.__prisma || new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export { Prisma, PrismaClient }
export default prisma
