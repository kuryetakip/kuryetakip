<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  TrendingUp,
  Calendar,
  Search,
  Filter,
  DollarSign,
  Receipt,
  Store,
  RefreshCw,
  Wallet,
  MessageSquare,
  Eye,
  Phone,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  Check,
  ChevronRight,
  Clock,
  RotateCcw
} from 'lucide-vue-next'
import { useVenues, type VenueItem } from '~/composables/useVenues'
import {
  getBusinessDateStr,
  getBusinessThisWeekMonday,
  getBusinessLastWeekMonday,
  formatToDisplayDate
} from '~/utils/date'
import VenueWhatsAppShareModal from '~/components/VenueWhatsAppShareModal.vue'
import { useToast } from '~/composables/useToast'

useHead({
  title: 'Mekanlar — Haftalık Alınacak & Verilecek Hakediş — KuryeTakip'
})

const toast = useToast()
const { venues, loading, fetchVenues, settleVenue } = useVenues()

// View Mode (Table / Cards)
const viewMode = ref<'table' | 'cards'>('table')

// Period Filter State
type PeriodType = 'thisWeek' | 'lastWeek' | 'pending' | 'custom'
const selectedPeriod = ref<PeriodType>('thisWeek')
const customStartDate = ref('')
const customEndDate = ref('')
const searchQuery = ref('')
const statusFilter = ref<'all' | 'withBalance' | 'settled'>('all')

// WhatsApp Modal State
const isWhatsAppModalOpen = ref(false)
const selectedVenueForWhatsApp = ref<VenueItem | null>(null)

const openWhatsAppModal = (venue: VenueItem) => {
  selectedVenueForWhatsApp.value = venue
  isWhatsAppModalOpen.value = true
}

// Settle / Collection Modal State
const isSettleModalOpen = ref(false)
const venueToSettle = ref<VenueItem | null>(null)
const settleCollectedAmount = ref<number | string>('')
const settleRemainingAmount = ref<number | string>(0)
const settlePaymentMethod = ref<'CASH' | 'TRANSFER' | 'SPLIT'>('CASH')
const settleCashAmount = ref<number | string>('')
const settleTransferAmount = ref<number | string>('')
const settleNote = ref('')
const settlingVenue = ref(false)

const openSettleModal = (venue: VenueItem) => {
  venueToSettle.value = venue
  const total = Number(venue.totalAmount || 0)
  settleCollectedAmount.value = total > 0 ? total : 0
  settleRemainingAmount.value = 0
  settlePaymentMethod.value = 'CASH'
  settleCashAmount.value = total > 0 ? total : ''
  settleTransferAmount.value = ''
  settleNote.value = ''
  isSettleModalOpen.value = true
}

const onCollectedAmountInput = (val: string) => {
  const clean = val.trim().replace(',', '.')
  const num = parseFloat(clean)
  if (!isNaN(num) && venueToSettle.value) {
    const total = Number(venueToSettle.value.totalAmount || 0)
    settleRemainingAmount.value = Math.max(0, Number((total - num).toFixed(2)))
    if (settlePaymentMethod.value === 'CASH') {
      settleCashAmount.value = num
      settleTransferAmount.value = ''
    } else if (settlePaymentMethod.value === 'TRANSFER') {
      settleTransferAmount.value = num
      settleCashAmount.value = ''
    }
  }
}

