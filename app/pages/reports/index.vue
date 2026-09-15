<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  FileText,
  Calendar,
  RefreshCw,
  Bike,
  Store,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Phone,
  Layers,
  ChevronRight
} from 'lucide-vue-next'
import { useReports, type CourierReportRecord } from '~/composables/useReports'
import { useCouriers } from '~/composables/useCouriers'
import { whatsAppShareService } from '~/services/whatsapp/whatsappShareService'
import { useToast } from '~/composables/useToast'

useHead({
  title: 'Hakediş Raporları & WhatsApp Faturası — KuryeTakip'
})

const {
  reportData,
  loading,
  errorMessage,
  selectedCourierId,
  startDate,
  endDate,
  fetchCourierReport,
  setQuickDateRange
} = useReports()

const { couriers, fetchCouriers } = useCouriers()
const toast = useToast()

const activeCouriers = computed(() => couriers.value.filter(c => c.isActive))

// WhatsApp Modal & Preview State
const isPreviewModalOpen = ref(false)
const copied = ref(false)

// Selected courier object helper
const selectedCourier = computed(() => {
  return couriers.value.find(c => c.id === selectedCourierId.value) || null
})

// Normalized Phone Check
const normalizedPhone = computed(() => {
  return whatsAppShareService.normalizePhoneNumber(reportData.value?.courier?.phone)
})

const hasValidPhone = computed(() => {
  return whatsAppShareService.isValidPhoneNumber(reportData.value?.courier?.phone)
})

// WhatsApp payload formatted object
const whatsAppPayload = computed(() => {
  if (!reportData.value) return null

  const mappedRecords = reportData.value.records.map(r => ({
    date: r.dateFormatted,
    venueName: r.venueName,
    deliveryTypeLabel: r.deliveryTypeLabel,
    packageCount: r.packageCount,
    unitPrice: r.unitPriceSnapshot,
    totalAmount: r.totalAmount
  }))

  return {
    recipientName: reportData.value.courier.name,
    recipientPhone: reportData.value.courier.phone,
    startDate: reportData.value.startDateFormatted,
    endDate: reportData.value.endDateFormatted,
    totalPackages: reportData.value.totalPackageCount,
    totalAmount: reportData.value.totalAmount,
    currency: 'TL',
    records: mappedRecords
  }
})

// Formatted invoice text for WhatsApp and preview
const formattedInvoiceText = computed(() => {
  if (!whatsAppPayload.value) return ''
  return whatsAppShareService.formatMessage(whatsAppPayload.value)
})

// Trigger fetch when courier or dates change
watch([selectedCourierId, startDate, endDate], ([newCourierId, newStart, newEnd], [oldCourierId, oldStart, oldEnd]) => {
  if (newCourierId && newStart && newEnd && newStart <= newEnd) {
    if (newCourierId !== oldCourierId || newStart !== oldStart || newEnd !== oldEnd) {
      fetchCourierReport()
    }
  }
})

const handleCopyInvoice = async () => {
  if (!formattedInvoiceText.value) return
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(formattedInvoiceText.value)
      copied.value = true
      toast.success('Hakediş metni panoya kopyalandı!')
      setTimeout(() => {
        copied.value = false
      }, 2500)
    } catch {
      toast.error('Kopyalama başarısız oldu.')
    }
  }
}

const handleSendWhatsApp = () => {
  if (!reportData.value) return

  if (!hasValidPhone.value) {
    toast.error('Bu kurye için telefon numarası kayıtlı değil. Lütfen önce kurye bilgilerine telefon numarası ekleyin.', 'Telefon Eksik')
    return
  }

  if (!whatsAppPayload.value) return

  const shareUrl = whatsAppShareService.generateShareUrl(whatsAppPayload.value)
  window.open(shareUrl, '_blank', 'noopener,noreferrer')
  toast.success('WhatsApp yönlendirmesi açıldı.')
}

const openPreview = () => {
  if (!reportData.value || reportData.value.records.length === 0) return
  isPreviewModalOpen.value = true
}

