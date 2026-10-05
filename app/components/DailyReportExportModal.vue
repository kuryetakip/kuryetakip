<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Package,
  Bike,
  Store,
  DollarSign,
  Loader2,
  Sparkles
} from 'lucide-vue-next'
import { useDailyReportExport } from '~/composables/useDailyReportExport'
import type { DailyReportSummaryResponse } from '~/server/api/reports/daily-summary.get'

interface Props {
  modelValue: boolean
  initialDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialDate: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { isExporting, exportingType, fetchDailySummary, exportToExcel, exportToPdf } = useDailyReportExport()

// Target Date State (Defaults to today)
const todayStr = new Date().toISOString().substring(0, 10)
const selectedDate = ref(props.initialDate || todayStr)

// Preview State
const isLoadingPreview = ref(false)
const summaryData = ref<DailyReportSummaryResponse | null>(null)

const isToday = computed(() => selectedDate.value === todayStr)

const setQuickDate = (type: 'today' | 'yesterday') => {
  const d = new Date()
  if (type === 'yesterday') {
    d.setDate(d.getDate() - 1)
  }
  selectedDate.value = d.toISOString().substring(0, 10)
}

const loadSummary = async () => {
  isLoadingPreview.value = true
  summaryData.value = await fetchDailySummary(selectedDate.value)
  isLoadingPreview.value = false
}

// Watch modal open and date changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      if (props.initialDate) {
        selectedDate.value = props.initialDate
      } else if (!selectedDate.value) {
        selectedDate.value = todayStr
      }
      loadSummary()
    }
  }
)

watch(selectedDate, () => {
  if (props.modelValue) {
    loadSummary()
  }
})

const close = () => {
  if (!isExporting.value) {
    emit('update:modelValue', false)
  }
}

const handleExportExcel = async () => {
  await exportToExcel(selectedDate.value, summaryData.value || undefined)
}

const handleExportPdf = async () => {
  await exportToPdf(selectedDate.value, summaryData.value || undefined)
}

