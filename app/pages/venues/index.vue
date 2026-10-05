<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  Plus,
  Store,
  Search,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  Calendar,
  Eye,
  FileText,
  Filter,
  Bike,
  Wallet,
  Clock,
  RotateCcw,
  Receipt,
  Info,
  FileSpreadsheet
} from 'lucide-vue-next'
import { useVenues, getThisWeekRange, type VenueItem, type VenueFormData } from '~/composables/useVenues'

useHead({
  title: 'Mekan Yönetimi & Günlük Paket Takibi — KuryeTakip'
})

const {
  venues,
  loading,
  searchQuery,
  filterDate,
  filterStartDate,
  filterEndDate,
  filterScope,
  fetchVenues,
  createVenue,
  updateVenue,
  toggleVenueStatus,
  settleVenue,
  deleteVenue
} = useVenues()

// Modal states
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentVenueId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const venueToDelete = ref<VenueItem | null>(null)
const isDailyReportModalOpen = ref(false)

// Settle / Tahsilat Modal State
const isSettleModalOpen = ref(false)
const venueToSettle = ref<VenueItem | null>(null)
const settlingVenue = ref(false)
const settleCollectedAmount = ref<string | number>('')
const settleRemainingAmount = ref<string | number>('')
const settleNote = ref('')

const settleTotalDue = computed(() => {
  return Number(venueToSettle.value?.totalAmount || 0)
})

const numericCollectedAmount = computed(() => {
  if (settleCollectedAmount.value === '' || settleCollectedAmount.value === null || settleCollectedAmount.value === undefined) {
    return 0
  }
  const clean = String(settleCollectedAmount.value).trim().replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : Math.max(0, num)
})

const numericRemainingAmount = computed(() => {
  if (settleRemainingAmount.value === '' || settleRemainingAmount.value === null || settleRemainingAmount.value === undefined) {
    return 0
  }
  const clean = String(settleRemainingAmount.value).trim().replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : Math.max(0, num)
})

const onCollectedInput = (val: string | number) => {
  settleCollectedAmount.value = val
  const clean = String(val).trim().replace(',', '.')
  const num = parseFloat(clean)
  if (isNaN(num)) {
    settleRemainingAmount.value = settleTotalDue.value
  } else {
    const rem = Math.max(0, Number((settleTotalDue.value - num).toFixed(2)))
    settleRemainingAmount.value = rem
  }
}

const onRemainingInput = (val: string | number) => {
  settleRemainingAmount.value = val
  const clean = String(val).trim().replace(',', '.')
  const rem = parseFloat(clean)
  if (isNaN(rem)) {
    settleCollectedAmount.value = settleTotalDue.value
  } else {
    const col = Math.max(0, Number((settleTotalDue.value - rem).toFixed(2)))
    settleCollectedAmount.value = col
  }
}

const setFullSettlement = () => {
  settleCollectedAmount.value = settleTotalDue.value
  settleRemainingAmount.value = 0
}

// History / Breakdown Modal State
const isHistoryModalOpen = ref(false)
const historyVenue = ref<VenueItem | null>(null)
const historyViewMode = ref<'all' | 'filtered'>('all')

// Quick Daily Delivery Modal
const isQuickDeliveryOpen = ref(false)
const targetVenue = ref<VenueItem | null>(null)
const quickDeliveryForm = ref({
  date: new Date().toISOString().substring(0, 10),
  indoorCount: '' as string | number,
  outdoorCount: '' as string | number,
  venueIndoorPrice: '' as string | number,
  venueOutdoorPrice: '' as string | number,
  courierIndoorPrice: '' as string | number,
  courierOutdoorPrice: '' as string | number
})

// Form state
const formData = ref<VenueFormData>({
  name: '',
  indoorPrice: '',
  outdoorPrice: '',
  isActive: true,
  date: new Date().toISOString().substring(0, 10),
  indoorCount: '',
  outdoorCount: ''
})
const formErrors = ref<Record<string, string>>({})

const columns = [
  { key: 'name', label: 'Mekan Adı' },
  { key: 'indoorPrice', label: 'İç Teslimat Fiyatı', align: 'right' as const },
  { key: 'outdoorPrice', label: 'Dış Teslimat Fiyatı', align: 'right' as const },
  { key: 'totalPackages', label: 'Atılan Paket', align: 'right' as const },
  { key: 'totalAmount', label: 'Toplam Tutar', align: 'right' as const }
]

// KPI calculations
const totalVenuesCount = computed(() => venues.value.length)
const activeVenuesCount = computed(() => venues.value.filter(v => v.isActive).length)
const totalPackagesAcrossVenues = computed(() => {
  return venues.value.reduce((sum, v) => sum + (v.totalPackageCount || 0), 0)
})
const totalIndoorPackages = computed(() => {
  return venues.value.reduce((sum, v) => sum + (v.indoorPackageCount || 0), 0)
})
const totalOutdoorPackages = computed(() => {
  return venues.value.reduce((sum, v) => sum + (v.outdoorPackageCount || 0), 0)
})
const totalAmountAcrossVenues = computed(() => {
  return venues.value.reduce((sum, v) => sum + (v.totalAmount || 0), 0)
})
const totalCollectedAcrossVenues = computed(() => {
  return venues.value.reduce((sum, v) => sum + (v.totalCollectedAmount || 0), 0)
})

// Live calculations in Add/Edit modal
const formIndoorTotal = computed(() => {
  const count = Number(formData.value.indoorCount) || 0
  const price = Number(formData.value.indoorPrice) || 0
  return Number((count * price).toFixed(2))
})

const formOutdoorTotal = computed(() => {
  const count = Number(formData.value.outdoorCount) || 0
  const price = Number(formData.value.outdoorPrice) || 0
  return Number((count * price).toFixed(2))
})

const formGrandTotal = computed(() => {
  return Number((formIndoorTotal.value + formOutdoorTotal.value).toFixed(2))
})

// Live calculations in Quick Delivery modal (Separated Venue Tahsilat vs Courier Hakediş)
const quickVenueIndoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.indoorCount) || 0
  const price = Number(quickDeliveryForm.value.venueIndoorPrice) || 0
  return Number((count * price).toFixed(2))
})

const quickVenueOutdoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.outdoorCount) || 0
  const price = Number(quickDeliveryForm.value.venueOutdoorPrice) || 0
  return Number((count * price).toFixed(2))
})

const quickVenueGrandTotal = computed(() => {
  return Number((quickVenueIndoorTotal.value + quickVenueOutdoorTotal.value).toFixed(2))
})

const quickCourierIndoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.indoorCount) || 0
  const price = Number(quickDeliveryForm.value.courierIndoorPrice) || 0
  return Number((count * price).toFixed(2))
})

const quickCourierOutdoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.outdoorCount) || 0
  const price = Number(quickDeliveryForm.value.courierOutdoorPrice) || 0
  return Number((count * price).toFixed(2))
})

const quickCourierGrandTotal = computed(() => {
  return Number((quickCourierIndoorTotal.value + quickCourierOutdoorTotal.value).toFixed(2))
})

const quickNetProfit = computed(() => {
  return Number((quickVenueGrandTotal.value - quickCourierGrandTotal.value).toFixed(2))
})

// Filtered venues based on local search
const filteredVenues = computed(() => {
  if (!searchQuery.value.trim()) return venues.value
  const q = searchQuery.value.toLowerCase().trim()
  return venues.value.filter(v => v.name.toLowerCase().includes(q))
})