onMounted(async () => {
  await fetchCouriers()
  // Select first active courier by default if available
  if (activeCouriers.value.length > 0 && !selectedCourierId.value) {
    selectedCourierId.value = activeCouriers.value[0].id
  }
})

</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <FileText class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Raporlar</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kurye hakediş raporunu görüntüleyin, detayları inceleyin ve WhatsApp üzerinden hakediş faturasını iletin.
        </p>
      </div>

      <div v-if="reportData && reportData.records.length > 0" class="flex items-center gap-2.5">
        <BaseButton
          variant="outline"
          size="md"
          @click="openPreview"
        >
          <template #leading>
            <FileText class="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </template>
          Fatura Önizle
        </BaseButton>

        <BaseButton
          variant="primary"
          size="md"
          class="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
          :disabled="!hasValidPhone"
          :title="!hasValidPhone ? 'Telefon numarası eksik' : 'WhatsApp\'tan Gönder'"
          @click="handleSendWhatsApp"
        >
          <template #leading>
            <MessageCircle class="w-4 h-4" />
          </template>
          WhatsApp'tan Gönder
        </BaseButton>
      </div>
    </div>

    <!-- Filter & Date Selection Bar -->
    <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- 1. Kurye Seçimi (Zorunlu) -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Kurye <span class="text-rose-500">*</span>
          </label>
          <BaseSelect
            v-model="selectedCourierId"
            :options="[
              { value: '', label: 'Kurye Seçiniz...' },
              ...couriers.map(c => ({
                value: c.id,
                label: `${c.name} ${!c.isActive ? '(Pasif)' : ''} ${c.phone ? '— ' + c.phone : '— (No Tel)'}`
              }))
            ]"
            placeholder="Kurye seçiniz..."
          />
        </div>

        <!-- 2. Başlangıç Tarihi -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Başlangıç Tarihi <span class="text-rose-500">*</span>
          </label>
          <BaseInput
            v-model="startDate"
            type="date"
            @blur="selectedCourierId && fetchCourierReport()"
          />
        </div>

        <!-- 3. Bitiş Tarihi -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Bitiş Tarihi <span class="text-rose-500">*</span>
          </label>
          <BaseInput
            v-model="endDate"
            type="date"
            @blur="selectedCourierId && fetchCourierReport()"
          />
        </div>
      </div>

      <!-- Hızlı Tarih Seçim Butonları & Yenile -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div class="flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">Hızlı Tarih:</span>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            @click="setQuickDateRange('this_month')"
          >
            Bu Ay
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            @click="setQuickDateRange('last_month')"
          >
            Geçen Ay
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            @click="setQuickDateRange('last_7_days')"
          >
            Son 7 Gün
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            @click="setQuickDateRange('today')"
          >
            Bugün
          </button>
        </div>

        <BaseButton
          variant="outline"
          size="sm"
          :disabled="!selectedCourierId || loading"
          @click="fetchCourierReport"
        >
          <template #leading>
            <RefreshCw :class="['w-3.5 h-3.5', loading ? 'animate-spin' : '']" />
          </template>
          Raporu Getir
        </BaseButton>
      </div>
    </div>

    <!-- DURUM 1: Kurye Seçilmemiş -->
    <div v-if="!selectedCourierId" class="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
      <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
        <Bike class="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Lütfen bir kurye seçin</h3>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Kuryenin belirlenen tarih aralığındaki toplam paket ve hakedişini hesaplamak için yukarıdaki kurye listesinden bir seçim yapınız.
      </p>
    </div>

    <!-- DURUM 2: Yükleniyor -->
    <div v-else-if="loading" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
      <RefreshCw class="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
      <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">Kurye hakediş raporu hesaplanıyor...</div>
      <div class="text-xs text-slate-400 dark:text-slate-500">Veritabanındaki anlık fiyat ve toplam tutarlar derleniyor.</div>
    </div>

    <!-- DURUM 3: Kurye Seçili & Rapor Verisi Var -->
    <div v-else-if="reportData" class="space-y-6">
      <!-- Telefon Numarası Eksik Uyarısı -->
      <div
        v-if="!hasValidPhone"
        class="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm"
      >
        <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong class="font-bold block">Kurye Telefon Numarası Eksik</strong>
          Bu kurye için telefon numarası kayıtlı değil. Lütfen önce kurye bilgilerine telefon numarası ekleyin.
          (Yine de faturayı önizleyebilir ve metin olarak kopyalayabilirsiniz.)
        </div>
      </div>

      <!-- 1. RAPOR ÖZETİ (KPI Cards) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Kurye & Tarih Kartı -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kurye Bilgisi
            </div>
            <div class="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
              <Bike class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{{ reportData.courier.name }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              <Phone class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{{ reportData.courier.phone || 'Telefon Kayıtlı Değil' }}</span>
            </div>
          </div>

          <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span class="text-slate-400 dark:text-slate-500 font-medium">Tarih Aralığı:</span>
            <span class="font-mono font-semibold">{{ reportData.startDateFormatted }} — {{ reportData.endDateFormatted }}</span>
          </div>
        </div>

        <!-- Toplam Paket Kartı -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Toplam Paket Sayısı
            </div>
            <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {{ reportData.totalPackageCount }}
            </div>
          </div>

          <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div class="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{{ reportData.indoorPackages }} İç Mekan</span>
            </div>
            <div class="text-sky-700 dark:text-sky-400 font-medium flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-sky-500" />
              <span>{{ reportData.outdoorPackages }} Dış Mekan</span>
            </div>
          </div>
        </div>

        <!-- TOPLAM HAKEDİŞ KARTI (Ana Vurgulu Kart) -->
        <div class="bg-slate-950 dark:bg-slate-900 p-5 rounded-xl border border-slate-800 dark:border-slate-700 shadow-sm text-white flex flex-col justify-between relative overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                TOPLAM HAKEDİŞ
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Net Tutar
              </span>
            </div>
            <div class="text-3xl sm:text-4xl font-black text-emerald-400 mt-2 font-mono tracking-tight">
              {{ reportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </div>
          </div>

          <div class="pt-3 mt-3 border-t border-slate-800/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{{ reportData.records.length }} Teslimat Kaydı</span>
            <span class="text-slate-300 font-medium">Birim Snapshot Esaslı</span>
          </div>
        </div>
      </div>

      <!-- DURUM 3.1: Kayıt Yoksa -->
      <div
        v-if="reportData.records.length === 0"
        class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2"
      >
        <div class="text-sm font-semibold text-slate-700 dark:text-slate-300">Bu tarih aralığında seçilen kurye için hakediş kaydı bulunamadı.</div>
        <p class="text-xs text-slate-400 dark:text-slate-500">
          {{ reportData.startDateFormatted }} ile {{ reportData.endDateFormatted }} tarihleri arasında girilmiş paket kaydı yoktur.
        </p>
      </div>

      <!-- DURUM 3.2: Kayıtlar Tablosu & Fatura Önizleme -->
      <div v-else class="space-y-6">
        <!-- Detaylı Hakediş Tablosu -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-850">
            <div>
              <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                Hakediş Detay Tablosu
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Kayıtların snapshot birim fiyatı ve hesaplanmış toplam hakediş tutarları listelenmektedir.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <BaseButton
                variant="outline"
                size="sm"
                @click="openPreview"
              >
                <template #leading>
                  <FileText class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </template>
                Fatura Metnini Gör
              </BaseButton>

              <BaseButton
                variant="primary"
                size="sm"
                class="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                :disabled="!hasValidPhone"
                @click="handleSendWhatsApp"
              >
                <template #leading>
                  <MessageCircle class="w-3.5 h-3.5" />
                </template>
                WhatsApp'tan Gönder
              </BaseButton>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tarih</th>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Mekan</th>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Tür</th>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Paket</th>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Birim Fiyat</th>
                  <th class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 text-right">Hakediş</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr
                  v-for="item in reportData.records"
                  :key="item.id"
                  class="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <!-- Tarih -->
                  <td class="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                    {{ item.dateFormatted }}
                  </td>

                  <!-- Mekan -->
                  <td class="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                    <div class="flex items-center gap-1.5">
                      <Store class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{{ item.venueName }}</span>
                    </div>
                  </td>

                  <!-- Tür -->
                  <td class="px-4 py-3 text-center">
                    <BaseBadge
                      :variant="item.deliveryType === 'INDOOR' ? 'success' : 'brand'"
                      dot
                    >
                      {{ item.deliveryTypeLabel }}
                    </BaseBadge>
                  </td>

                  <!-- Paket Sayısı -->
                  <td class="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {{ item.packageCount }}
                  </td>

                  <!-- Birim Fiyat Snapshot -->
                  <td class="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {{ item.unitPriceSnapshot.toFixed(2) }} ₺
                  </td>

                  <!-- Hakediş (totalAmount) -->
                  <td class="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    {{ item.totalAmount.toFixed(2) }} ₺
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-900 dark:bg-slate-950 text-white font-bold border-t-2 border-slate-800 dark:border-slate-800">
                <tr>
                  <td colspan="3" class="px-4 py-3.5 text-slate-300">
                    GENEL TOPLAM
                  </td>
                  <td class="px-4 py-3.5 text-right font-mono text-white text-base">
                    {{ reportData.totalPackageCount }} Adet
                  </td>
                  <td class="px-4 py-3.5 text-right text-slate-400 text-xs">
                    —
                  </td>
                  <td class="px-4 py-3.5 text-right font-mono text-emerald-400 text-base">
                    {{ reportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Hakediş Belgesi Önizleme Kartı (Sayfa Altı Doğrudan Önizleme) -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Hakediş Belgesi / Fatura Önizleme</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                WhatsApp üzerinden gönderilecek metnin birebir önizlemesidir.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <BaseButton
                variant="outline"
                size="sm"
                @click="handleCopyInvoice"
              >
                <template #leading>
                  <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <Copy v-else class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </template>
                {{ copied ? 'Kopyalandı' : 'Metni Kopyala' }}
              </BaseButton>

              <BaseButton
                variant="primary"
                size="sm"
                class="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                :disabled="!hasValidPhone"
                @click="handleSendWhatsApp"
              >
                <template #leading>
                  <MessageCircle class="w-3.5 h-3.5" />
                </template>
                WhatsApp'tan Gönder
              </BaseButton>
            </div>
          </div>

          <!-- Invoice Content Card -->
          <div class="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed select-all">
            {{ formattedInvoiceText }}
          </div>
        </div>
      </div>
    </div>

    <!-- HAKEDİŞ FATURASI MODAL (Önizleme & Hızlı Gönderim) -->
    <BaseModal
      v-model="isPreviewModalOpen"
      title="Hakediş Faturası & WhatsApp Önizleme"
      description="Kuryeye iletilecek hakediş özetini inceleyin ve WhatsApp üzerinden gönderin."
    >
      <div class="space-y-4">
        <div v-if="!hasValidPhone" class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
          <strong>Uyarı:</strong> Kuryenin telefon numarası kayıtlı olmadığından doğrudan WhatsApp linki açılamaz. Metni kopyalayarak manuel gönderebilirsiniz.
        </div>

        <div class="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-xl text-xs sm:text-sm font-mono whitespace-pre-line max-h-96 overflow-y-auto leading-relaxed border border-slate-800 select-all">
          {{ formattedInvoiceText }}
        </div>

        <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
          <BaseButton
            variant="outline"
            size="sm"
            @click="handleCopyInvoice"
          >
            <template #leading>
              <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            </template>
            {{ copied ? 'Kopyalandı' : 'Metni Kopyala' }}
          </BaseButton>

          <div class="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              @click="isPreviewModalOpen = false"
            >
              Kapat
            </BaseButton>

            <BaseButton
              variant="primary"
              size="sm"
              class="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
              :disabled="!hasValidPhone"
              @click="handleSendWhatsApp"
            >
              <template #leading>
                <MessageCircle class="w-3.5 h-3.5" />
              </template>
              WhatsApp'tan Gönder
            </BaseButton>
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