const handleConfirmSettle = async () => {
  if (!venueToSettle.value) return
  settlingVenue.value = true
  try {
    const colNum = typeof settleCollectedAmount.value === 'number'
      ? settleCollectedAmount.value
      : parseFloat(String(settleCollectedAmount.value).trim().replace(',', '.')) || 0
    const remNum = typeof settleRemainingAmount.value === 'number'
      ? settleRemainingAmount.value
      : parseFloat(String(settleRemainingAmount.value).trim().replace(',', '.')) || 0

    let finalCash = 0
    let finalTransfer = 0
    if (settlePaymentMethod.value === 'CASH') {
      finalCash = colNum
    } else if (settlePaymentMethod.value === 'TRANSFER') {
      finalTransfer = colNum
    } else {
      finalCash = parseFloat(String(settleCashAmount.value).trim().replace(',', '.')) || 0
      finalTransfer = parseFloat(String(settleTransferAmount.value).trim().replace(',', '.')) || 0
    }

    const ok = await settleVenue(venueToSettle.value.id, {
      collectedAmount: colNum,
      remainingBalance: remNum,
      paymentMethod: settlePaymentMethod.value,
      cashAmount: finalCash,
      transferAmount: finalTransfer,
      notes: settleNote.value
    })

    if (ok) {
      isSettleModalOpen.value = false
      venueToSettle.value = null
      await loadData()
    }
  } finally {
    settlingVenue.value = false
  }
}

// Detail Breakdown Modal State
const isDetailModalOpen = ref(false)
const detailVenue = ref<VenueItem | null>(null)

const openDetailModal = (venue: VenueItem) => {
  detailVenue.value = venue
  isDetailModalOpen.value = true
}

// Compute active date range based on selectedPeriod
const activeDateRange = computed(() => {
  const todayStr = getBusinessDateStr()
  const thisMondayStr = getBusinessThisWeekMonday()
  const lastMondayStr = getBusinessLastWeekMonday()

  if (selectedPeriod.value === 'thisWeek') {
    // Current operational week: Monday to today/Sunday
    const [y, m, d] = thisMondayStr.split('-').map(Number)
    const monday = new Date(Date.UTC(y, m - 1, d))
    const sunday = new Date(monday.getTime() + 6 * 86400000)
    const toDateStr = (dt: Date) => {
      const yStr = dt.getUTCFullYear()
      const mStr = String(dt.getUTCMonth() + 1).padStart(2, '0')
      const dayStr = String(dt.getUTCDate()).padStart(2, '0')
      return `${yStr}-${mStr}-${dayStr}`
    }
    return {
      start: thisMondayStr,
      end: toDateStr(sunday),
      label: `Bu Hafta (${formatToDisplayDate(thisMondayStr)} - ${formatToDisplayDate(toDateStr(sunday))})`
    }
  } else if (selectedPeriod.value === 'lastWeek') {
    // Last operational week: last Monday to this Monday minus 1 day
    const [y, m, d] = lastMondayStr.split('-').map(Number)
    const monday = new Date(Date.UTC(y, m - 1, d))
    const sunday = new Date(monday.getTime() + 6 * 86400000)
    const toDateStr = (dt: Date) => {
      const yStr = dt.getUTCFullYear()
      const mStr = String(dt.getUTCMonth() + 1).padStart(2, '0')
      const dayStr = String(dt.getUTCDate()).padStart(2, '0')
      return `${yStr}-${mStr}-${dayStr}`
    }
    return {
      start: lastMondayStr,
      end: toDateStr(sunday),
      label: `Geçen Hafta (${formatToDisplayDate(lastMondayStr)} - ${formatToDisplayDate(toDateStr(sunday))})`
    }
  } else if (selectedPeriod.value === 'custom') {
    return {
      start: customStartDate.value || thisMondayStr,
      end: customEndDate.value || todayStr,
      label: `Özel Dönem (${formatToDisplayDate(customStartDate.value || thisMondayStr)} - ${formatToDisplayDate(customEndDate.value || todayStr)})`
    }
  } else {
    // Pending (All unsettled balances)
    return {
      start: '',
      end: '',
      label: 'Tahsilat Bekleyen Tüm Bakiye ve Paketler'
    }
  }
})

// Load data based on selected filter
const loadData = async () => {
  const range = activeDateRange.value
  const query: Record<string, string> = {}

  if (selectedPeriod.value === 'pending') {
    query.scope = 'pending'
  } else if (range.start && range.end) {
    query.startDate = range.start
    query.endDate = range.end
  }

  try {
    const res = await $fetch<{ success: boolean; data: VenueItem[] }>('/api/venues', {
      query
    })
    if (res.success && res.data) {
      venues.value = res.data
    }
  } catch (err: any) {
    console.error('Load venues hakediş error:', err)
    toast.error('Hakediş verileri alınamadı.', 'Hata')
  }
}