const handleExportBoth = async () => {
  const ok1 = await exportToExcel(selectedDate.value, summaryData.value || undefined)
  if (ok1) {
    // Small delay to allow browser to trigger first download
    setTimeout(async () => {
      await exportToPdf(selectedDate.value, summaryData.value || undefined)
    }, 400)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-opacity duration-200"
    >
      <!-- Modal Box -->
      <div
        class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all transform scale-100"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Download class="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>Gün Sonu Raporu Al</span>
                <span class="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PDF & Excel
                </span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Veri kaybını ve silinme riskini önlemek için güncel hakediş ve siparişleri arşivleyin.
              </p>
            </div>
          </div>

          <button
            type="button"
            :disabled="isExporting"
            class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            @click="close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-5">
          <!-- 1. Tarih Seçici -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rapor Tarihi Seçin
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative flex-1 min-w-[180px]">
                <Calendar class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  v-model="selectedDate"
                  type="date"
                  class="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                />
              </div>

              <!-- Quick Date Buttons -->
              <button
                type="button"
                :class="[
                  'px-3 py-2 text-xs font-semibold rounded-xl border transition-colors',
                  isToday
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                ]"
                @click="setQuickDate('today')"
              >
                Bugün
              </button>
              <button
                type="button"
                class="px-3 py-2 text-xs font-semibold rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                @click="setQuickDate('yesterday')"
              >
                Dün
              </button>
            </div>
          </div>

          <!-- 2. Canlı Veri Özeti (Mini KPI Önizleme) -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5">
              <span class="flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-emerald-500" />
                {{ summaryData?.formattedDate || selectedDate }} Veri Önizlemesi
              </span>
              <span v-if="isLoadingPreview" class="flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 class="w-3 h-3 animate-spin text-emerald-500" />
                Yükleniyor...
              </span>
            </div>

            <!-- Metric badges -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <!-- Toplam Paket -->
              <div class="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                  <Package class="w-3 h-3 text-emerald-500" />
                  Teslimat
                </div>
                <div class="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {{ summaryData?.summary.totalDeliveries ?? 0 }} Paket
                </div>
              </div>

              <!-- Aktif Kurye -->
              <div class="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                  <Bike class="w-3 h-3 text-sky-500" />
                  Kuryeler
                </div>
                <div class="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {{ summaryData?.summary.activeCouriersCount ?? 0 }} Aktif
                </div>
              </div>

              <!-- Mekanlar -->
              <div class="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                  <Store class="w-3 h-3 text-amber-500" />
                  Mekanlar
                </div>
                <div class="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {{ summaryData?.summary.activeVenuesWithOrders ?? 0 }} Çıkan
                </div>
              </div>

              <!-- Toplam Ciro -->
              <div class="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                  <DollarSign class="w-3 h-3 text-emerald-500" />
                  Toplam Ciro
                </div>
                <div class="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {{ (summaryData?.summary.totalRevenue ?? 0).toFixed(2) }} ₺
                </div>
              </div>
            </div>

            <!-- Uyarı: Kayıt yoksa -->
            <div
              v-if="!isLoadingPreview && summaryData && !summaryData.hasData"
              class="mt-2.5 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/60"
            >
              <AlertCircle class="w-4 h-4 shrink-0 text-amber-600" />
              <span>Bu tarihte sisteme girilmiş teslimat kaydı bulunmuyor.</span>
            </div>
          </div>

          <!-- 3. Dışa Aktarma Format Seçenekleri -->
          <div class="space-y-3">
            <div class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dışa Aktarma Formatı Seçin
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Excel Option Card -->
              <div
                class="relative group rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-800/80 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <FileSpreadsheet class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Excel (.xlsx)
                      </h3>
                      <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        2 Çalışma Sayfası
                      </span>
                    </div>
                  </div>

                  <ul class="text-[11px] text-slate-500 dark:text-slate-400 mt-3 space-y-1">
                    <li class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-3 h-3 text-emerald-500 shrink-0" />
                      Sayfa 1: Kurye Dağılım & Hakediş
                    </li>
                    <li class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-3 h-3 text-emerald-500 shrink-0" />
                      Sayfa 2: Mekan Sipariş & Ciro
                    </li>
                    <li class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-3 h-3 text-emerald-500 shrink-0" />
                      Otomatik toplam formülleri ve genişlik
                    </li>
                  </ul>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    :disabled="isExporting"
                    class="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    @click="handleExportExcel"
                  >
                    <Loader2 v-if="isExporting && exportingType === 'excel'" class="w-3.5 h-3.5 animate-spin" />
                    <Download v-else class="w-3.5 h-3.5" />
                    <span>Excel (.xlsx) İndir</span>
                  </button>
                </div>
              </div>

              <!-- PDF Option Card -->
              <div
                class="relative group rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 bg-white dark:bg-slate-800/80 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-rose-600/15 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
                      <FileText class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                        PDF Raporu (.pdf)
                      </h3>
                      <span class="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        A4 Baskı & Arşiv Formatı
                      </span>
                    </div>
                  </div>

                  <ul class="text-[11px] text-slate-500 dark:text-slate-400 mt-3 space-y-1">
                    <li class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-3 h-3 text-rose-500 shrink-0" />
                      100% Türkçe karakter font desteği
                    </li>
                    <li class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-3 h-3 text-rose-500 shrink-0" />
                      Özet KPI kartları & çift tablo
                    </li>
                    <li class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-3 h-3 text-rose-500 shrink-0" />
                      Sayfa numaralandırma & arşiv notu
                    </li>
                  </ul>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    :disabled="isExporting"
                    class="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    @click="handleExportPdf"
                  >
                    <Loader2 v-if="isExporting && exportingType === 'pdf'" class="w-3.5 h-3.5 animate-spin" />
                    <Download v-else class="w-3.5 h-3.5" />
                    <span>PDF Raporu İndir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-3.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Format: Gun_Sonu_Raporu_{{ selectedDate }}_HH-mm
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              :disabled="isExporting"
              @click="close"
            >
              Kapat
            </BaseButton>

            <BaseButton
              variant="primary"
              size="sm"
              :disabled="isExporting"
              class="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              @click="handleExportBoth"
            >
              <template #leading>
                <Download class="w-3.5 h-3.5" />
              </template>
              Hepsini İndir (Excel & PDF)
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
