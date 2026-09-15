import { ref, computed } from 'vue'
import type { WhatsAppMessagePayload, ShareResult } from '~/services/whatsapp/types'
import { whatsAppShareService } from '~/services/whatsapp/whatsappShareService'
import { useToast } from '~/composables/useToast'

export function useWhatsAppShare() {
  const toast = useToast()
  const isShareModalOpen = ref(false)
  const isSharing = ref(false)

  const activePayload = ref<WhatsAppMessagePayload>({
    recipientName: '',
    recipientPhone: '',
    startDate: '',
    endDate: '',
    totalPackages: 0,
    totalAmount: 0,
    currency: 'TL',
    note: ''
  })

  const formattedMessage = computed(() => {
    return whatsAppShareService.formatMessage(activePayload.value)
  })

  const shareUrl = computed(() => {
    return whatsAppShareService.generateShareUrl(activePayload.value)
  })

  const normalizedPhone = computed(() => {
    return whatsAppShareService.normalizePhoneNumber(activePayload.value.recipientPhone)
  })

  const openShareModal = (payload: WhatsAppMessagePayload) => {
    activePayload.value = {
      recipientName: payload.recipientName || '',
      recipientPhone: payload.recipientPhone || '',
      startDate: payload.startDate || '',
      endDate: payload.endDate || '',
      totalPackages: payload.totalPackages || 0,
      totalAmount: payload.totalAmount || 0,
      currency: payload.currency || 'TL',
      note: payload.note || ''
    }
    isShareModalOpen.value = true
  }

  const closeShareModal = () => {
    isShareModalOpen.value = false
  }

  const copyMessage = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error('Kopyalama özelliği tarayıcınızda desteklenmiyor.')
      return false
    }

    try {
      await navigator.clipboard.writeText(formattedMessage.value)
      toast.success('WhatsApp mesaj metni panoya kopyalandı!')
      return true
    } catch {
      toast.error('Mesaj panoya kopyalanamadı.')
      return false
    }
  }

  const executeShare = async (file?: File | Blob): Promise<ShareResult> => {
    isSharing.value = true
    try {
      const result = await whatsAppShareService.share(activePayload.value, file)
      if (result.success) {
        if (result.method === 'web_share') {
          toast.success('Paylaşım menüsü açıldı.')
        } else {
          toast.success('WhatsApp yönlendirmesi başlatıldı.')
        }
      } else if (result.error && result.error !== 'Paylaşım iptal edildi') {
        toast.error(result.error)
      }
      return result
    } catch (err: any) {
      toast.error('Paylaşım sırasında bir hata oluştu.')
      return { success: false, method: 'url_redirect', error: err.message }
    } finally {
      isSharing.value = false
    }
  }

  return {
    isShareModalOpen,
    isSharing,
    activePayload,
    formattedMessage,
    shareUrl,
    normalizedPhone,
    openShareModal,
    closeShareModal,
    copyMessage,
    executeShare
  }
}