// Watch period changes
watch(selectedPeriod, () => {
  loadData()
})

onMounted(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    viewMode.value = 'cards'
  }
  loadData()
})

// Filtered venues list based on search and status
const filteredVenues = computed(() => {
  let list = venues.value || []

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(v => v.name.toLowerCase().includes(q) || (v.phone && v.phone.includes(q)))
  }

  // Status filter
  if (statusFilter.value === 'withBalance') {
    list = list.filter(v => (v.totalAmount || 0) > 0 || (v.pendingAmount || 0) > 0)
  } else if (statusFilter.value === 'settled') {
    list = list.filter(v => (v.totalAmount || 0) <= 0 && (v.pendingAmount || 0) <= 0)
  }

  return list
})

// KPI Calculations
const totalVenuesCount = computed(() => filteredVenues.value.length)
const totalPackagesCount = computed(() => {
  return filteredVenues.value.reduce((sum, v) => sum + (v.totalPackageCount || 0), 0)
})
const totalIndoorPackages = computed(() => {
  return filteredVenues.value.reduce((sum, v) => sum + (v.indoorPackageCount || 0), 0)
})
const totalOutdoorPackages = computed(() => {
  return filteredVenues.value.reduce((sum, v) => sum + (v.outdoorPackageCount || 0), 0)
})

// Financial Totals
const totalReceivableAmount = computed(() => {
  // Mekanlardan Alınacak Toplam Tutar
  return filteredVenues.value.reduce((sum, v) => sum + (v.totalAmount || 0), 0)
})
const totalPayableCourierAmount = computed(() => {
  // Kuryelere Verilecek Toplam Hakediş
  return filteredVenues.value.reduce((sum, v) => sum + (v.courierAmount || 0), 0)
})
const totalNetProfitAmount = computed(() => {
  // Net İşletme Kârı / Fark
  return Number((totalReceivableAmount.value - totalPayableCourierAmount.value).toFixed(2))
})
const totalCollectedAmount = computed(() => {
  // Mekanlardan bugüne kadar tahsil edilen toplam tutar
  return filteredVenues.value.reduce((sum, v) => sum + (v.totalCollectedAmount || 0), 0)
})
const totalPendingBalance = computed(() => {
  // Kalan Alınacak Bakiye
  return filteredVenues.value.reduce((sum, v) => sum + (v.pendingAmount !== undefined ? v.pendingAmount : (v.totalAmount || 0)), 0)
})

