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