// Period & Date Filter Handler (Manuel Tahsilat ile Sıfırlama)
const currentFilterMode = ref<'pending' | 'thisWeek' | 'today' | 'yesterday' | 'all' | 'custom'>('pending')

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}.${parts[1]}`
}

const activePeriodLabel = computed(() => {
  if (currentFilterMode.value === 'pending') {
    return 'Bekleyen Tahsilat (Aktif Hesap)'
  }
  if (currentFilterMode.value === 'today') {
    return `Bugün (${formatShortDate(filterDate.value)})`
  }
  if (currentFilterMode.value === 'yesterday') {
    return `Dün (${formatShortDate(filterDate.value)})`
  }
  if (currentFilterMode.value === 'thisWeek') {
    return `Bu Hafta (${formatShortDate(filterStartDate.value)} - ${formatShortDate(filterEndDate.value)})`
  }
  if (currentFilterMode.value === 'all') {
    return 'Tüm Zamanlar (Genel Geçmiş)'
  }
  return `Filtre: ${filterDate.value || `${formatShortDate(filterStartDate.value)} - ${formatShortDate(filterEndDate.value)}`}`
})

const setDateQuickFilter = (type: 'pending' | 'thisWeek' | 'today' | 'yesterday' | 'all') => {
  currentFilterMode.value = type
  if (type === 'pending') {
    filterDate.value = ''
    filterStartDate.value = ''
    filterEndDate.value = ''
    filterScope.value = 'pending'
  } else if (type === 'thisWeek') {
    const range = getThisWeekRange()
    filterDate.value = ''
    filterStartDate.value = range.start
    filterEndDate.value = range.end
    filterScope.value = 'custom'
  } else if (type === 'today') {
    filterDate.value = new Date().toISOString().substring(0, 10)
    filterStartDate.value = ''
    filterEndDate.value = ''
    filterScope.value = 'custom'
  } else if (type === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    filterDate.value = d.toISOString().substring(0, 10)
    filterStartDate.value = ''
    filterEndDate.value = ''
    filterScope.value = 'custom'
  } else if (type === 'all') {
    filterDate.value = ''
    filterStartDate.value = ''
    filterEndDate.value = ''
    filterScope.value = 'all'
  }
  fetchVenues()
}

const onDateInputChange = () => {
  if (filterDate.value) {
    currentFilterMode.value = 'custom'
    filterStartDate.value = ''
    filterEndDate.value = ''
  } else {
    setDateQuickFilter('pending')
    return
  }
  fetchVenues()
}

// Active History Breakdown for History Modal (Supports both filtered & all historical days)
const activeHistoryBreakdown = computed(() => {
  if (!historyVenue.value) return []
  if (historyViewMode.value === 'filtered') {
    return historyVenue.value.dailyBreakdown || []
  }
  return historyVenue.value.allDailyBreakdown && historyVenue.value.allDailyBreakdown.length > 0
    ? historyVenue.value.allDailyBreakdown
    : (historyVenue.value.dailyBreakdown || [])
})

const activeHistoryTotalCount = computed(() => {
  return activeHistoryBreakdown.value.reduce((sum, d) => sum + (d.totalCount || 0), 0)
})

const activeHistoryTotalAmount = computed(() => {
  return activeHistoryBreakdown.value.reduce((sum, d) => sum + (d.totalAmount || 0), 0)
})

const activeHistoryIndoorCount = computed(() => {
  return activeHistoryBreakdown.value.reduce((sum, d) => sum + (d.indoorCount || 0), 0)
})

const activeHistoryIndoorAmount = computed(() => {
  return activeHistoryBreakdown.value.reduce((sum, d) => sum + (d.indoorAmount || 0), 0)
})

const activeHistoryOutdoorCount = computed(() => {
  return activeHistoryBreakdown.value.reduce((sum, d) => sum + (d.outdoorCount || 0), 0)
})

const activeHistoryOutdoorAmount = computed(() => {
  return activeHistoryBreakdown.value.reduce((sum, d) => sum + (d.outdoorAmount || 0), 0)
})

const openAddModal = () => {
  isEditing.value = false
  currentVenueId.value = null
  formData.value = {
    name: '',
    indoorPrice: '',
    outdoorPrice: '',
    isActive: true,
    date: filterDate.value || new Date().toISOString().substring(0, 10),
    indoorCount: '',
    outdoorCount: ''
  }
  formErrors.value = {}
  isModalOpen.value = true
}

const openEditModal = (venue: VenueItem) => {
  isEditing.value = true
  currentVenueId.value = venue.id
  const targetDate = filterDate.value || new Date().toISOString().substring(0, 10)
  const allDays = venue.allDailyBreakdown && venue.allDailyBreakdown.length > 0
    ? venue.allDailyBreakdown
    : (venue.dailyBreakdown || [])
  const existingDay = allDays.find(d => d.date === targetDate)

  formData.value = {
    name: venue.name,
    indoorPrice: venue.indoorPrice,
    outdoorPrice: venue.outdoorPrice,
    isActive: venue.isActive,
    date: targetDate,
    indoorCount: existingDay && existingDay.indoorCount > 0 ? existingDay.indoorCount : '',
    outdoorCount: existingDay && existingDay.outdoorCount > 0 ? existingDay.outdoorCount : ''
  }
  formErrors.value = {}
  isModalOpen.value = true
}

const onEditModalDateChange = () => {
  if (!currentVenueId.value) return
  const venue = venues.value.find(v => v.id === currentVenueId.value)
  if (!venue) return
  const allDays = venue.allDailyBreakdown && venue.allDailyBreakdown.length > 0
    ? venue.allDailyBreakdown
    : (venue.dailyBreakdown || [])
  const existingDay = allDays.find(d => d.date === formData.value.date)
  if (existingDay) {
    formData.value.indoorCount = existingDay.indoorCount > 0 ? existingDay.indoorCount : ''
    formData.value.outdoorCount = existingDay.outdoorCount > 0 ? existingDay.outdoorCount : ''
  } else {
    formData.value.indoorCount = ''
    formData.value.outdoorCount = ''
  }
}

const existingDeliveryForEditModal = computed(() => {
  if (!isEditing.value || !currentVenueId.value || !formData.value.date) return null
  const venue = venues.value.find(v => v.id === currentVenueId.value)
  if (!venue) return null
  const allDays = venue.allDailyBreakdown && venue.allDailyBreakdown.length > 0
    ? venue.allDailyBreakdown
    : (venue.dailyBreakdown || [])
  return allDays.find(d => d.date === formData.value.date) || null
})

const openQuickDelivery = (venue: VenueItem, dateOverride?: string) => {
  targetVenue.value = venue
  const selectedDate = dateOverride || filterDate.value || new Date().toISOString().substring(0, 10)
  const allDays = venue.allDailyBreakdown && venue.allDailyBreakdown.length > 0
    ? venue.allDailyBreakdown
    : (venue.dailyBreakdown || [])
  const existingDay = allDays.find(d => d.date === selectedDate)

  quickDeliveryForm.value = {
    date: selectedDate,
    indoorCount: existingDay && existingDay.indoorCount > 0 ? existingDay.indoorCount : '',
    outdoorCount: existingDay && existingDay.outdoorCount > 0 ? existingDay.outdoorCount : '',
    venueIndoorPrice: venue.indoorPrice,
    venueOutdoorPrice: venue.outdoorPrice,
    courierIndoorPrice: '',
    courierOutdoorPrice: ''
  }
  isQuickDeliveryOpen.value = true
}

const onQuickDeliveryDateChange = () => {
  if (!targetVenue.value) return
  const allDays = targetVenue.value.allDailyBreakdown && targetVenue.value.allDailyBreakdown.length > 0
    ? targetVenue.value.allDailyBreakdown
    : (targetVenue.value.dailyBreakdown || [])
  const existingDay = allDays.find(d => d.date === quickDeliveryForm.value.date)
  if (existingDay) {
    quickDeliveryForm.value.indoorCount = existingDay.indoorCount > 0 ? existingDay.indoorCount : ''
    quickDeliveryForm.value.outdoorCount = existingDay.outdoorCount > 0 ? existingDay.outdoorCount : ''
  } else {
    quickDeliveryForm.value.indoorCount = ''
    quickDeliveryForm.value.outdoorCount = ''
  }
}

const existingDeliveryForQuickModal = computed(() => {
  if (!targetVenue.value || !quickDeliveryForm.value.date) return null
  const allDays = targetVenue.value.allDailyBreakdown && targetVenue.value.allDailyBreakdown.length > 0
    ? targetVenue.value.allDailyBreakdown
    : (targetVenue.value.dailyBreakdown || [])
  return allDays.find(d => d.date === quickDeliveryForm.value.date) || null
})

const editDayFromHistory = (date: string) => {
  if (!historyVenue.value) return
  const venue = historyVenue.value
  openQuickDelivery(venue, date)
}

const openHistoryModal = (venue: VenueItem) => {
  historyVenue.value = venue
  isHistoryModalOpen.value = true
}

const openDeleteConfirm = (venue: VenueItem) => {
  venueToDelete.value = venue
  isConfirmDeleteOpen.value = true
}

const handleConfirmDelete = async () => {
  if (venueToDelete.value) {
    await deleteVenue(venueToDelete.value.id)
    isConfirmDeleteOpen.value = false
    venueToDelete.value = null
  }
}

const validateForm = () => {
  const errors: Record<string, string> = {}
  if (!formData.value.name.trim()) {
    errors.name = 'Mekan adı zorunludur.'
  }
  const indoor = Number(formData.value.indoorPrice)
  if (formData.value.indoorPrice === '' || isNaN(indoor) || indoor < 0) {
    errors.indoorPrice = 'Geçerli bir iç teslimat fiyatı (>= 0) giriniz.'
  }
  const outdoor = Number(formData.value.outdoorPrice)
  if (formData.value.outdoorPrice === '' || isNaN(outdoor) || outdoor < 0) {
    errors.outdoorPrice = 'Geçerli bir dış teslimat fiyatı (>= 0) giriniz.'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleFormSubmit = async () => {
  if (!validateForm()) return

  if (isEditing.value && currentVenueId.value) {
    const payload: VenueFormData = {
      name: formData.value.name,
      indoorPrice: formData.value.indoorPrice,
      outdoorPrice: formData.value.outdoorPrice,
      isActive: formData.value.isActive,
      date: formData.value.date
    }
    // Only pass count fields if user modified or provided them
    if (formData.value.indoorCount !== '') {
      payload.indoorCount = Number(formData.value.indoorCount) || 0
    }
    if (formData.value.outdoorCount !== '') {
      payload.outdoorCount = Number(formData.value.outdoorCount) || 0
    }
    const success = await updateVenue(currentVenueId.value, payload)
    if (success) isModalOpen.value = false
  } else {
    const success = await createVenue(formData.value)
    if (success) isModalOpen.value = false
  }
}

const handleQuickDeliverySubmit = async () => {
  if (!targetVenue.value) return
  const rawIndoor = quickDeliveryForm.value.indoorCount
  const rawOutdoor = quickDeliveryForm.value.outdoorCount
  
  const indoor = rawIndoor === '' ? 0 : Number(rawIndoor)
  const outdoor = rawOutdoor === '' ? 0 : Number(rawOutdoor)

  if (indoor < 0 || outdoor < 0) return
  if (indoor === 0 && outdoor === 0 && !existingDeliveryForQuickModal.value) return

  const payload: VenueFormData = {
    name: targetVenue.value.name,
    indoorPrice: Number(quickDeliveryForm.value.venueIndoorPrice) || targetVenue.value.indoorPrice,
    outdoorPrice: Number(quickDeliveryForm.value.venueOutdoorPrice) || targetVenue.value.outdoorPrice,
    isActive: targetVenue.value.isActive,
    date: quickDeliveryForm.value.date,
    indoorCount: indoor,
    outdoorCount: outdoor,
    courierIndoorPrice: Number(quickDeliveryForm.value.courierIndoorPrice) || 0,
    courierOutdoorPrice: Number(quickDeliveryForm.value.courierOutdoorPrice) || 0
  }

  const success = await updateVenue(targetVenue.value.id, payload)
  if (success) {
    isQuickDeliveryOpen.value = false
    const venueId = targetVenue.value.id
    quickDeliveryForm.value = {
      date: new Date().toISOString().substring(0, 10),
      indoorCount: '',
      outdoorCount: '',
      venueIndoorPrice: '',
      venueOutdoorPrice: '',
      courierIndoorPrice: '',
      courierOutdoorPrice: ''
    }
    if (historyVenue.value && historyVenue.value.id === venueId) {
      const refreshed = venues.value.find(v => v.id === venueId)
      if (refreshed) historyVenue.value = refreshed
    }
  }
}

const openSettleModal = (venue: VenueItem) => {
  venueToSettle.value = venue
  const total = Number(venue.totalAmount || 0)
  settleCollectedAmount.value = total > 0 ? total : 0
  settleRemainingAmount.value = 0
  settleNote.value = ''
  isSettleModalOpen.value = true
}

const handleConfirmSettle = async () => {
  if (!venueToSettle.value) return
  settlingVenue.value = true
  try {
    const ok = await settleVenue(venueToSettle.value.id, {
      collectedAmount: numericCollectedAmount.value,
      remainingBalance: numericRemainingAmount.value,
      notes: settleNote.value
    })
    if (ok) {
      isSettleModalOpen.value = false
      venueToSettle.value = null
    }
  } finally {
    settlingVenue.value = false
  }
}

const handleUndoSettle = async (venueId: string) => {
  settlingVenue.value = true
  try {
    await settleVenue(venueId, { action: 'undo' })
    if (historyVenue.value && historyVenue.value.id === venueId) {
      const updated = venues.value.find(v => v.id === venueId)
      if (updated) historyVenue.value = updated
    }
  } finally {
    settlingVenue.value = false
  }
}

onMounted(() => {
  // Varsayılan olarak bekleyen tahsilatları göster (Otomatik sıfırlama YAPMA, manuel tahsilat ile sıfırlanır)
  setDateQuickFilter('pending')
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Store class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Mekanlar</span>
              <span class="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {{ totalVenuesCount }} Mekan
              </span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Restoranların iç/dış paket fiyatlandırmaları, teslimat hacimleri ve tahsilat takibi.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <!-- Yenile Butonu -->
        <BaseButton
          variant="outline"
          size="md"
          :disabled="loading"
          class="h-10 hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
          @click="fetchVenues()"
        >
          <template #leading>
            <RefreshCw :class="['w-4 h-4', loading ? 'animate-spin text-emerald-500' : 'text-slate-500']" />
          </template>
          Yenile
        </BaseButton>

        <!-- Gün Sonu Raporu Al Butonu -->
        <BaseButton
          variant="outline"
          size="md"
          class="h-10 bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 border-transparent shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 font-semibold"
          @click="isDailyReportModalOpen = true"
        >
          <template #leading>
            <FileSpreadsheet class="w-4 h-4 text-emerald-400 dark:text-white" />
          </template>
          Gün Sonu Raporu Al
        </BaseButton>

        <!-- Mekan Ekle Butonu -->
        <BaseButton
          variant="primary"
          size="md"
          class="h-10 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
          @click="openAddModal"
        >
          <template #leading>
            <Plus class="w-4 h-4" />
          </template>
          Mekan Ekle
        </BaseButton>
      </div>
    </div>

    <!-- KPI Summary Cards (Modern Fintech Dashboard Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Toplam Mekan Sayısı -->
      <BaseCard no-padding class="p-4 sm:p-5 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kayıtlı Mekanlar
            </span>
            <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-105 transition-transform">
              <Store class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 font-mono tracking-tight">
            {{ totalVenuesCount }} <span class="text-sm font-semibold text-slate-400 font-sans">Mekan</span>
          </div>
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Aktif Mekan:</span>
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {{ activeVenuesCount }} Aktif
          </span>
        </div>
      </BaseCard>

      <!-- 2. Toplam Atılan Paket Sayısı -->
      <BaseCard no-padding class="p-4 sm:p-5 flex flex-col justify-between border-l-4 border-l-emerald-500 group hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Toplam Atılan Paket</span>
            </span>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Package class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-2 font-mono tracking-tight">
            {{ totalPackagesAcrossVenues }} <span class="text-sm font-semibold font-sans">Adet</span>
          </div>
        </div>
        <div class="text-xs font-medium text-emerald-700/90 dark:text-emerald-400/90 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span class="font-mono text-[11px]">İç: {{ totalIndoorPackages }} · Dış: {{ totalOutdoorPackages }}</span>
          <span class="font-mono font-bold">{{ totalPackagesAcrossVenues }} Pkt</span>
        </div>
      </BaseCard>

      <!-- 3. İç Mekan / Dış Mekan Dağılımı -->
      <BaseCard no-padding class="p-4 sm:p-5 flex flex-col justify-between border-l-4 border-l-sky-500 group hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Teslimat Türü Dağılımı
            </span>
            <div class="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <Layers class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600 dark:text-slate-400 font-medium">İç Mekan:</span>
              <span class="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">{{ totalIndoorPackages }} Paket</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Dış Mekan:</span>
              <span class="font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200/60 dark:border-sky-800/60">{{ totalOutdoorPackages }} Paket</span>
            </div>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          Birim fiyatlar üzerinden anlık hesaplanır
        </div>
      </BaseCard>

      <!-- 4. Toplam Tutar / Hakediş (Tahsilat Durumu) -->
      <BaseCard no-padding class="p-4 sm:p-5 bg-slate-900 dark:bg-slate-900 text-white border-slate-800 dark:border-slate-700 flex flex-col justify-between group hover:shadow-md transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {{ currentFilterMode === 'pending' ? 'Bekleyen Tahsilat' : 'Toplam Ciro' }}
            </span>
            <div class="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono tracking-tight">
            {{ totalAmountAcrossVenues.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span v-if="currentFilterMode === 'pending'">Tahsil Edilen: {{ totalCollectedAcrossVenues.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
          <span v-else>Aktif Dönem</span>
          <span class="font-mono text-emerald-300 font-bold">{{ totalPackagesAcrossVenues }} Paket</span>
        </div>
      </BaseCard>
    </div>

    <!-- Search & Unified Action Toolbar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Mekan Arama
          </label>
          <div class="relative">
            <BaseInput
              v-model="searchQuery"
              placeholder="Mekan adına göre ara... (Örn: Terra Pizza)"
            >
              <template #leading>
                <Search class="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </template>
            </BaseInput>
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              title="Aramayı Temizle"
              @click="searchQuery = ''"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Date Filter Input -->
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Belirli Bir Güne Göre Filtrele
          </label>
          <BaseInput
            v-model="filterDate"
            type="date"
            @change="onDateInputChange"
            @blur="onDateInputChange"
          />
        </div>
      </div>

      <!-- Quick Date Shortcuts & Manuel Reset Indicator -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter class="w-3.5 h-3.5 text-slate-400" />
            <span>Dönem:</span>
          </span>

          <!-- 1. Bekleyen Tahsilat (Aktif) -->
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5',
              currentFilterMode === 'pending'
                ? 'bg-emerald-600 text-white shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="setDateQuickFilter('pending')"
          >
            <Wallet class="w-3.5 h-3.5" />
            <span>Bekleyen Tahsilat (Aktif)</span>
          </button>

          <!-- 2. Bugün -->
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              currentFilterMode === 'today'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="setDateQuickFilter('today')"
          >
            Bugün
          </button>

          <!-- 3. Dün -->
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              currentFilterMode === 'yesterday'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="setDateQuickFilter('yesterday')"
          >
            Dün
          </button>

          <!-- 4. Bu Hafta -->
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              currentFilterMode === 'thisWeek'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="setDateQuickFilter('thisWeek')"
          >
            Bu Hafta
          </button>

          <!-- 5. Tüm Zamanlar -->
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              currentFilterMode === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="setDateQuickFilter('all')"
          >
            Tüm Zamanlar
          </button>
        </div>

        <!-- Aktif Dönem & Kayıt Bilgisi Rozeti -->
        <div class="flex items-center gap-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-semibold font-mono">
            <Calendar class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{{ activePeriodLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content: Table / Empty State -->
    <div v-if="!loading && filteredVenues.length === 0 && !searchQuery">
      <BaseEmptyState
        title="Henüz kayıtlı mekan bulunmuyor."
        description="Paket teslimatlarını ve hakediş hesaplarını başlatmak için çalıştığınız restoran veya işletmeleri ekleyin."
        action-text="İlk Mekanı Ekle"
        @action="openAddModal"
      >
        <template #icon>
          <Store class="w-6 h-6 stroke-[1.5]" />
        </template>
      </BaseEmptyState>
    </div>

    <div v-else-if="!loading && filteredVenues.length === 0 && searchQuery">
      <BaseEmptyState
        title="Arama sonucu bulunamadı."
        :description="`'${searchQuery}' aramasına uygun mekan bulunamadı.`"
        action-text="Filtreyi Temizle"
        @action="searchQuery = ''"
      >
        <template #icon>
          <Search class="w-6 h-6 stroke-[1.5]" />
        </template>
      </BaseEmptyState>
    </div>

    <div v-else>
      <BaseTable
        :columns="columns"
        :loading="loading"
      >
        <template #default>
          <tr
            v-for="venue in filteredVenues"
            :key="venue.id"
            :class="[
              'group transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/60',
              venue.isActive
                ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                : 'bg-slate-50/40 dark:bg-slate-900/30 opacity-70 hover:opacity-95'
            ]"
          >
            <!-- 1. Mekan Adı & Durum -->
            <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs',
                    venue.isActive
                      ? 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 border-slate-200 dark:from-slate-800 dark:to-slate-850 dark:text-slate-300 dark:border-slate-700'
                      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-850 dark:text-slate-600 dark:border-slate-800'
                  ]"
                >
                  <Store class="w-4 h-4 stroke-[1.75]" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight truncate">
                      {{ venue.name }}
                    </span>
                    <!-- Durum Rozeti -->
                    <span
                      v-if="!venue.isActive"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/60"
                    >
                      Pasif
                    </span>
                    <span
                      v-else-if="venue.totalPackageCount && venue.totalPackageCount > 0"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/70"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif Sipariş
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      Aktif
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    <span v-if="venue.totalPackageCount && venue.totalPackageCount > 0" class="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      {{ venue.totalPackageCount }} paket teslim edildi
                    </span>
                    <span v-else-if="venue.hasRecords">
                      Geçmiş kayıtları mevcut
                    </span>
                    <span v-else class="text-slate-400 dark:text-slate-600">
                      Henüz teslimat girilmedi
                    </span>
                  </div>
                </div>
              </div>
            </td>

            <!-- 2. İç Teslimat Fiyatı & Atılan Paket -->
            <td class="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
              <div class="flex flex-col items-end gap-1">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs sm:text-sm font-bold font-mono shadow-2xs">
                  {{ venue.indoorPrice.toFixed(2) }} ₺
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                  {{ venue.indoorPackageCount || 0 }} İç Paket
                </span>
              </div>
            </td>

            <!-- 3. Dış Teslimat Fiyatı & Atılan Paket -->
            <td class="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
              <div class="flex flex-col items-end gap-1">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 text-xs sm:text-sm font-bold font-mono shadow-2xs">
                  {{ venue.outdoorPrice.toFixed(2) }} ₺
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                  {{ venue.outdoorPackageCount || 0 }} Dış Paket
                </span>
              </div>
            </td>

            <!-- 4. Toplam Atılan Paket Sayısı -->
            <td class="px-5 py-4 text-right">
              <div class="flex flex-col items-end gap-1">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/70">
                  {{ venue.totalPackageCount || 0 }} Paket
                </span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  İç: {{ venue.indoorPackageCount || 0 }} · Dış: {{ venue.outdoorPackageCount || 0 }}
                </span>
              </div>
            </td>

            <!-- 5. Toplam Tutar / Hakediş -->
            <td class="px-5 py-4 text-right">
              <div class="flex flex-col items-end gap-1">
                <span :class="[
                  'inline-flex items-center px-3 py-1 rounded-xl font-mono font-bold text-xs sm:text-sm border transition-shadow',
                  (venue.totalAmount || 0) > 0
                    ? 'bg-slate-900 text-emerald-400 dark:bg-slate-950 dark:text-emerald-400 border-slate-800 dark:border-slate-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                ]">
                  {{ (venue.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
                <span
                  v-if="venue.carriedBalance && venue.carriedBalance > 0"
                  class="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px] border border-amber-200/80 dark:border-amber-800/80 shadow-2xs"
                  title="Önceki Tahsilattan Kalan Borç"
                >
                  Kalan Borç: {{ venue.carriedBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
                </span>
                <span v-else-if="venue.lastSettledAt && (venue.totalAmount || 0) === 0" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-900/60">
                  <CheckCircle2 class="w-3 h-3 text-emerald-500" />
                  <span>Tahsil Edildi (Sıfırlandı)</span>
                </span>
                <span v-else-if="venue.totalCollectedAmount && venue.totalCollectedAmount > 0" class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  Ödenen: {{ venue.totalCollectedAmount.toFixed(0) }} ₺
                </span>
              </div>
            </td>

            <!-- 6. İşlemler -->
            <td class="px-5 py-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <!-- Tahsilat Al Butonu -->
                <BaseButton
                  v-if="(venue.totalAmount || 0) > 0"
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700 font-bold shadow-2xs hover:shadow-xs transition-all active:scale-95"
                  title="Mekandan tahsilat al ve ana paradan düş veya sıfırla"
                  @click="openSettleModal(venue)"
                >
                  <template #leading>
                    <Wallet class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </template>
                  Tahsilat Al
                </BaseButton>

                <!-- Günlük Döküm Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2.5 text-sky-700 hover:bg-sky-50 border-sky-200 dark:text-sky-300 dark:border-sky-900/60 dark:hover:bg-sky-950/40 font-medium transition-all"
                  title="Günlük Paket Dökümünü ve Hesaplamalarını Gör"
                  @click="openHistoryModal(venue)"
                >
                  <template #leading>
                    <FileText class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  </template>
                  Döküm
                </BaseButton>

                <!-- Paket Gir Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40 font-medium transition-all"
                  title="Günlük Paket Girişi Yap"
                  @click="openQuickDelivery(venue)"
                >
                  <template #leading>
                    <Plus class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </template>
                  Paket Gir
                </BaseButton>

                <!-- İkincil İkon Butonları -->
                <div class="flex items-center ml-1 border-l border-slate-200 dark:border-slate-750 pl-1">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    class="!p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    title="Düzenle"
                    @click="openEditModal(venue)"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </BaseButton>

                  <BaseButton
                    variant="ghost"
                    size="sm"
                    class="!p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    :title="venue.isActive ? 'Pasife Al' : 'Aktife Al'"
                    @click="toggleVenueStatus(venue)"
                  >
                    <Power
                      :class="[
                        'w-3.5 h-3.5',
                        venue.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      ]"
                    />
                  </BaseButton>

                  <BaseButton
                    variant="ghost"
                    size="sm"
                    class="!p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                    title="Sil"
                    @click="openDeleteConfirm(venue)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </BaseButton>
                </div>
              </div>
            </td>
          </tr>
        </template>

        <template #actions>
          <th class="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-right text-xs uppercase tracking-wider whitespace-nowrap">
            İşlemler
          </th>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium w-full py-1">
            <span class="flex items-center gap-1.5">
              <span>Toplam</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold font-mono">
                {{ filteredVenues.length }}
              </span>
              <span>mekan listelendi</span>
            </span>
            <div class="flex flex-wrap items-center gap-3 text-xs">
              <span class="flex items-center gap-1">
                <span>Toplam Paket:</span>
                <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold">
                  {{ totalPackagesAcrossVenues }} Adet
                </span>
              </span>
              <span class="text-slate-300 dark:text-slate-700">|</span>
              <span class="flex items-center gap-1">
                <span>Toplam Hakediş:</span>
                <span class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 font-mono font-bold">
                  {{ totalAmountAcrossVenues.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
              </span>
            </div>
          </div>
        </template>
      </BaseTable>
    </div>

    <!-- 1. MEKAN EKLEME / DÜZENLEME MODAL (Günlük Paket Girişi Entegreli) -->
    <BaseModal
      v-model="isModalOpen"
      :title="isEditing ? 'Mekanı Düzenle' : 'Yeni Mekan Ekle'"
      :description="isEditing ? 'Mekan bilgilerini, birim fiyatlarını ve günlük paket teslimatlarını güncelleyin.' : 'Mekan adı, iç/dış birim fiyatları ve isteğe bağlı günlük paket teslimat sayılarını girin.'"
    >
      <form class="space-y-4" @submit.prevent="handleFormSubmit">
        <BaseInput
          v-model="formData.name"
          label="Mekan Adı"
          placeholder="Örn: Terra Pizza"
          :error="formErrors.name"
          required
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseInput
            v-model="formData.indoorPrice"
            label="İç Teslimat Fiyatı (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="34.00"
            :error="formErrors.indoorPrice"
            hint="Mekanın standart iç paket ücreti"
            required
          />

          <BaseInput
            v-model="formData.outdoorPrice"
            label="Dış Teslimat Fiyatı (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="36.00"
            :error="formErrors.outdoorPrice"
            hint="Mekanın standart dış paket ücreti"
            required
          />
        </div>

        <!-- Günlük Paket Girişi Bölümü (İç & Dış Mekan Kaçar Paket Atılmış) -->
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Package class="w-3.5 h-3.5 text-emerald-600" />
              <span>Günlük Paket Girişi (Opsiyonel)</span>
            </span>
            <span class="text-[11px] text-slate-400">Birim fiyat üzerinden hesaplanır</span>
          </div>

          <div>
            <BaseInput
              v-model="formData.date"
              label="Teslimat Tarihi"
              type="date"
              @change="onEditModalDateChange"
            />
          </div>

          <div
            v-if="existingDeliveryForEditModal && (existingDeliveryForEditModal.indoorCount > 0 || existingDeliveryForEditModal.outdoorCount > 0)"
            class="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2"
          >
            <Info class="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Bu tarihte kayıtlı: <strong>{{ existingDeliveryForEditModal.indoorCount }} İç</strong>, <strong>{{ existingDeliveryForEditModal.outdoorCount }} Dış</strong> paket var. Değiştirdiğinizde eski sayıların üzerine eklenmez, doğrudan güncellenir.</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <BaseInput
                v-model="formData.indoorCount"
                label="İç Paket Sayısı (Adet)"
                type="number"
                min="0"
                step="1"
                placeholder="Örn: 10"
                :hint="formData.indoorPrice ? `Fiyat: ${Number(formData.indoorPrice).toFixed(2)} ₺ (${formIndoorTotal.toFixed(2)} ₺)` : ''"
              />
            </div>

            <div>
              <BaseInput
                v-model="formData.outdoorCount"
                label="Dış Paket Sayısı (Adet)"
                type="number"
                min="0"
                step="1"
                placeholder="Örn: 5"
                :hint="formData.outdoorPrice ? `Fiyat: ${Number(formData.outdoorPrice).toFixed(2)} ₺ (${formOutdoorTotal.toFixed(2)} ₺)` : ''"
              />
            </div>
          </div>

          <!-- Canlı Tutar Önizleme -->
          <div
            v-if="Number(formData.indoorCount) > 0 || Number(formData.outdoorCount) > 0"
            class="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs font-mono"
          >
            <div>
              <span class="text-slate-400 block text-[10px]">Toplam Paket:</span>
              <span class="font-bold text-white">{{ (Number(formData.indoorCount) || 0) + (Number(formData.outdoorCount) || 0) }} Adet</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">Toplam Hakediş:</span>
              <span class="font-bold text-emerald-400 text-sm">{{ formGrandTotal.toFixed(2) }} ₺</span>
            </div>

          </div>
        </div>

        <!-- Aktif / Pasif Seçimi -->
        <div class="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div class="text-xs font-semibold text-slate-900">
              Mekan Durumu
            </div>
            <div class="text-[11px] text-slate-500">
              Pasif mekanlar yeni paket kayıtlarında varsayılan olarak gizlenir.
            </div>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
          </label>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            :disabled="loading"
            @click="isModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="loading"
          >
            {{ isEditing ? 'Güncelle' : 'Kaydet' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 2. HIZLI GÜNLÜK PAKET GİRİŞİ MODAL -->
    <BaseModal
      v-model="isQuickDeliveryOpen"
      :title="`Paket Girişi — ${targetVenue?.name || 'Mekan'}`"
      description="Mekan için paket sayılarını girin, mekan tahsilat ücretlerini ve kurye hakediş ücretlerini ayrı ayrı belirleyin."
    >
      <form class="space-y-4" @submit.prevent="handleQuickDeliverySubmit">
        <BaseInput
          v-model="quickDeliveryForm.date"
          label="Teslimat Tarihi"
          type="date"
          required
          @change="onQuickDeliveryDateChange"
        />

        <!-- Mevcut Kayıt Bilgilendirme / Güncelleme Bildirimi -->
        <div
          v-if="existingDeliveryForQuickModal && (existingDeliveryForQuickModal.indoorCount > 0 || existingDeliveryForQuickModal.outdoorCount > 0)"
          class="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2"
        >
          <Info class="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>Bu tarih için kayıtlı: <strong>{{ existingDeliveryForQuickModal.indoorCount }} İç</strong>, <strong>{{ existingDeliveryForQuickModal.outdoorCount }} Dış</strong> paket var. Girdiğiniz yeni sayılar eski sayıların üzerine eklenmez, doğrudan güncellenir.</span>
        </div>

        <!-- Paket Sayıları -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <BaseInput
            v-model="quickDeliveryForm.indoorCount"
            label="İç Paket Sayısı (Adet)"
            type="number"
            min="0"
            step="1"
            placeholder="Örn: 10"
          />

          <BaseInput
            v-model="quickDeliveryForm.outdoorCount"
            label="Dış Paket Sayısı (Adet)"
            type="number"
            min="0"
            step="1"
            placeholder="Örn: 5"
          />
        </div>

        <!-- Ayrı Para Girişi: Mekan Fiyatları ve Kurye Hakediş Fiyatları -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Mekan Tahsilat Fiyatları -->
          <div class="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Store class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mekan Ücretleri (Tahsilat)</span>
              </span>
              <span class="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400">
                Toplam: {{ quickVenueGrandTotal.toFixed(2) }} ₺
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <BaseInput
                v-model="quickDeliveryForm.venueIndoorPrice"
                label="İç Fiyat (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              <BaseInput
                v-model="quickDeliveryForm.venueOutdoorPrice"
                label="Dış Fiyat (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Kurye Hakediş Fiyatları -->
          <div class="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                <Bike class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Kurye Ücretleri (Hakediş)</span>
              </span>
              <span class="text-[10px] font-mono font-bold text-sky-800 dark:text-sky-400">
                Toplam: {{ quickCourierGrandTotal.toFixed(2) }} ₺
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <BaseInput
                v-model="quickDeliveryForm.courierIndoorPrice"
                label="İç Fiyat (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              <BaseInput
                v-model="quickDeliveryForm.courierOutdoorPrice"
                label="Dış Fiyat (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <!-- 3'lü Canlı KPI Özeti -->
        <div class="grid grid-cols-3 gap-2 p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-xl font-mono text-center">
          <div class="p-1">
            <span class="text-[10px] text-emerald-400 block font-sans font-semibold">Mekan Tahsilatı</span>
            <span class="font-bold text-emerald-300 text-sm sm:text-base">{{ quickVenueGrandTotal.toFixed(2) }} ₺</span>
          </div>
          <div class="p-1 border-x border-slate-800">
            <span class="text-[10px] text-sky-400 block font-sans font-semibold">Kurye Hakedişi</span>
            <span class="font-bold text-sky-300 text-sm sm:text-base">{{ quickCourierGrandTotal.toFixed(2) }} ₺</span>
          </div>
          <div class="p-1">
            <span class="text-[10px] text-amber-400 block font-sans font-semibold">Net Kâr</span>
            <span :class="['font-bold text-sm sm:text-base', quickNetProfit >= 0 ? 'text-amber-300' : 'text-rose-400']">
              {{ quickNetProfit.toFixed(2) }} ₺
            </span>
          </div>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            @click="isQuickDeliveryOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="loading"
          >
            {{ (existingDeliveryForQuickModal && (existingDeliveryForQuickModal.indoorCount > 0 || existingDeliveryForQuickModal.outdoorCount > 0)) ? 'Paket Sayılarını Güncelle' : 'Paket Kaydını Ekle' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 3. MEKAN GÜNLÜK PAKET DÖKÜMÜ & HESAPLAMA MODAL -->
    <BaseModal
      v-model="isHistoryModalOpen"
      :title="`Günlük Paket Dökümü — ${historyVenue?.name || 'Mekan'}`"
      description="Seçilen mekana ait gün gün atılan iç ve dış mekan paket adetleri, tahsilat durumları ve birim fiyat üzerinden hakediş dökümü."
    >
      <div class="space-y-4">
        <!-- Mekan Finansal Durum & Fiyat Kartı -->
        <div class="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-semibold">Mekan</span>
              <span class="font-bold text-slate-900 dark:text-white text-sm">{{ historyVenue?.name }}</span>
            </div>
            <div class="flex items-center gap-4">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">İç Fiyat</span>
                <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ historyVenue?.indoorPrice.toFixed(2) }} ₺</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Dış Fiyat</span>
                <span class="font-mono font-bold text-sky-600 dark:text-sky-400">{{ historyVenue?.outdoorPrice.toFixed(2) }} ₺</span>
              </div>
            </div>
          </div>

          <!-- Tahsilat Özeti -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 font-mono text-center">
            <div class="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
              <span class="text-[10px] font-sans font-semibold text-emerald-800 dark:text-emerald-300 block">Bekleyen Tahsilat</span>
              <span class="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                {{ (historyVenue?.pendingAmount ?? historyVenue?.totalAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
            <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span class="text-[10px] font-sans font-semibold text-slate-600 dark:text-slate-300 block">Toplam Tahsil Edilen</span>
              <span class="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                {{ (historyVenue?.totalCollectedAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
            <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span class="text-[10px] font-sans font-semibold text-slate-600 dark:text-slate-300 block">Toplam Ciro</span>
              <span class="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                {{ (historyVenue?.allTimeTotalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
          </div>

          <!-- Son Tahsilat Bilgisi & Geri Al Butonu -->
          <div v-if="historyVenue?.lastSettledAt" class="pt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 text-emerald-600" />
              <span>Son Tahsilat: <strong>{{ new Date(historyVenue.lastSettledAt).toLocaleString('tr-TR') }}</strong> ({{ (historyVenue.lastSettledAmount || 0).toFixed(2) }} ₺)</span>
            </span>
            <button
              type="button"
              class="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-[10px] font-semibold flex items-center gap-1 underline"
              :disabled="settlingVenue"
              title="Son yapılan tahsilat işlemini geri al ve tutarı tekrar aktif bakiyeye dahil et"
              @click="handleUndoSettle(historyVenue.id)"
            >
              <RotateCcw class="w-3 h-3" />
              <span>Tahsilatı Geri Al</span>
            </button>
          </div>
        </div>

        <!-- Görünüm Seçimi (Tüm Geçmiş Kayıtlar vs Seçili Dönem) -->
        <div class="flex items-center justify-between gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            type="button"
            :class="[
              'flex-1 py-1.5 px-3 rounded-md font-semibold transition-all text-center flex items-center justify-center gap-1.5',
              historyViewMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            ]"
            @click="historyViewMode = 'all'"
          >
            <Calendar class="w-3.5 h-3.5 text-emerald-600" />
            <span>Tüm Geçmiş Kayıtlar ({{ historyVenue?.allDailyBreakdown?.length || 0 }} Gün)</span>
          </button>
          <button
            type="button"
            :class="[
              'flex-1 py-1.5 px-3 rounded-md font-semibold transition-all text-center flex items-center justify-center gap-1.5',
              historyViewMode === 'filtered'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            ]"
            @click="historyViewMode = 'filtered'"
          >
            <Filter class="w-3.5 h-3.5 text-sky-600" />
            <span>Seçili Dönem ({{ activePeriodLabel }})</span>
          </button>
        </div>

        <!-- Günlük Döküm Tablosu (Tahsilat Durumu Kolonlu) -->
        <div v-if="activeHistoryBreakdown && activeHistoryBreakdown.length > 0" class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th class="px-3 py-2.5">Tarih</th>
                <th class="px-3 py-2.5 text-right text-emerald-800 dark:text-emerald-400">İç Mekan</th>
                <th class="px-3 py-2.5 text-right text-sky-800 dark:text-sky-400">Dış Mekan</th>
                <th class="px-3 py-2.5 text-right">Toplam Paket</th>
                <th class="px-3 py-2.5 text-right text-slate-900 dark:text-slate-100">Toplam Tutar</th>
                <th class="px-3 py-2.5 text-center">Durum</th>
                <th class="px-3 py-2.5 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="day in activeHistoryBreakdown"
                :key="day.date"
                class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors font-mono"
              >
                <td class="px-3 py-2.5 font-sans font-semibold text-slate-900 dark:text-slate-100">
                  {{ day.date }}
                </td>
                <td class="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400">
                  <span>{{ day.indoorCount }} Paket</span>
                  <span class="text-[10px] text-slate-400 block font-sans">({{ day.indoorAmount.toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right text-sky-700 dark:text-sky-400">
                  <span>{{ day.outdoorCount }} Paket</span>
                  <span class="text-[10px] text-slate-400 block font-sans">({{ day.outdoorAmount.toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                  {{ day.totalCount }} Adet
                </td>
                <td class="px-3 py-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  {{ day.totalAmount.toFixed(2) }} ₺
                </td>
                <td class="px-3 py-2.5 text-center font-sans">
                  <span
                    v-if="day.isSettled"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  >
                    <CheckCircle2 class="w-2.5 h-2.5" />
                    Tahsil Edildi
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  >
                    <Clock class="w-2.5 h-2.5" />
                    Bekliyor
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center font-sans">
                  <button
                    v-if="!day.isSettled"
                    type="button"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
                    title="Bu tarihteki paket sayılarını güncelle"
                    @click="editDayFromHistory(day.date)"
                  >
                    <Edit2 class="w-3 h-3" />
                    <span>Güncelle</span>
                  </button>
                  <span
                    v-else
                    class="text-[10px] text-slate-400 font-sans italic"
                  >
                    Kilitli
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-900 text-white font-mono text-xs">
              <tr>
                <td class="px-3 py-2.5 font-bold font-sans">DÖKÜM TOPLAMI</td>
                <td class="px-3 py-2.5 text-right text-emerald-400 font-bold">
                  {{ activeHistoryIndoorCount }} Paket
                  <span class="text-[10px] text-slate-400 block font-sans">({{ activeHistoryIndoorAmount.toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right text-sky-400 font-bold">
                  {{ activeHistoryOutdoorCount }} Paket
                  <span class="text-[10px] text-slate-400 block font-sans">({{ activeHistoryOutdoorAmount.toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right font-extrabold text-white">
                  {{ activeHistoryTotalCount }} Adet
                </td>
                <td class="px-3 py-2.5 text-right font-extrabold text-emerald-400 text-sm">
                  {{ activeHistoryTotalAmount.toFixed(2) }} ₺
                </td>
                <td class="px-3 py-2.5 text-center text-[10px] font-sans text-slate-400">
                  Genel Kayıt
                </td>
                <td class="px-3 py-2.5 text-center text-[10px] font-sans text-slate-400">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-else class="text-center py-6 text-slate-500 text-xs bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
          Bu dönem için mekana ait paket teslimat kaydı bulunmuyor.
        </div>

        <div class="pt-2 flex items-center justify-between">
          <BaseButton
            variant="outline"
            size="sm"
            @click="isHistoryModalOpen = false"
          >
            Kapat
          </BaseButton>

          <div class="flex items-center gap-2">
            <BaseButton
              v-if="(historyVenue?.pendingAmount ?? historyVenue?.totalAmount ?? 0) > 0"
              variant="success"
              size="sm"
              @click="isHistoryModalOpen = false; openSettleModal(historyVenue!)"
            >
              <template #leading>
                <Wallet class="w-3.5 h-3.5" />
              </template>
              Tahsilat Al
            </BaseButton>
            <BaseButton
              variant="primary"
              size="sm"
              @click="isHistoryModalOpen = false; openQuickDelivery(historyVenue!)"
            >
              <template #leading>
                <Plus class="w-3.5 h-3.5" />
              </template>
              Bu Mekana Paket Ekle
            </BaseButton>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- 4. MEKAN TAHSİLAT & MANUEL SIFIRLAMA MODAL -->
    <BaseModal
      v-model="isSettleModalOpen"
      :title="`Tahsilat Al — ${venueToSettle?.name || 'Mekan'}`"
      description="Mekandan alınan ödemeyi kaydedin. Girilen tutar ana paradan düşülür; ödemenin tamamı tahsil edildiğinde toplam tutar sıfırlanır, kısmi ödemede ise kalan borç kalmaya devam eder."
    >
      <div v-if="venueToSettle" class="space-y-4">
        <!-- Tutar Özet Kartı (Sıfırlanacak Paket Sayısı ve Paket Tutarı Kaldırıldı, Sadece Ana Para) -->
        <div class="p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-xl border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium">Mekan Adı:</span>
            <span class="text-sm font-bold text-white">{{ venueToSettle.name }}</span>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-800/80 text-center font-mono border-t border-slate-800">
            <span class="text-xs text-slate-400 font-sans block mb-1">Toplam Tahsil Edilecek Tutar (Ana Para)</span>
            <span class="text-2xl font-extrabold text-emerald-400">
              {{ settleTotalDue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </span>
          </div>
        </div>

        <!-- Ödeme Giriş Alanları (Gelen Para ve Kalan Miktar) -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Wallet class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ödeme Detayı & Kalan Bakiye</span>
            </span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors"
                @click="setFullSettlement"
              >
                Tamamı ({{ settleTotalDue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- 1. Gelen Para / Alınan Tahsilat Tutarı -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gelen Para (Tahsil Edilen)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₺</span>
                <input
                  :value="settleCollectedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  @input="onCollectedInput(($event.target as HTMLInputElement).value)"
                />
              </div>
              <span class="text-[10px] text-slate-400 mt-1 block">Mekandan fiilen elinize geçen nakit / havale tutarı</span>
            </div>

            <!-- 2. Kalan Tutar / Mekanın Devredecek Borcu -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kalan Miktar (Devredecek Borç)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₺</span>
                <input
                  :value="settleRemainingAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  @input="onRemainingInput(($event.target as HTMLInputElement).value)"
                />
              </div>
              <span class="text-[10px] text-slate-400 mt-1 block">Eksik gelen para sonrası mekanda kalan borç</span>
            </div>
          </div>

          <!-- Opsiyonel Not Alanı -->
          <div class="pt-1">
            <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tahsilat Notu / Açıklama (İsteğe Bağlı)
            </label>
            <input
              v-model="settleNote"
              type="text"
              maxlength="200"
              placeholder="Örn: 2.500 TL elden alındı, kalan 500 TL haftaya aktarıldı"
              class="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <!-- Dinamik Canlı Bilgilendirme Durum Kartı -->
        <!-- Durum 1: Kalan Tutar 0 (Tam Tahsilat & Sıfırlama) -->
        <div
          v-if="numericRemainingAmount === 0"
          class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1"
        >
          <div class="font-bold flex items-center gap-1.5">
            <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tam Tahsilat: Mekanın Hesabı Sıfırlanacaktır</span>
          </div>
          <p class="text-[11.5px] leading-relaxed text-emerald-800/90 dark:text-emerald-300/90">
            Mekandan toplam <strong>{{ numericCollectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong> tahsil edilmiş olarak kaydedilir ve güncel hesaplanan toplam tutar <strong>0,00 ₺</strong> olarak sıfırlanır.
          </p>
        </div>

        <!-- Durum 2: Kalan Tutar > 0 (Kısmi Tahsilat ve Ana Paradan Düşme) -->
        <div
          v-else-if="numericRemainingAmount > 0"
          class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1"
        >
          <div class="font-bold flex items-center gap-1.5">
            <Clock class="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Kısmi Tahsilat: Ana Paradan Düşülecek</span>
          </div>
          <p class="text-[11.5px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
            Tahsil edilen <strong>{{ numericCollectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong> ana paradan düşülür. Kalan <strong>{{ numericRemainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong> tutar mekanın borcu olarak kalmaya devam eder ve sıfırlanmaz.
          </p>
        </div>

        <!-- Durum 3: Fazla Tahsilat (Gelen para borçtan fazla) -->
        <div
          v-else
          class="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 space-y-1"
        >
          <div class="font-bold flex items-center gap-1.5">
            <Info class="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Fazla Tahsilat</span>
          </div>
          <p class="text-[11.5px] leading-relaxed text-sky-800/90 dark:text-sky-300/90">
            Mekanın borcundan daha fazla ödeme alındı. Artan tutar mekanın sonraki paketleri için artı bakiye olarak devredecektir.
          </p>
        </div>

        <!-- Butonlar -->
        <div class="pt-2 flex items-center justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="md"
            type="button"
            :disabled="settlingVenue"
            @click="isSettleModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            :variant="numericRemainingAmount > 0 ? 'primary' : 'success'"
            size="md"
            :loading="settlingVenue"
            :class="numericRemainingAmount > 0 ? '!bg-amber-600 hover:!bg-amber-700 !text-white' : ''"
            @click="handleConfirmSettle"
          >
            <template #leading>
              <Wallet class="w-4 h-4" />
            </template>
            <span v-if="numericRemainingAmount > 0">
              Kısmi Tahsilatı Düş (Kalan Borç: {{ numericRemainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺)
            </span>
            <span v-else>
              Tahsilatı Onayla ve Tutarı Sıfırla
            </span>
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Silme Onay Modal -->
    <BaseConfirmDialog
      v-model="isConfirmDeleteOpen"
      title="Mekanı Sil"
      :message="venueToDelete ? `&quot;${venueToDelete.name}&quot; mekanını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.` : 'Mekanı silmek istediğinizden emin misiniz?'"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />

    <!-- Gün Sonu Raporu Dışa Aktarma (PDF & Excel) Modalı -->
    <DailyReportExportModal
      v-model="isDailyReportModalOpen"
      :initial-date="filterDate || ''"
    />
  </div>
</template>


