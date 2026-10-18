/**
 * Date, Time & Period Helper Functions
 * Grounded in Turkey Timezone ('Europe/Istanbul') and ISO-8601 Week Standards.
 */

export function parseMoneyAmount(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Number(val.toFixed(2))
  }
  if (!val) return 0

  let str = String(val).trim()
  // Handle formats like 1.250,50 or 1,250.50 or 500,50
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // 1.250,50
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,250.50
      str = str.replace(/,/g, '')
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.')
  }

  const num = parseFloat(str)
  return isNaN(num) ? 0 : Number(num.toFixed(2))
}

export function getIstanbulDateString(d: Date = new Date()): string {
  // Format YYYY-MM-DD in Europe/Istanbul
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)

  const year = parts.find(p => p.type === 'year')?.value || '1970'
  const month = parts.find(p => p.type === 'month')?.value || '01'
  const day = parts.find(p => p.type === 'day')?.value || '01'

  return `${year}-${month}-${day}`
}

export function getIstanbulTimeString(d: Date = new Date()): string {
  // Format HH:mm in Europe/Istanbul
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

/**
 * Returns ISO week string e.g. "2026-W39"
 */
export function getISOWeekString(dateInput: Date | string): string {
  let d: Date
  if (typeof dateInput === 'string') {
    const [y, m, day] = dateInput.split('-').map(Number)
    d = new Date(Date.UTC(y, m - 1, day))
  } else {
    d = new Date(dateInput.getTime())
  }

  // ISO week date days: Monday 1, Sunday 7
  const dayOfWeek = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  const paddedWeek = String(weekNo).padStart(2, '0')

  return `${d.getUTCFullYear()}-W${paddedWeek}`
}

/**
 * Given a date or week string, returns the Monday and Sunday date range.
 */
export function getWeekDateRange(dateOrWeek: string | Date): {
  startDate: Date
  endDate: Date
  startStr: string
  endStr: string
  weekStr: string
} {
  let targetDate: Date
  if (typeof dateOrWeek === 'string' && dateOrWeek.includes('-W')) {
    const [yearStr, weekStr] = dateOrWeek.split('-W')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)

    // Jan 4th is always in week 1
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const jan4Day = jan4.getUTCDay() || 7
    const mondayWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
    targetDate = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000)
  } else if (typeof dateOrWeek === 'string') {
    const [y, m, day] = dateOrWeek.split('-').map(Number)
    targetDate = new Date(Date.UTC(y, m - 1, day))
  } else {
    targetDate = new Date(dateOrWeek.getTime())
  }

  const dayOfWeek = targetDate.getUTCDay() || 7 // Monday = 1, Sunday = 7
  const monday = new Date(targetDate.getTime() - (dayOfWeek - 1) * 86400000)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday.getTime() + 6 * 86400000)
  sunday.setUTCHours(23, 59, 59, 999)

  const startStr = monday.toISOString().substring(0, 10)
  const endStr = sunday.toISOString().substring(0, 10)
  const weekStr = getISOWeekString(monday)

  return {
    startDate: monday,
    endDate: sunday,
    startStr,
    endStr,
    weekStr
  }
}

/**
 * Calculates the start boundary of the current weekly cycle (Monday to Monday).
 * Returns both the UTC Date boundary and the Istanbul YYYY-MM-DD Monday date string.
 */
export function getCurrentCycleStart(now: Date = new Date()): {
  cycleStartUtc: Date
  mondayDateStr: string
} {
  // Convert current time to Istanbul time parts
  const istanbulDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now)

  const yr = Number(istanbulDateParts.find(p => p.type === 'year')?.value || 1970)
  const mo = Number(istanbulDateParts.find(p => p.type === 'month')?.value || 1)
  const dy = Number(istanbulDateParts.find(p => p.type === 'day')?.value || 1)
  const hr = Number(istanbulDateParts.find(p => p.type === 'hour')?.value || 0)
  const mi = Number(istanbulDateParts.find(p => p.type === 'minute')?.value || 0)

  // Construct local Istanbul date
  const istanbulDate = new Date(Date.UTC(yr, mo - 1, dy, hr, mi))
  const dayOfWeek = istanbulDate.getUTCDay() // 0 = Sunday, 1 = Monday ... 6 = Saturday

  // Calculate days back to Monday
  let daysBackToMonday: number
  if (dayOfWeek === 1) { // Monday
    daysBackToMonday = hr < 3 ? 7 : 0
  } else if (dayOfWeek === 0) { // Sunday
    daysBackToMonday = 6
  } else {
    daysBackToMonday = dayOfWeek - 1
  }

  // Target Monday
  const targetMonday = new Date(Date.UTC(yr, mo - 1, dy - daysBackToMonday))
  const mYr = targetMonday.getUTCFullYear()
  const mMo = String(targetMonday.getUTCMonth() + 1).padStart(2, '0')
  const mDy = String(targetMonday.getUTCDate()).padStart(2, '0')
  const mondayDateStr = `${mYr}-${mMo}-${mDy}`

  // 03:00 Istanbul = 00:00 UTC
  const cycleStartUtc = new Date(Date.UTC(mYr, targetMonday.getUTCMonth(), targetMonday.getUTCDate(), 0, 0, 0, 0))

  return {
    cycleStartUtc,
    mondayDateStr
  }
}
