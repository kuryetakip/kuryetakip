/**
 * Operasyonel İş Günü / Sistem Tarihi Yardımcıları
 *
 * Temel Sistem Kuralı:
 * Sistem tarihleri gece 12:00'de (00:00) değil, gece 03:00'ten (03:00:00) itibaren gün atlar.
 * Gece 00:00:00 - 02:59:59 arası yapılan veya görüntülenen tüm operasyonlar bir önceki takvim gününe (vardiyaya) aittir.
 * Haftalık periyotlar (Pazartesi'den Pazartesi'ye) da aynı şekilde Pazartesi 03:00'te devir eder / sıfırlanır.
 */

/**
 * Operasyonel zamanı döner (Europe/Istanbul saati bazında 3 saat geri kaydırılmış Date nesnesi).
 * 00:00 - 02:59 arasındaki anları önceki günün 21:00 - 23:59 saatlerine taşır.
 */
export function getBusinessNow(now: Date = new Date()): Date {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000)
}

/**
 * Operasyonel günün YYYY-MM-DD formatında string'i (örn: "2026-10-18")
 */
export function getBusinessDateStr(now: Date = new Date()): string {
  const shifted = getBusinessNow(now)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(shifted)

  const year = parts.find(p => p.type === 'year')?.value || '1970'
  const month = parts.find(p => p.type === 'month')?.value || '01'
  const day = parts.find(p => p.type === 'day')?.value || '01'

  return `${year}-${month}-${day}`
}

/**
 * Operasyonel bir önceki gün (Dün) YYYY-MM-DD
 */
export function getBusinessYesterdayStr(now: Date = new Date()): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return getBusinessDateStr(yesterday)
}

/**
 * Operasyonel günün haftalık döngüsündeki Pazartesi gününün YYYY-MM-DD string'i
 * (Pazartesi gece 00:00-02:59 arası halen önceki haftaya aittir, 03:00'te yeni Pazartesi başlar).
 */
export function getBusinessThisWeekMonday(now: Date = new Date()): string {
  const todayStr = getBusinessDateStr(now)
  const [y, m, d] = todayStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const day = dt.getUTCDay() // 0 = Pazar, 1 = Pazartesi ...
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(dt.getTime() + diff * 86400000)
  const my = monday.getUTCFullYear()
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0')
  const md = String(monday.getUTCDate()).padStart(2, '0')
  return `${my}-${mm}-${md}`
}

/**
 * Operasyonel geçen haftanın Pazartesi gününün YYYY-MM-DD string'i
 */
export function getBusinessLastWeekMonday(now: Date = new Date()): string {
  const thisMondayStr = getBusinessThisWeekMonday(now)
  const [y, m, d] = thisMondayStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d - 7))
  const my = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const md = String(dt.getUTCDate()).padStart(2, '0')
  return `${my}-${mm}-${md}`
}

/**
 * Tarih nesnesini veya YYYY-MM-DD string'ini DD.MM.YYYY formatına çevirir
 */
export function formatToDisplayDate(dateInput?: string | Date): string {
  if (!dateInput) return ''
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-')
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`
    }
    return dateInput
  }
  const day = String(dateInput.getDate()).padStart(2, '0')
  const month = String(dateInput.getMonth() + 1).padStart(2, '0')
  const year = dateInput.getFullYear()
  return `${day}.${month}.${year}`
}
