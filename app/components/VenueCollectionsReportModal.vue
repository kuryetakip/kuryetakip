<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X,
  Receipt,
  Calendar,
  Wallet,
  Building2,
  Banknote,
  CreditCard,
  Layers,
  Search,
  Filter,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  CheckCircle2,
  Store
} from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

interface Props {
  modelValue: boolean
  initialVenueId?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialVenueId: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const toast = useToast()
const loading = ref(false)
const isExporting = ref(false)

// Data state
const reportData = ref<{
  summary: {
    grandTotalCollected: number
    grandTotalCash: number
    grandTotalTransfer: number
    totalCarriedDebt: number
    venueCount: number
    settlementCount: number
  }
  weeks: Array<{
    weekCode: string
    weekLabel: string
    startDate: string
    endDate: string
    totalCollectedAmount: number
    totalPackages: number
    indoorPackages: number
    outdoorPackages: number
    venueCount: number
    venues: Array<{
      venueId: string
      venueName: string
      collectedAmount: number
      totalPackages: number
      indoorPackages: number
      outdoorPackages: number
      settledDates: string[]
      lastSettledAt: string | null
    }>
  }>
  settlements: Array<{
    id: string
    venueId: string
    venueName: string
    settledAt: string
    weekCode: string
    collectedAmount: number
    totalPackages: number
    indoorPackages: number
    outdoorPackages: number
    datesCount: number
    dates: string[]
    paymentMethod: string
    notes?: string
  }>
  venues: Array<{
    id: string
    name: string
    totalCollectedAmount: number
    carriedBalance: number
    lastSettledAt: string | null
    lastSettledAmount: number | null
    lastPaymentMethod: string | null
  }>
} | null>(null)

// Filters
const activeTab = ref<'weekly' | 'transactions'>('weekly')
const selectedVenueId = ref(props.initialVenueId || '')
const selectedWeek = ref('')
const searchVenue = ref('')
const expandedWeeks = ref<Record<string, boolean>>({})

const toggleWeekExpand = (weekCode: string) => {
  expandedWeeks.value[weekCode] = !expandedWeeks.value[weekCode]
}

const fetchReport = async () => {
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (selectedVenueId.value) query.venueId = selectedVenueId.value
    if (selectedWeek.value) query.week = selectedWeek.value
    if (searchVenue.value.trim()) query.search = searchVenue.value.trim()

    const res = await $fetch<{ success: boolean; data?: any; summary?: any; weeks?: any; settlements?: any; venues?: any }>('/api/venues/collections-report', {
      query
    })

    if (res) {
      reportData.value = {
        summary: res.summary || {
          grandTotalCollected: 0,
          grandTotalCash: 0,
          grandTotalTransfer: 0,
          totalCarriedDebt: 0,
          venueCount: 0,
          settlementCount: 0
        },
        weeks: res.weeks || [],
        settlements: res.settlements || [],
        venues: res.venues || []
      }

      // Auto expand the first week
      if (res.weeks && res.weeks.length > 0 && Object.keys(expandedWeeks.value).length === 0) {
        expandedWeeks.value[res.weeks[0].weekCode] = true
      }
    }
  } catch (err: any) {
    console.error('Fetch collections report error:', err)
    toast.error('Mekan tahsilat raporu yüklenemedi.', 'Hata')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.initialVenueId) {
        selectedVenueId.value = props.initialVenueId
      }
      fetchReport()
    }
  }
)

const close = () => {
  emit('update:modelValue', false)
}

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

const formatDateShort = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return dateStr
}

// Print Handler
const handlePrint = () => {
  window.print()
}

