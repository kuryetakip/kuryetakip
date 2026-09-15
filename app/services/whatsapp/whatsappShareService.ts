import type { IWhatsAppShareService, WhatsAppMessagePayload, ShareResult } from './types'

export class WhatsAppDirectLinkShareService implements IWhatsAppShareService {
  /**
   * Normalizes Turkish & International phone numbers into WhatsApp clean format (e.g. 905XXXXXXXXX)
   */
  normalizePhoneNumber(phone?: string | null): string {
    if (!phone) return ''

    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')

    if (!cleaned) return ''

    // If starts with 0 and has 11 digits (e.g., 05321234567) -> replace leading 0 with 90
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '90' + cleaned.substring(1)
    }
    // If has 10 digits starting with 5 (e.g., 5321234567) -> prepend 90
    else if (cleaned.length === 10 && cleaned.startsWith('5')) {
      cleaned = '90' + cleaned
    }
    // If it is 12 digits starting with 90 (e.g., 905321234567) -> already correct

    return cleaned
  }

  /**
   * Checks if normalized phone number is a valid 12-digit number (e.g. 905XXXXXXXXX)
   */
  isValidPhoneNumber(phone?: string | null): boolean {
    const normalized = this.normalizePhoneNumber(phone)
    return normalized.length === 12 && normalized.startsWith('905')
  }

  /**
   * Formats the official courier settlement message according to project specifications
   */
  formatMessage(payload: WhatsAppMessagePayload): string {
    const currency = payload.currency || 'TL'
    const formattedGrandTotal = Number(payload.totalAmount || 0).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    const lines: string[] = [
      'HAKEDİŞ BİLGİSİ',
      '',
      `Kurye: ${payload.recipientName || 'Kurye'}`,
      '',
      'Tarih Aralığı:',
      `${payload.startDate} - ${payload.endDate}`,
      '',
      'Toplam Paket:',
      `${payload.totalPackages}`,
      '',
      'Toplam Hakediş:',
      `${formattedGrandTotal} ${currency}`
    ]

    // If detailed records are available, format line items
    if (payload.records && payload.records.length > 0) {
      lines.push('', 'Hakediş Detayı:', '')

      payload.records.forEach((rec) => {
        const unitPriceFmt = Number(rec.unitPrice || 0).toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        const amountFmt = Number(rec.totalAmount || 0).toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })

        lines.push(rec.date)
        if (rec.venueName) {
          lines.push(rec.venueName)
        }
        lines.push(rec.deliveryTypeLabel || 'Teslimat')
        lines.push(`${rec.packageCount} Paket × ${unitPriceFmt} ${currency} = ${amountFmt} ${currency}`)
        lines.push('')
      })

      lines.push('----------------------------', '')
      lines.push('TOPLAM:', `${formattedGrandTotal} ${currency}`)
    }

    lines.push('', 'Bu belge bilgilendirme amaçlı hakediş/fatura özetidir.')

    if (payload.note) {
      lines.push('', `Not: ${payload.note}`)
    }

    return lines.join('\n')
  }

  /**
   * Generates wa.me URL with clean phone and pre-filled URI-encoded message
   */
  generateShareUrl(payload: WhatsAppMessagePayload): string {
    const text = encodeURIComponent(this.formatMessage(payload))
    const phone = this.normalizePhoneNumber(payload.recipientPhone)

    if (phone) {
      return `https://wa.me/${phone}?text=${text}`
    }

    return `https://wa.me/?text=${text}`
  }

  /**
   * Checks if native Web Share API is available and can share files if provided
   */
  canNativeShare(file?: File | Blob): boolean {
    if (typeof navigator === 'undefined' || !navigator.share) {
      return false
    }

    if (file && navigator.canShare) {
      try {
        return navigator.canShare({
          files: [file instanceof File ? file : new File([file], 'hakedis-raporu.pdf', { type: 'application/pdf' })]
        })
      } catch {
        return false
      }
    }

    return true
  }

  /**
   * Performs the share action via Web Share API or direct WhatsApp URL redirection
   */
  async share(payload: WhatsAppMessagePayload, file?: File | Blob): Promise<ShareResult> {
    const shareUrl = this.generateShareUrl(payload)

    // Open WhatsApp in a new tab / window
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
      return { success: true, method: 'url_redirect' }
    }

    return { success: false, method: 'url_redirect', error: 'Tarayıcı penceresi bulunamadı.' }
  }
}

export const whatsAppShareService = new WhatsAppDirectLinkShareService()

