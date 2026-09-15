export interface WhatsAppRecordItem {
  date: string
  venueName?: string
  deliveryTypeLabel: string
  packageCount: number
  unitPrice: number
  totalAmount: number
}

export interface WhatsAppMessagePayload {
  recipientName: string
  recipientPhone?: string | null
  startDate: string
  endDate: string
  totalPackages: number
  totalAmount: number
  currency?: string
  records?: WhatsAppRecordItem[]
  note?: string
}

export interface ShareResult {
  success: boolean
  method: 'web_share' | 'url_redirect' | 'clipboard'
  error?: string
}

/**
 * WhatsApp Share Service Interface
 * Allows future plug-and-play integration for WhatsApp Business API,
 * Cloud API, or 3rd party messaging providers while keeping the same interface.
 */
export interface IWhatsAppShareService {
  formatMessage(payload: WhatsAppMessagePayload): string
  normalizePhoneNumber(phone?: string | null): string
  generateShareUrl(payload: WhatsAppMessagePayload): string
  canNativeShare(file?: File | Blob): boolean
  share(payload: WhatsAppMessagePayload, file?: File | Blob): Promise<ShareResult>
}