// Columns for BaseTable
const columns = [
  { key: 'venue', label: 'Mekan Bilgisi', align: 'left' as const },
  { key: 'packages', label: 'Paketler (İç / Dış)', align: 'center' as const },
  { key: 'receivable', label: 'Mekandan Alınacak (₺)', align: 'right' as const },
  { key: 'payable', label: 'Kuryeye Verilecek (₺)', align: 'right' as const },
  { key: 'netProfit', label: 'Net Kâr (₺)', align: 'right' as const },
  { key: 'remaining', label: 'Kalan Bakiye (₺)', align: 'right' as const }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/90 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200/80 dark:border-emerald-800/60 font-mono">
            <TrendingUp class="w-3.5 h-3.5" />
            MEKAN HAKEDİŞ & MUTABAKAT
          </span>
          <span class="text-xs text-slate-400">|</span>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
            {{ activeDateRange.label }}
          </span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2.5">
          <span>Haftalık Alınacak & Verilecek Hakediş</span>
          <span class="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {{ totalVenuesCount }} Mekan
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Mekanlardan haftalık paket bazında hesaplanan alınacak tutarlar, kuryelere verilecek hakedişler ve net kasa kazancı.
        </p>
      </div>

      <div class="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <!-- View Mode Switcher -->
        <div class="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
          <button
            type="button"
            :class="[
              'p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'
            ]"
            title="Tablo Görünümü"
            @click="viewMode = 'table'"
          >
            <TableIcon class="w-4 h-4" />
            <span class="hidden md:inline">Tablo</span>
          </button>
          <button
            type="button"
            :class="[
              'p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'
            ]"
            title="Kart Görünümü"
            @click="viewMode = 'cards'"
          >
            <LayoutGrid class="w-4 h-4" />
            <span class="hidden md:inline">Kartlar</span>
          </button>
        </div>

        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          @click="loadData"
        >
          <RefreshCw :class="['w-3.5 h-3.5 text-slate-500', loading ? 'animate-spin' : '']" />
          <span>Yenile</span>
        </button>
      </div>
    </div>

    <!-- Summary KPI Cards (Fintech-Grade Financial Overview) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <!-- 1. Mekanlardan Alınacak Toplam Tutar -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between border-l-4 border-l-emerald-500">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mekanlardan Alınacak
            </span>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft class="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {{ totalReceivableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Toplam {{ totalPackagesCount }} Paket</span>
          <span class="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">Hakediş Tutarı</span>
        </div>
      </div>

      <!-- 2. Kuryelere Verilecek Toplam Hakediş -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between border-l-4 border-l-sky-500">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kuryelere Verilecek
            </span>
            <div class="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ArrowUpRight class="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div class="text-2xl font-black font-mono text-sky-600 dark:text-sky-400 mt-2">
            {{ totalPayableCourierAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Kurye Hakediş Payı</span>
          <span class="font-mono text-sky-700 dark:text-sky-300 font-semibold">Ödenecek Tutar</span>
        </div>
      </div>

      <!-- 3. Net Kâr / Kasa Farkı (Alınacak - Verilecek) -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-850 dark:from-slate-850 dark:to-slate-900 text-white rounded-2xl border border-slate-800 p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-teal-400">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
              Net Kâr (Kasa Farkı)
            </span>
            <div class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <TrendingUp class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-black font-mono text-teal-300 mt-2">
            {{ totalNetProfitAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span>(Alınacak - Verilecek)</span>
          <span class="font-mono text-teal-200 font-bold">
            %{{ totalReceivableAmount > 0 ? ((totalNetProfitAmount / totalReceivableAmount) * 100).toFixed(1) : '0' }} Marj
          </span>
        </div>
      </div>

      <!-- 4. Kalan Alınacak Bakiye (Bekleyen Tahsilat) -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between border-l-4 border-l-amber-500">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kalan Alınacak Bakiye
            </span>
            <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Wallet class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {{ totalPendingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Tahsilat Bekleyen</span>
          <span class="font-mono text-amber-700 dark:text-amber-300 font-semibold">Açık Hesap</span>
        </div>
      </div>
    </div>

    <!-- Filters & Period Bar -->
    <div class="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <!-- Period Switcher Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0 flex items-center gap-1">
            <Calendar class="w-3.5 h-3.5 text-slate-400" />
            <span>Dönem:</span>
          </span>

          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              selectedPeriod === 'thisWeek'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="selectedPeriod = 'thisWeek'"
          >
            Bu Hafta (Aktif)
          </button>

          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              selectedPeriod === 'lastWeek'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="selectedPeriod = 'lastWeek'"
          >
            Geçen Hafta
          </button>

          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              selectedPeriod === 'pending'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="selectedPeriod = 'pending'"
          >
            Tüm Bekleyenler
          </button>

          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              selectedPeriod === 'custom'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="selectedPeriod = 'custom'"
          >
            Özel Tarih
          </button>
        </div>

        <!-- Search & Status Filter -->
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div class="relative w-full sm:w-64">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Mekan ara..."
              class="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-8 pr-3 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            v-model="statusFilter"
            class="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Tüm Mekanlar</option>
            <option value="withBalance">Borcu Olanlar</option>
            <option value="settled">Bakiyesi Sıfır Olanlar</option>
          </select>
        </div>
      </div>

      <!-- Custom Date Inputs (if selectedPeriod === 'custom') -->
      <div v-if="selectedPeriod === 'custom'" class="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap text-xs">
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Başlangıç:</span>
          <input
            v-model="customStartDate"
            type="date"
            class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
          />
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Bitiş:</span>
          <input
            v-model="customEndDate"
            type="date"
            class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
          @click="loadData"
        >
          Filtrele
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && filteredVenues.length === 0"
      class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-12 text-center"
    >
      <Store class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
        Bu dönem için mekan kaydı bulunamadı
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        Seçilen periyotta herhangi bir paket veya hakediş hareketi bulunmuyor. Farklı bir dönem seçebilirsiniz.
      </p>
    </div>

    <!-- Main Content: Desktop Table / Responsive Cards -->
    <div v-else>
      <!-- 1. DESKTOP MODERN TABLE VIEW -->
      <div v-if="viewMode === 'table'">
        <BaseTable :columns="columns" :loading="loading">
          <template #default>
            <tr
              v-for="v in filteredVenues"
              :key="v.id"
              :class="[
                'group hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/80',
                !v.isActive ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-75' : ''
              ]"
            >
              <!-- 1. Mekan Bilgisi -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 font-medium text-slate-900 dark:text-slate-100">
                <div class="flex items-center gap-2.5">
                  <div class="relative shrink-0">
                    <div
                      :class="[
                        'w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition-all',
                        v.isActive
                          ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-slate-700 dark:to-slate-800 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      ]"
                    >
                      <Store class="w-4 h-4" />
                    </div>
                    <span
                      :class="[
                        'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900',
                        v.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      ]"
                      :title="v.isActive ? 'Aktif Mekan' : 'Pasif Mekan'"
                    />
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        class="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-xs sm:text-sm truncate block text-left cursor-pointer"
                        @click="openDetailModal(v)"
                      >
                        {{ v.name }}
                      </button>
                      <span
                        v-if="!v.isActive"
                        class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      >
                        Pasif
                      </span>
                    </div>

                    <div class="flex items-center gap-1.5 mt-0.5 text-[10px]">
                      <a
                        v-if="v.phone"
                        :href="'tel:' + v.phone"
                        class="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                        title="Aramak için tıklayın"
                      >
                        <Phone class="w-2.5 h-2.5 text-slate-400" />
                        <span>{{ v.phone }}</span>
                      </a>
                      <button
                        v-if="v.phone"
                        type="button"
                        class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                        title="WhatsApp üzerinden aç"
                        @click="openWhatsAppModal(v)"
                      >
                        <MessageSquare class="w-2.5 h-2.5" />
                      </button>
                      <span v-else class="text-slate-400 italic">Telefon yok</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 2. Paketler (İç / Dış / Toplam) -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 text-center">
                <div class="inline-flex flex-col items-center gap-0.5">
                  <div class="flex items-center gap-1 font-mono font-bold text-[11px]">
                    <span
                      class="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70"
                      :title="'İç Mekan: ' + (v.indoorPackageCount || 0) + ' Pkt (' + (v.indoorAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺)'"
                    >
                      {{ v.indoorPackageCount || 0 }} İç
                    </span>
                    <span class="text-slate-300">·</span>
                    <span
                      class="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/70"
                      :title="'Dış Mekan: ' + (v.outdoorPackageCount || 0) + ' Pkt (' + (v.outdoorAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺)'"
                    >
                      {{ v.outdoorPackageCount || 0 }} Dış
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-500 font-semibold font-mono mt-0.5">
                    Toplam: {{ v.totalPackageCount || 0 }} Pkt
                  </span>
                </div>
              </td>

              <!-- 3. Mekandan Alınacak Tutar (₺) -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 text-right font-mono">
                <div class="inline-flex flex-col items-end">
                  <div class="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {{ (v.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                  </div>
                  <span
                    v-if="v.carriedBalance && v.carriedBalance > 0"
                    class="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold text-[9px] border border-amber-200/70 mt-0.5"
                    title="Önceki Tahsilattan Devreden Tutar Dahildir"
                  >
                    +{{ v.carriedBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺ Devir
                  </span>
                </div>
              </td>

              <!-- 4. Kuryeye Verilecek Hakediş (₺) -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 text-right font-mono">
                <div class="text-xs sm:text-sm font-extrabold text-sky-600 dark:text-sky-400">
                  {{ (v.courierAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </div>
                <span class="text-[9.5px] text-slate-400 block mt-0.5">Kurye Payı</span>
              </td>

              <!-- 5. Net Kâr / Kasa Farkı (₺) -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 text-right font-mono">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black shadow-2xs"
                  :class="(v.netProfit || 0) >= 0 ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'"
                >
                  {{ (v.netProfit || 0) >= 0 ? '+' : '' }}{{ (v.netProfit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
              </td>

              <!-- 6. Kalan Bakiye (₺) -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 text-right font-mono">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-black border shadow-2xs"
                  :class="(v.pendingAmount !== undefined ? v.pendingAmount : (v.totalAmount || 0)) > 0 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'"
                >
                  {{ (v.pendingAmount !== undefined ? v.pendingAmount : (v.totalAmount || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
              </td>

              <!-- 7. İşlemler -->
              <td class="px-2.5 py-3 sm:px-3 sm:py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                  <!-- WhatsApp ile Rapor Gönder (1-Tık) -->
                  <button
                    type="button"
                    class="p-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 hover:shadow-2xs transition-all cursor-pointer"
                    title="Mekana WhatsApp Hakediş Raporu Gönder"
                    @click="openWhatsAppModal(v)"
                  >
                    <MessageSquare class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </button>

                  <!-- Tahsilat Al / Sıfırla (Wallet) -->
                  <button
                    type="button"
                    class="p-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 hover:shadow-2xs transition-all cursor-pointer"
                    title="Mekandan Tahsilat Al / Hakedişi Sıfırla"
                    @click="openSettleModal(v)"
                  >
                    <Wallet class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </button>

                  <!-- Detay (Eye) -->
                  <button
                    type="button"
                    class="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    title="Paket Dökümü ve Geçmiş"
                    @click="openDetailModal(v)"
                  >
                    <Eye class="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </td>
            </tr>
          </template>

          <template #actions>
            <span class="sr-only">İşlemler</span>
          </template>

          <template #footer>
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium w-full">
              <span>Toplam <strong class="text-slate-900 dark:text-slate-200 font-bold">{{ filteredVenues.length }}</strong> mekan listelendi</span>
              <div class="flex flex-wrap items-center gap-3 text-xs">
                <span>Toplam Paket: <strong class="text-slate-900 dark:text-slate-200 font-mono font-bold">{{ totalPackagesCount }} Paket</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Alınacak: <strong class="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{{ totalReceivableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Verilecek: <strong class="text-sky-700 dark:text-sky-400 font-mono font-bold">{{ totalPayableCourierAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Net Kâr: <strong class="text-teal-700 dark:text-teal-400 font-mono font-bold">{{ totalNetProfitAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Kalan Bakiye: <strong class="text-amber-700 dark:text-amber-400 font-mono font-bold">{{ totalPendingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong></span>
              </div>
            </div>
          </template>
        </BaseTable>
      </div>

      <!-- 2. MOBILE & TABLET RESPONSIVE CARDS VIEW -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="v in filteredVenues"
          :key="v.id"
          class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 sm:p-5 transition-all space-y-4"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-slate-700 dark:to-slate-800 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                <Store class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <button
                  type="button"
                  class="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate text-left block cursor-pointer"
                  @click="openDetailModal(v)"
                >
                  {{ v.name }}
                </button>
                <div class="flex items-center gap-2 mt-0.5 text-xs">
                  <a
                    v-if="v.phone"
                    :href="'tel:' + v.phone"
                    class="text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-mono flex items-center gap-1 transition-colors"
                  >
                    <Phone class="w-3 h-3 text-slate-400" />
                    <span>{{ v.phone }}</span>
                  </a>
                  <span v-else class="text-slate-400 italic text-xs">Telefon yok</span>
                </div>
              </div>
            </div>

            <span
              :class="[
                'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0',
                v.isActive
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              ]"
            >
              {{ v.isActive ? 'Aktif' : 'Pasif' }}
            </span>
          </div>

          <!-- 3-Column Stats Grid -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-xl p-2">
              <span class="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block uppercase">İç Mekan</span>
              <div class="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-200 mt-0.5">
                {{ v.indoorPackageCount || 0 }} <span class="text-xs font-normal">Pkt</span>
              </div>
              <div class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {{ (v.indoorAmount || 0).toFixed(0) }} ₺
              </div>
            </div>

            <div class="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 rounded-xl p-2">
              <span class="text-[10px] font-semibold text-sky-800 dark:text-sky-300 block uppercase">Dış Mekan</span>
              <div class="font-mono font-bold text-sm text-sky-900 dark:text-sky-200 mt-0.5">
                {{ v.outdoorPackageCount || 0 }} <span class="text-xs font-normal">Pkt</span>
              </div>
              <div class="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                {{ (v.outdoorAmount || 0).toFixed(0) }} ₺
              </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2">
              <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block uppercase">Toplam</span>
              <div class="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                {{ v.totalPackageCount || 0 }} <span class="text-xs font-normal">Pkt</span>
              </div>
              <div class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                Paket
              </div>
            </div>
          </div>

          <!-- Financial Breakdown Box -->
          <div class="bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Mekandan Alınacak:</span>
              <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {{ (v.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
              </span>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Kuryelere Verilecek:</span>
              <span class="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                {{ (v.courierAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
              </span>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Net Kâr / Kasa Farkı:</span>
              <span class="font-mono font-extrabold text-teal-600 dark:text-teal-400 text-sm">
                +{{ (v.netProfit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
              </span>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Kalan Alınacak Bakiye:</span>
              <span class="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                {{ (v.pendingAmount !== undefined ? v.pendingAmount : (v.totalAmount || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
              </span>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors cursor-pointer"
              @click="openWhatsAppModal(v)"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
              @click="openSettleModal(v)"
            >
              <Wallet class="w-3.5 h-3.5" />
              <span>Tahsilat</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              @click="openDetailModal(v)"
            >
              <Eye class="w-3.5 h-3.5 text-slate-500" />
              <span>Döküm</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- WhatsApp Share Modal -->
    <VenueWhatsAppShareModal
      v-model="isWhatsAppModalOpen"
      :venue="selectedVenueForWhatsApp"
    />

    <!-- Settle / Tahsilat Modal -->
    <BaseModal
      v-model="isSettleModalOpen"
      title="Mekandan Tahsilat Al / Hakediş Sıfırla"
      size="md"
    >
      <div v-if="venueToSettle" class="space-y-4">
        <div class="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <div class="flex justify-between">
            <span class="text-slate-500 dark:text-slate-400">Mekan:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ venueToSettle.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500 dark:text-slate-400">Toplam Borç / Hakediş:</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {{ (venueToSettle.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
            </span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tahsil Edilen Tutar (₺)
          </label>
          <input
            :value="settleCollectedAmount"
            type="number"
            step="0.01"
            min="0"
            class="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0.00"
            @input="onCollectedAmountInput(($event.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Kalan Bakiye (Devredecek Borç) (₺)
          </label>
          <input
            v-model="settleRemainingAmount"
            type="number"
            step="0.01"
            min="0"
            class="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-amber-600 dark:text-amber-400 focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Ödeme Yöntemi
          </label>
          <div class="grid grid-cols-3 gap-2 text-xs font-medium">
            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-xl border text-center transition-all',
                settlePaymentMethod === 'CASH'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              ]"
              @click="settlePaymentMethod = 'CASH'"
            >
              Nakit
            </button>
            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-xl border text-center transition-all',
                settlePaymentMethod === 'TRANSFER'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              ]"
              @click="settlePaymentMethod = 'TRANSFER'"
            >
              Havale / EFT
            </button>
            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-xl border text-center transition-all',
                settlePaymentMethod === 'SPLIT'
                  ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              ]"
              @click="settlePaymentMethod = 'SPLIT'"
            >
              Parçalı
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Not / Açıklama
          </label>
          <input
            v-model="settleNote"
            type="text"
            placeholder="Tahsilat notu (örn: elden teslim alındı)"
            class="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <BaseButton variant="outline" size="sm" @click="isSettleModalOpen = false">
            İptal
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            :loading="settlingVenue"
            @click="handleConfirmSettle"
          >
            Tahsilatı Onayla
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Detail Breakdown Modal -->
    <BaseModal
      v-model="isDetailModalOpen"
      :title="`${detailVenue?.name || 'Mekan'} — Haftalık Paket ve Gün Dökümü`"
      size="lg"
    >
      <div v-if="detailVenue" class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div class="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span class="text-slate-500 block">Toplam Paket:</span>
            <span class="font-bold font-mono text-slate-900 dark:text-slate-100 text-sm">
              {{ detailVenue.totalPackageCount || 0 }} Adet
            </span>
          </div>
          <div class="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80">
            <span class="text-emerald-700 dark:text-emerald-400 block">Alınacak Tutar:</span>
            <span class="font-bold font-mono text-emerald-800 dark:text-emerald-300 text-sm">
              {{ (detailVenue.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
            </span>
          </div>
          <div class="bg-sky-50 dark:bg-sky-950/40 p-2.5 rounded-xl border border-sky-200/80">
            <span class="text-sky-700 dark:text-sky-400 block">Kurye Hakedişi:</span>
            <span class="font-bold font-mono text-sky-800 dark:text-sky-300 text-sm">
              {{ (detailVenue.courierAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
            </span>
          </div>
          <div class="bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200/80">
            <span class="text-teal-700 dark:text-teal-400 block">Net Kâr / Fark:</span>
            <span class="font-bold font-mono text-teal-800 dark:text-teal-300 text-sm">
              {{ (detailVenue.netProfit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
            </span>
          </div>
        </div>

        <!-- Daily Breakdown Table -->
        <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              <tr>
                <th class="px-3 py-2">Tarih</th>
                <th class="px-3 py-2 text-right">İç Mekan</th>
                <th class="px-3 py-2 text-right">Dış Mekan</th>
                <th class="px-3 py-2 text-right">Toplam Paket</th>
                <th class="px-3 py-2 text-right">Mekan Tutarı (₺)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="day in (detailVenue.dailyBreakdown || [])"
                :key="day.date"
                class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono"
              >
                <td class="px-3 py-2 text-slate-800 dark:text-slate-200 font-sans font-medium">
                  {{ formatToDisplayDate(day.date) }}
                </td>
                <td class="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400">
                  {{ day.indoorCount }} Pkt ({{ (day.indoorAmount || 0).toFixed(2) }} ₺)
                </td>
                <td class="px-3 py-2 text-right text-sky-700 dark:text-sky-400">
                  {{ day.outdoorCount }} Pkt ({{ (day.outdoorAmount || 0).toFixed(2) }} ₺)
                </td>
                <td class="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                  {{ day.totalCount }} Pkt
                </td>
                <td class="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {{ (day.totalAmount || 0).toFixed(2) }} ₺
                </td>
              </tr>
              <tr v-if="!detailVenue.dailyBreakdown || detailVenue.dailyBreakdown.length === 0">
                <td colspan="5" class="px-3 py-6 text-center text-slate-400 italic font-sans">
                  Seçili dönemde kayıtlı paket hareketi bulunamadı.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <button
            v-if="detailVenue"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors cursor-pointer"
            @click="openWhatsAppModal(detailVenue)"
          >
            <MessageSquare class="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp ile Paylaş</span>
          </button>
          <BaseButton variant="outline" size="sm" @click="isDetailModalOpen = false">
            Kapat
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
