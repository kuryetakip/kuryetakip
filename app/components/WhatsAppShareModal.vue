<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Phone,
  User,
  Calendar,
  AlertCircle,
  FileText,
  X,
  Share2
} from 'lucide-vue-next'
import type { WhatsAppMessagePayload } from '~/services/whatsapp/types'
import { whatsAppShareService } from '~/services/whatsapp/whatsappShareService'
import { useToast } from '~/composables/useToast'

interface Props {
  modelValue: boolean
  payload: WhatsAppMessagePayload
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:payload', value: WhatsAppMessagePayload): void
}>()

const toast = useToast()
const isCopied = ref(false)
const localPhone = ref('')

watch(
  () => props.payload.recipientPhone,
  (val) => {
    localPhone.value = val || ''
  },
  { immediate: true }
)

const onPhoneChange = () => {
  emit('update:payload', {
    ...props.payload,
    recipientPhone: localPhone.value
  })
}

const formattedMessage = computed(() => {
  return whatsAppShareService.formatMessage({
    ...props.payload,
    recipientPhone: localPhone.value
  })
})

const normalizedPhone = computed(() => {
  return whatsAppShareService.normalizePhoneNumber(localPhone.value)
})

const shareUrl = computed(() => {
  return whatsAppShareService.generateShareUrl({
    ...props.payload,
    recipientPhone: localPhone.value
  })
})

const close = () => {
  emit('update:modelValue', false)
}

const handleCopy = async () => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(formattedMessage.value)
      isCopied.value = true
      toast.success('Mesaj metni panoya kopyalandı!')
      setTimeout(() => {
        isCopied.value = false
      }, 2500)
    } catch {
      toast.error('Kopyalama başarısız.')
    }
  }
}

const handleOpenWhatsApp = () => {
  if (typeof window !== 'undefined') {
    window.open(shareUrl.value, '_blank', 'noopener,noreferrer')
    toast.success('WhatsApp açılıyor...')
    close()
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="WhatsApp ile Hakediş Paylaş"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <!-- Target Courier Info -->
      <div class="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            <User class="w-4 h-4" />
          </div>
          <div>
            <div class="text-xs text-emerald-800 font-medium">Alıcı Kurye</div>
            <div class="text-sm font-bold text-slate-900">
              {{ payload.recipientName || 'Kurye Belirtilmedi' }}
            </div>
          </div>
        </div>

        <div class="text-right text-xs">
          <span class="text-slate-400 block font-medium">Toplam Hakediş</span>
          <span class="font-bold font-mono text-emerald-700 text-sm">
            {{ Number(payload.totalAmount || 0).toFixed(2) }} ₺
          </span>
        </div>
      </div>

      <!-- Phone Number Field -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">
          Kurye Telefon Numarası
        </label>
        <div class="relative">
          <input
            v-model="localPhone"
            type="tel"
            placeholder="05XX XXX XX XX"
            class="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            @input="onPhoneChange"
          >
          <Phone class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <p class="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <span v-if="normalizedPhone" class="text-emerald-600 font-mono font-medium">
            WhatsApp Formatı: +{{ normalizedPhone }}
          </span>
          <span v-else class="text-slate-400">
            (Telefon girilmezse genel WhatsApp paylaşım ekranı açılır)
          </span>
        </p>
      </div>

      <!-- Message Preview Box -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs font-semibold text-slate-700">
            Gönderilecek Mesaj Taslağı
          </label>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-emerald-700 transition-colors"
            @click="handleCopy"
          >
            <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" :class="isCopied ? 'text-emerald-600' : ''" />
            <span>{{ isCopied ? 'Kopyalandı' : 'Metni Kopyala' }}</span>
          </button>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner select-all">
          {{ formattedMessage }}
        </div>
      </div>

      <!-- Instructions Note -->
      <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
        <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div class="space-y-1">
          <p class="font-semibold text-amber-900">
            PDF Dosya Ekleme Hatırlatması:
          </p>
          <p class="text-[11px] text-amber-800">
            Tarayıcı güvenlik kuralları gereği, WhatsApp Web açıldığında mesaj otomatik doldurulur. PDF raporu dosyasını açılan sohbete sürükleyip gönderebilirsiniz.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <BaseButton
          variant="outline"
          size="sm"
          @click="handleCopy"
        >
          <template #leading>
            <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" :class="isCopied ? 'text-emerald-600' : ''" />
          </template>
          {{ isCopied ? 'Kopyalandı' : 'Metni Kopyala' }}
        </BaseButton>

        <div class="flex items-center gap-2">
          <BaseButton
            variant="ghost"
            size="sm"
            @click="close"
          >
            Vazgeç
          </BaseButton>

          <BaseButton
            variant="primary"
            size="sm"
            class="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-emerald-600"
            @click="handleOpenWhatsApp"
          >
            <template #leading>
              <MessageSquare class="w-3.5 h-3.5" />
            </template>
            WhatsApp'ta Aç
          </BaseButton>
        </div>
      </div>
    </template>
  </BaseModal>
</template>