// Export Excel Handler
const handleExportExcel = async () => {
  if (!reportData.value) return
  isExporting.value = true
  try {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'KuryeTakip'
    workbook.created = new Date()

    // 1. Haftalık Özet Sayfası
    const sheet1 = workbook.addWorksheet('Haftalık Tahsilat Özeti')
    sheet1.views = [{ showGridLines: true }]

    sheet1.columns = [
      { header: 'Hafta', key: 'week', width: 22 },
      { header: 'Tarih Aralığı', key: 'dateRange', width: 26 },
      { header: 'Mekan Adı', key: 'venueName', width: 26 },
      { header: 'Toplam Paket', key: 'packages', width: 16 },
      { header: 'İç Paket', key: 'indoor', width: 14 },
      { header: 'Dış Paket', key: 'outdoor', width: 14 },
      { header: 'Tahsil Edilen Tutar (₺)', key: 'amount', width: 22 },
      { header: 'Son Tahsilat Tarihi', key: 'settledAt', width: 22 }
    ]

    // Style header row
    const headerRow = sheet1.getRow(1)
    headerRow.height = 26
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate 900
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    let rowIndex = 2
    for (const week of reportData.value.weeks) {
      for (const v of week.venues) {
        const row = sheet1.getRow(rowIndex++)
        row.getCell(1).value = week.weekCode
        row.getCell(2).value = week.weekLabel
        row.getCell(3).value = v.venueName
        row.getCell(4).value = v.totalPackages
        row.getCell(5).value = v.indoorPackages
        row.getCell(6).value = v.outdoorPackages
        row.getCell(7).value = v.collectedAmount
        row.getCell(8).value = formatDateTime(v.lastSettledAt)

        row.getCell(4).alignment = { horizontal: 'right' }
        row.getCell(5).alignment = { horizontal: 'right' }
        row.getCell(6).alignment = { horizontal: 'right' }
        row.getCell(7).alignment = { horizontal: 'right' }
        row.getCell(7).numFmt = '#,##0.00 ₺'
      }
    }

    // 2. Tekil Tahsilat Kayıtları Sayfası
    const sheet2 = workbook.addWorksheet('Tahsilat İşlem Kayıtları')
    sheet2.columns = [
      { header: 'Tahsilat Tarihi & Saati', key: 'date', width: 24 },
      { header: 'Hafta', key: 'week', width: 16 },
      { header: 'Mekan Adı', key: 'venueName', width: 26 },
      { header: 'Tahsil Edilen Tutar (₺)', key: 'amount', width: 22 },
      { header: 'Ödeme Şekli', key: 'method', width: 16 },
      { header: 'Kapsanan Paket', key: 'packages', width: 16 },
      { header: 'Not / Açıklama', key: 'notes', width: 32 }
    ]

    const headerRow2 = sheet2.getRow(1)
    headerRow2.height = 26
    headerRow2.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF065F46' } // Emerald 800
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    let rowIdx2 = 2
    for (const s of reportData.value.settlements) {
      const row = sheet2.getRow(rowIdx2++)
      row.getCell(1).value = formatDateTime(s.settledAt)
      row.getCell(2).value = s.weekCode
      row.getCell(3).value = s.venueName
      row.getCell(4).value = s.collectedAmount
      row.getCell(5).value = s.paymentMethod === 'TRANSFER' ? 'Havale/EFT' : s.paymentMethod === 'SPLIT' ? 'Karma' : 'Nakit'
      row.getCell(6).value = s.totalPackages
      row.getCell(7).value = s.notes || '—'

      row.getCell(4).alignment = { horizontal: 'right' }
      row.getCell(4).numFmt = '#,##0.00 ₺'
      row.getCell(6).alignment = { horizontal: 'right' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Mekan_Tahsilat_Raporu_${new Date().toISOString().substring(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Mekan tahsilat raporu başarıyla Excel olarak indirildi.', 'Excel İndirildi')
  } catch (err: any) {
    console.error('Export excel error:', err)
    toast.error('Excel oluşturulurken bir hata oluştu.', 'Hata')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-all"
    @click.self="close"
  >
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden transition-all duration-200"
    >
      <!-- Modal Header -->
      <div class="px-5 sm:px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Receipt class="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Mekan Tahsilat Raporu & Geçmişi</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Resmi Kayıtlar
              </span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Restoranlardan tahsil edilen tutarların, nakit/havale dağılımlarının ve haftalık kapanış dökümü.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Quick Metrics Bar (Fintech Bento Cards) -->
      <div class="px-5 sm:px-6 py-4 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- 1. Toplam Tahsilat -->
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Toplam Tahsil Edilen
          </span>
          <span class="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
            {{ (reportData?.summary.grandTotalCollected || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </span>
        </div>

        <!-- 2. Nakit Tahsilat -->
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Banknote class="w-3 h-3 text-emerald-600" />
            <span>Nakit Tahsilat</span>
          </span>
          <span class="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
            {{ (reportData?.summary.grandTotalCash || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
          </span>
        </div>

        <!-- 3. Havale / EFT -->
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <CreditCard class="w-3 h-3 text-sky-600" />
            <span>Havale / EFT</span>
          </span>
          <span class="text-base sm:text-lg font-mono font-black text-sky-600 dark:text-sky-400">
            {{ (reportData?.summary.grandTotalTransfer || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
          </span>
        </div>

        <!-- 4. Tahsilat Yapılan Mekanlar -->
        <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span class="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Kayıtlı Mekan
          </span>
          <span class="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-slate-100">
            {{ reportData?.summary.venueCount || 0 }} Mekan
          </span>
        </div>
      </div>

      <!-- Filter Controls & Tab Switcher -->
      <div class="px-5 sm:px-6 py-3 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
        <!-- Tab Buttons -->
        <div class="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
          <button
            type="button"
            :class="[
              'px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5',
              activeTab === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            ]"
            @click="activeTab = 'weekly'"
          >
            <Calendar class="w-3.5 h-3.5" />
            <span>Haftalık Döküm ({{ reportData?.weeks.length || 0 }} Hafta)</span>
          </button>
          <button
            type="button"
            :class="[
              'px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5',
              activeTab === 'transactions'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            ]"
            @click="activeTab = 'transactions'"
          >
            <Receipt class="w-3.5 h-3.5" />
            <span>Tekil Tahsilat Kayıtları ({{ reportData?.settlements.length || 0 }})</span>
          </button>
        </div>

        <!-- Filter Dropdowns -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Mekan Filtresi -->
          <select
            v-model="selectedVenueId"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            @change="fetchReport"
          >
            <option value="">Tüm Mekanlar</option>
            <option v-for="v in reportData?.venues" :key="v.id" :value="v.id">
              {{ v.name }}
            </option>
          </select>

          <!-- Hafta Filtresi -->
          <select
            v-model="selectedWeek"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            @change="fetchReport"
          >
            <option value="">Tüm Haftalar</option>
            <option v-for="w in reportData?.weeks" :key="w.weekCode" :value="w.weekCode">
              {{ w.weekLabel }}
            </option>
          </select>

          <!-- Arama -->
          <div class="relative">
            <input
              v-model="searchVenue"
              type="text"
              placeholder="Mekan ara..."
              class="pl-7 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              @input="fetchReport"
            />
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <!-- Main Body Area -->
      <div class="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
        <!-- Loading State -->
        <div v-if="loading" class="py-12 text-center">
          <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-xs font-medium text-slate-400">Tahsilat raporu ve kayıtlar yükleniyor...</p>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="activeTab === 'weekly' ? (!reportData?.weeks || reportData.weeks.length === 0) : (!reportData?.settlements || reportData.settlements.length === 0)"
          class="py-12 text-center bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"
        >
          <Receipt class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5 stroke-[1.5]" />
          <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Henüz Kayıtlı Bir Tahsilat Bulunmuyor</p>
          <p class="text-xs text-slate-400 mt-1">
            Mekanlar sayfasından "Tahsilat Al" işlemi gerçekleştirdiğinizde tüm tahsilatlar haftalık ve kronolojik olarak burada kayıt altına alınır.
          </p>
        </div>

        <!-- 1. TAB: HAFTALIK DÖKÜM KARTLARI -->
        <div v-else-if="activeTab === 'weekly'" class="space-y-4">
          <div
            v-for="week in reportData?.weeks"
            :key="week.weekCode"
            class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all duration-200"
          >
            <!-- Hafta Başlık Kartı -->
            <div
              class="p-4 sm:p-4.5 bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
              @click="toggleWeekExpand(week.weekCode)"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-xs">
                  {{ week.weekCode.split('-W')[1] || 'HF' }}
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{{ week.weekLabel }}</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {{ week.venues.length }} Mekan
                    </span>
                  </h4>
                  <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    Toplam {{ week.totalPackages }} Paket (İç: {{ week.indoorPackages }} · Dış: {{ week.outdoorPackages }})
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-[10px] text-slate-400 block font-medium">Haftalık Tahsilat</span>
                  <span class="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {{ week.totalCollectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                  </span>
                </div>
                <div class="p-1 rounded-lg text-slate-400">
                  <ChevronUp v-if="expandedWeeks[week.weekCode]" class="w-5 h-5" />
                  <ChevronDown v-else class="w-5 h-5" />
                </div>
              </div>
            </div>

            <!-- Hafta Mekan Tablosu -->
            <div v-show="expandedWeeks[week.weekCode]" class="p-0 overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-100/60 dark:bg-slate-850/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th class="px-4 py-2.5">Mekan Adı</th>
                    <th class="px-4 py-2.5 text-right">Teslim Edilen Paket</th>
                    <th class="px-4 py-2.5 text-center">İç / Dış Dağılımı</th>
                    <th class="px-4 py-2.5 text-right">Tahsil Edilen Tutar</th>
                    <th class="px-4 py-2.5 text-right">İşlem Zamanı</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                  <tr
                    v-for="v in week.venues"
                    :key="v.venueId"
                    class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Store class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{{ v.venueName }}</span>
                    </td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {{ v.totalPackages }} Paket
                    </td>
                    <td class="px-4 py-3 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <span class="text-emerald-600 font-semibold">İç: {{ v.indoorPackages }}</span>
                      <span class="mx-1 text-slate-300">·</span>
                      <span class="text-sky-600 font-semibold">Dış: {{ v.outdoorPackages }}</span>
                    </td>
                    <td class="px-4 py-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {{ v.collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                    </td>
                    <td class="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                      {{ formatDateTime(v.lastSettledAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2. TAB: TEKİL KRONOLOJİK TAHSİLAT LİSTESİ -->
        <div v-else-if="activeTab === 'transactions'" class="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100/80 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th class="px-4 py-3">Tarih & Saat</th>
                <th class="px-4 py-3">Mekan</th>
                <th class="px-4 py-3 text-center">Ödeme Şekli</th>
                <th class="px-4 py-3 text-right">Paket Sayısı</th>
                <th class="px-4 py-3 text-right">Tahsil Edilen Tutar</th>
                <th class="px-4 py-3">Not / Açıklama</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="s in reportData?.settlements"
                :key="s.id"
                class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {{ formatDateTime(s.settledAt) }}
                </td>
                <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Store class="w-3.5 h-3.5 text-emerald-600" />
                  <span>{{ s.venueName }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    v-if="s.paymentMethod === 'TRANSFER'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-200 dark:border-sky-800"
                  >
                    <CreditCard class="w-3 h-3 text-sky-600" />
                    Havale
                  </span>
                  <span
                    v-else-if="s.paymentMethod === 'SPLIT'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800"
                  >
                    <Layers class="w-3 h-3 text-indigo-600" />
                    Karma
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800"
                  >
                    <Banknote class="w-3 h-3 text-emerald-600" />
                    Nakit
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  {{ s.totalPackages }} Paket
                </td>
                <td class="px-4 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {{ s.collectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </td>
                <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[200px]" :title="s.notes">
                  {{ s.notes || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Bar with Export & Print Actions -->
      <div class="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
        <BaseButton
          variant="outline"
          size="sm"
          type="button"
          @click="close"
        >
          Kapat
        </BaseButton>

        <div class="flex items-center gap-2">
          <!-- Print Button -->
          <BaseButton
            variant="outline"
            size="sm"
            class="text-slate-700 dark:text-slate-300"
            @click="handlePrint"
          >
            <template #leading>
              <Printer class="w-4 h-4" />
            </template>
            Yazdır
          </BaseButton>

          <!-- Excel Export Button -->
          <BaseButton
            variant="primary"
            size="sm"
            class="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold"
            :loading="isExporting"
            @click="handleExportExcel"
          >
            <template #leading>
              <Download class="w-4 h-4" />
            </template>
            Excel Olarak İndir
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
