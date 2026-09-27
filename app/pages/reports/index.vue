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
  ChevronRight,
  Wallet,
  Lock,
  Plus,
  Search,
  History,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Archive,
  DollarSign
} from 'lucide-vue-next'
import { useReports, type CourierReportRecord } from '~/composables/useReports'
import { useCouriers, type CourierItem } from '~/composables/useCouriers'
import { useAdvanceReports } from '~/composables/useAdvanceReports'
import { whatsAppShareService } from '~/services/whatsapp/whatsappShareService'
import { useToast } from '~/composables/useToast'

useHead({
  title: 'Hakediş & Avans Raporları — KuryeTakip'
})

// Tab Navigation: 'advances' (Avans Raporları), 'settlement' (Kurye Hakediş & WhatsApp), 'periods' (Kapatılan Dönemler)
const activeTab = ref<'advances' | 'settlement' | 'periods'>('advances')

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

const { couriers, fetchCouriers, deleteCourierAdvance } = useCouriers()
const toast = useToast()

// Advance Reports Composable
const {
  loading: advanceLoading,
  settlementLoading,
  reportData: advanceReportData,
  settlementPeriods,
  period: advancePeriod,
  startDate: advanceStartDate,
  endDate: advanceEndDate,
  selectedCourierId: advanceCourierFilter,
  statusFilter: advanceStatusFilter,
  minAmount: advanceMinAmount,
  maxAmount: advanceMaxAmount,
  fetchAdvanceReports,
  fetchSettlementPeriods,
  closeWeek,
  setQuickFilter: setAdvanceQuickFilter
} = useAdvanceReports()

// Close Week Modal & History Modal State
const isCloseWeekModalOpen = ref(false)
const isAdvanceHistoryModalOpen = ref(false)
const selectedCourierForHistory = ref<CourierItem | null>(null)

const openHistoryForCourier = (courierId: string) => {
  const found = couriers.value.find(c => c.id === courierId) || null
  if (found) {
    selectedCourierForHistory.value = found
    isAdvanceHistoryModalOpen.value = true
  }
}

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
    totalAdvance: reportData.value.totalAdvance || 0,
    remainingBalance: reportData.value.remainingBalance !== undefined
      ? reportData.value.remainingBalance
      : Number(((reportData.value.totalAmount || 0) - (reportData.value.totalAdvance || 0)).toFixed(2)),
    weeklyAdvance: reportData.value.weeklyTotalAdvance || 0,
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
  if (activeTab.value === 'settlement' && newCourierId && newStart && newEnd && newStart <= newEnd) {
    if (newCourierId !== oldCourierId || newStart !== oldStart || newEnd !== oldEnd) {
      fetchCourierReport()
    }
  }
})

// Trigger fetch when advance filters change
watch([advancePeriod, advanceStartDate, advanceEndDate, advanceCourierFilter, advanceStatusFilter, advanceMinAmount, advanceMaxAmount], () => {
  if (activeTab.value === 'advances') {
    fetchAdvanceReports()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'advances') {
    fetchAdvanceReports()
  } else if (tab === 'settlement') {
    if (selectedCourierId.value) fetchCourierReport()
  } else if (tab === 'periods') {
    fetchSettlementPeriods()
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

const handleDeleteAdvanceRecord = async (rec: any) => {
  if (!confirm(`${rec.dateFormatted} tarihli ${rec.formattedAmount} ₺ tutarındaki avansı silmek istediğinize emin misiniz?`)) {
    return
  }
  const success = await deleteCourierAdvance(rec.courierId, rec.id)
  if (success) {
    await fetchAdvanceReports()
  }
}

onMounted(async () => {
  await fetchCouriers()
  await fetchAdvanceReports()
  // Select first active courier by default if available
  if (activeCouriers.value.length > 0 && !selectedCourierId.value) {
    selectedCourierId.value = activeCouriers.value[0].id
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header & Tab Navigation -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <FileText class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Finans & Raporlama</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Avans raporları, kurye hakedişleri, haftalık kapatma ve WhatsApp dökümleri.
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Close Week Button (Always accessible) -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs"
          @click="isCloseWeekModalOpen = true"
        >
          <Lock class="w-3.5 h-3.5" />
          <span>Haftayı Kapat</span>
        </button>

        <div v-if="activeTab === 'settlement' && reportData && reportData.records.length > 0" class="flex items-center gap-2">
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
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        :class="activeTab === 'advances' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
        @click="activeTab = 'advances'"
      >
        <Wallet class="w-4 h-4" />
        <span>Avans Raporları</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        :class="activeTab === 'settlement' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
        @click="activeTab = 'settlement'"
      >
        <FileText class="w-4 h-4" />
        <span>Kurye Hakediş & WhatsApp</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        :class="activeTab === 'periods' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'"
        @click="activeTab = 'periods'"
      >
        <Archive class="w-4 h-4" />
        <span>Kapatılan Haftalar ({{ settlementPeriods.length }})</span>
      </button>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: AVANS RAPORLARI (YENİ SİSTEM)       -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'advances'" class="space-y-6">
      <!-- Filtreler & Hızlı Butonlar -->
      <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <!-- Hızlı Filtre Butonları -->
        <div class="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Dönem:</span>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              :class="advancePeriod === 'today' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              @click="setAdvanceQuickFilter('today')"
            >
              Bugün
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              :class="advancePeriod === 'week' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              @click="setAdvanceQuickFilter('week')"
            >
              Bu Hafta
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              :class="advancePeriod === 'lastWeek' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              @click="setAdvanceQuickFilter('lastWeek')"
            >
              Geçen Hafta
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              :class="advancePeriod === 'month' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              @click="setAdvanceQuickFilter('month')"
            >
              Bu Ay
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              :class="advancePeriod === 'custom' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'"
              @click="advancePeriod = 'custom'"
            >
              Özel Tarih
            </button>
          </div>

          <div class="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            {{ advanceReportData?.startDateFormatted }} - {{ advanceReportData?.endDateFormatted }}
          </div>
        </div>

        <!-- Ekstra Filtreler (Kurye, Min/Max Tutar, Durum) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Kurye Seçimi -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Kurye Filtresi
            </label>
            <select
              v-model="advanceCourierFilter"
              class="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">Tüm Kuryeler</option>
              <option v-for="c in couriers" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <!-- Durum -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Durum
            </label>
            <select
              v-model="advanceStatusFilter"
              class="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">Tümü (Aktif + Kapatılmış)</option>
              <option value="ACTIVE">Yalnızca Aktif Avanslar</option>
              <option value="CLOSED">Kapatılmış / Arşivlenmiş</option>
            </select>
          </div>

          <!-- Min Tutar -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Min Avans (₺)
            </label>
            <input
              v-model="advanceMinAmount"
              type="number"
              placeholder="0"
              class="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <!-- Maks Tutar -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Maks Avans (₺)
            </label>
            <input
              v-model="advanceMaxAmount"
              type="number"
              placeholder="Limitsiz"
              class="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Özel Tarih Seçimi (Yalnızca custom seçildiğinde açılır) -->
        <div v-if="advancePeriod === 'custom'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Başlangıç Tarihi</label>
            <input
              v-model="advanceStartDate"
              type="date"
              class="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Bitiş Tarihi</label>
            <input
              v-model="advanceEndDate"
              type="date"
              class="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="advanceLoading" class="py-12 text-center">
        <div class="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-xs text-slate-400">Avans rapor verileri hesaplanıyor...</p>
      </div>

      <div v-else-if="advanceReportData" class="space-y-6">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Toplam Avans -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Toplam Avans</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-2">
              <span class="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                {{ advanceReportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Seçili dönemde ödenen toplam
            </div>
          </div>

          <!-- Toplam İşlem Sayısı -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlem Sayısı</span>
              <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Layers class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-2">
              <span class="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100">
                {{ advanceReportData.totalCount }}
              </span>
              <span class="text-xs font-medium text-slate-400 ml-1">kayıt</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Farklı zamanlarda girilen işlemler
            </div>
          </div>

          <!-- Ortalama Avans Tutarı -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlem Ortalaması</span>
              <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <TrendingUp class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-2">
              <span class="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100">
                {{ advanceReportData.averageAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              İşlem başına düşen ortalama
            </div>
          </div>

          <!-- Avans Alan Kurye Sayısı -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avans Alan Kurye</span>
              <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bike class="w-4 h-4" />
              </div>
            </div>
            <div class="mt-2">
              <span class="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100">
                {{ advanceReportData.courierBreakdown.length }}
              </span>
              <span class="text-xs font-medium text-slate-400 ml-1">kurye</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Bu periyotta avans alanlar
            </div>
          </div>
        </div>

        <!-- 2 Kolonlu Özet Grid: Kurye Bazlı Avans Özeti & Günlük Avans Özeti -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 1. Kurye Bazlı Avans Özeti Tablosu -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
            <div class="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center justify-between">
              <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bike class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Kurye Bazlı Avans Toplamları</span>
              </h3>
              <span class="text-xs text-slate-400 font-mono">{{ advanceReportData.courierBreakdown.length }} kurye</span>
            </div>

            <div class="overflow-x-auto flex-1">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-850/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th class="px-4 py-2.5">Kurye</th>
                    <th class="px-4 py-2.5 text-center">İşlem</th>
                    <th class="px-4 py-2.5 text-right">Toplam Avans</th>
                    <th class="px-4 py-2.5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-if="advanceReportData.courierBreakdown.length === 0">
                    <td colspan="4" class="px-4 py-8 text-center text-slate-400">
                      Bu dönemde avans işlemi bulunmuyor.
                    </td>
                  </tr>
                  <tr
                    v-for="cb in advanceReportData.courierBreakdown"
                    :key="cb.courierId"
                    class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td class="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                      {{ cb.courierName }}
                    </td>
                    <td class="px-4 py-2.5 text-center font-mono text-slate-500">
                      {{ cb.count }} adet
                    </td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {{ cb.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                    </td>
                    <td class="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        class="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800"
                        title="Avans Geçmişini Gör"
                        @click="openHistoryForCourier(cb.courierId)"
                      >
                        <Clock class="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50/90 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-800">
                  <tr>
                    <td class="px-4 py-2.5 text-slate-700 dark:text-slate-300">GENEL TOPLAM</td>
                    <td class="px-4 py-2.5 text-center font-mono">{{ advanceReportData.totalCount }} adet</td>
                    <td class="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {{ advanceReportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- 2. Günlük Avans Özeti Tablosu -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
            <div class="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center justify-between">
              <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Günlük Avans Toplamları</span>
              </h3>
              <span class="text-xs text-slate-400 font-mono">{{ advanceReportData.dailyBreakdown.length }} gün</span>
            </div>

            <div class="overflow-x-auto flex-1">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-850/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th class="px-4 py-2.5">Tarih</th>
                    <th class="px-4 py-2.5">Gün</th>
                    <th class="px-4 py-2.5 text-center">İşlem</th>
                    <th class="px-4 py-2.5 text-right">Günlük Toplam Avans</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-if="advanceReportData.dailyBreakdown.length === 0">
                    <td colspan="4" class="px-4 py-8 text-center text-slate-400">
                      Bu dönemde günlük avans kaydı bulunmuyor.
                    </td>
                  </tr>
                  <tr
                    v-for="db in advanceReportData.dailyBreakdown"
                    :key="db.date"
                    class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td class="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {{ db.dateFormatted }}
                    </td>
                    <td class="px-4 py-2.5 text-slate-500">
                      {{ db.dayName }}
                    </td>
                    <td class="px-4 py-2.5 text-center font-mono text-slate-500">
                      {{ db.count }}
                    </td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {{ db.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50/90 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-800">
                  <tr>
                    <td colspan="2" class="px-4 py-2.5 text-slate-700 dark:text-slate-300">GÜNLÜK TOPLAMLAR</td>
                    <td class="px-4 py-2.5 text-center font-mono">{{ advanceReportData.totalCount }} adet</td>
                    <td class="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {{ advanceReportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- 3. Detaylı Avans İşlem Geçmişi Tablosu -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History class="w-4 h-4 text-emerald-600" />
                <span>Detaylı Avans İşlem Dökümü</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Her bir avans işleminin tarihi, saati, kuryesi ve işlem tutarı
              </p>
            </div>
            <span class="text-xs font-mono text-slate-400 font-semibold">{{ advanceReportData.records.length }} İşlem</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-850/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th class="px-4 py-3">Tarih & Saat</th>
                  <th class="px-4 py-3">Kurye</th>
                  <th class="px-4 py-3">Açıklama / Not</th>
                  <th class="px-4 py-3 text-center">Dönem Kodu</th>
                  <th class="px-4 py-3 text-center">Durum</th>
                  <th class="px-4 py-3 text-right">Avans Tutarı</th>
                  <th class="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-if="advanceReportData.records.length === 0">
                  <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                    Kayıtlı avans işlemi bulunamadı.
                  </td>
                </tr>
                <tr
                  v-for="rec in advanceReportData.records"
                  :key="rec.id"
                  class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td class="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {{ rec.dateFormatted }} <span class="text-slate-400 ml-1 text-[11px]">{{ rec.time }}</span>
                  </td>
                  <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {{ rec.courierName }}
                  </td>
                  <td class="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {{ rec.description || '—' }}
                  </td>
                  <td class="px-4 py-3 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {{ rec.week || '—' }}
                  </td>
                  <td class="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      :class="rec.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'"
                    >
                      {{ rec.status === 'ACTIVE' ? 'Aktif' : 'Arşiv / Kapatıldı' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {{ rec.formattedAmount }} ₺
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Avans kaydını sil"
                      @click="handleDeleteAdvanceRecord(rec)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: KURYE HAKEDİŞ & WHATSAPP FATURASI   -->
    <!-- ========================================== -->
    <div v-else-if="activeTab === 'settlement'" class="space-y-6">
      <!-- Filter & Date Selection Bar -->
      <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- 1. Kurye Seçimi -->
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
              Başlangıç Tarihi
            </label>
            <BaseInput
              v-model="startDate"
              type="date"
            />
          </div>

          <!-- 3. Bitiş Tarihi -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Bitiş Tarihi
            </label>
            <BaseInput
              v-model="endDate"
              type="date"
            />
          </div>
        </div>

        <!-- Hızlı Tarih Seçim Butonları -->
        <div class="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs text-slate-500 font-medium mr-1">Hızlı Seçim:</span>
            <BaseButton
              variant="outline"
              size="sm"
              @click="setQuickDateRange('today')"
            >
              Bugün
            </BaseButton>
            <BaseButton
              variant="outline"
              size="sm"
              @click="setQuickDateRange('last_7_days')"
            >
              Son 7 Gün
            </BaseButton>
            <BaseButton
              variant="outline"
              size="sm"
              @click="setQuickDateRange('this_month')"
            >
              Bu Ay
            </BaseButton>
            <BaseButton
              variant="outline"
              size="sm"
              @click="setQuickDateRange('last_month')"
            >
              Geçen Ay
            </BaseButton>
          </div>

          <BaseButton
            variant="outline"
            size="sm"
            :loading="loading"
            @click="fetchCourierReport"
          >
            <template #leading>
              <RefreshCw class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            </template>
            Raporu Yenile
          </BaseButton>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-3">
        <AlertTriangle class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center">
        <div class="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-xs text-slate-400">Kurye hakediş raporu hesaplanıyor...</p>
      </div>

      <!-- Report Content -->
      <div v-else-if="reportData" class="space-y-6">
        <!-- KPI Cards Grid (Hakediş, Avans, Kalan Hakediş) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Toplam Paket -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Toplam Paket</span>
            <span class="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 block mt-2">
              {{ reportData.totalPackageCount }}
            </span>
            <div class="text-[11px] text-slate-400 mt-1">İç: {{ reportData.indoorPackages }} | Dış: {{ reportData.outdoorPackages }}</div>
          </div>

          <!-- Toplam Hakediş -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Toplam Hakediş</span>
            <span class="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 block mt-2">
              {{ reportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </span>
            <div class="text-[11px] text-slate-400 mt-1">Dönem içi paket kazancı</div>
          </div>

          <!-- Verilen Avans -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Verilen Avans</span>
            <span class="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 block mt-2">
              {{ (reportData.totalAdvance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </span>
            <div class="text-[11px] text-slate-400 mt-1">Dönem içi kayıtlı avanslar</div>
          </div>

          <!-- Kalan Hakediş -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Kalan Hakediş</span>
            <span
              class="text-2xl font-mono font-extrabold block mt-2"
              :class="(reportData.remainingBalance ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ (reportData.remainingBalance ?? (reportData.totalAmount - (reportData.totalAdvance || 0))).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </span>
            <div class="text-[11px] text-slate-400 mt-1">Hakediş - Avans Tutarı</div>
          </div>
        </div>

        <!-- Detaylı Teslimat Kayıtları Tablosu -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers class="w-4 h-4 text-emerald-600" />
              <span>Dönem Teslimat Kayıtları ({{ reportData.records.length }})</span>
            </h3>
            <span class="text-xs font-mono text-slate-400">{{ reportData.startDateFormatted }} - {{ reportData.endDateFormatted }}</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-850/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th class="px-4 py-3">Tarih</th>
                  <th class="px-4 py-3">Mekan</th>
                  <th class="px-4 py-3 text-center">Tür</th>
                  <th class="px-4 py-3 text-right">Paket</th>
                  <th class="px-4 py-3 text-right">Birim Fiyat</th>
                  <th class="px-4 py-3 text-right">Hakediş</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="item in reportData.records" :key="item.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-mono font-medium">{{ item.dateFormatted }}</td>
                  <td class="px-4 py-3 font-semibold">{{ item.venueName }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="item.deliveryType === 'INDOOR' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'">
                      {{ item.deliveryTypeLabel }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-mono font-bold">{{ item.packageCount }}</td>
                  <td class="px-4 py-3 text-right font-mono">{{ item.unitPriceSnapshot.toFixed(2) }} ₺</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-emerald-600">{{ item.totalAmount.toFixed(2) }} ₺</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-900 text-white font-bold">
                <tr>
                  <td colspan="3" class="px-4 py-3 text-slate-300">GENEL TOPLAM</td>
                  <td class="px-4 py-3 text-right font-mono">{{ reportData.totalPackageCount }} Adet</td>
                  <td></td>
                  <td class="px-4 py-3 text-right font-mono text-emerald-400 text-sm">
                    {{ reportData.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Hakediş Belgesi Önizleme Kartı -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp Faturası & Avans Entegrasyonu</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                WhatsApp metnine verilen avans, kalan hakediş ve haftalık avans toplamı otomatik dahil edilmiştir.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <BaseButton variant="outline" size="sm" @click="handleCopyInvoice">
                <template #leading>
                  <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600" />
                  <Copy v-else class="w-3.5 h-3.5 text-slate-600" />
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

          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed select-all">
            {{ formattedInvoiceText }}
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 3: KAPATILAN HAFTALAR VE DÖNEMLER     -->
    <!-- ========================================== -->
    <div v-else-if="activeTab === 'periods'" class="space-y-6">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Archive class="w-4 h-4 text-emerald-600" />
              <span>Kapatılmış Hafta Dönemleri ve Arşiv</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haftalık hesap kapatma geçmişi. Arşivlenen dönemlerdeki avanslar raporlarda korunur ancak aktif hesaplamalara tekrar dahil edilmez.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors"
            @click="isCloseWeekModalOpen = true"
          >
            <Lock class="w-3.5 h-3.5" />
            <span>Yeni Hafta Kapat</span>
          </button>
        </div>

        <div v-if="settlementLoading" class="py-12 text-center">
          <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-xs text-slate-400">Dönem kayıtları yükleniyor...</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-850/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th class="px-4 py-3">Hafta Kodu</th>
                <th class="px-4 py-3">Tarih Aralığı</th>
                <th class="px-4 py-3 text-right">Toplam Paket</th>
                <th class="px-4 py-3 text-right">Toplam Hakediş</th>
                <th class="px-4 py-3 text-right">Kapatılan Avans</th>
                <th class="px-4 py-3 text-right">Kalan Hakediş</th>
                <th class="px-4 py-3">Kapatılma Zamanı</th>
                <th class="px-4 py-3">Not</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-if="settlementPeriods.length === 0">
                <td colspan="8" class="px-4 py-12 text-center text-slate-400">
                  Henüz kapatılmış bir hafta dönemi bulunmuyor. "Haftayı Kapat" butonunu kullanarak ilk haftayı arşivleyebilirsiniz.
                </td>
              </tr>
              <tr
                v-for="sp in settlementPeriods"
                :key="sp.id"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                  {{ sp.week || '—' }}
                </td>
                <td class="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                  {{ sp.startDateFormatted }} - {{ sp.endDateFormatted }}
                </td>
                <td class="px-4 py-3 text-right font-mono font-bold">
                  {{ sp.totalPackages }} Adet
                </td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                  {{ sp.totalEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </td>
                <td class="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {{ sp.totalAdvance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </td>
                <td class="px-4 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                  {{ sp.remainingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </td>
                <td class="px-4 py-3 font-mono text-[11px] text-slate-500">
                  {{ sp.closedAtFormatted }}
                </td>
                <td class="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                  {{ sp.note || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
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

    <!-- HAFTAYI KAPAT MODAL -->
    <CloseWeekModal
      :is-open="isCloseWeekModalOpen"
      @close="isCloseWeekModalOpen = false"
      @closed="fetchAdvanceReports(); fetchSettlementPeriods()"
    />

    <!-- KURYE AVANS GEÇMİŞİ MODAL -->
    <CourierAdvanceHistoryModal
      :is-open="isAdvanceHistoryModalOpen"
      :courier="selectedCourierForHistory"
      @close="isAdvanceHistoryModalOpen = false"
      @updated="fetchAdvanceReports()"
    />
  </div>
</template>
