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
  FileSpreadsheet,
  CreditCard,
  Banknote,
  LayoutGrid,
  Table
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
  clearCarriedBalance,
  deleteVenue
} = useVenues()

// Modal states
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentVenueId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const venueToDelete = ref<VenueItem | null>(null)
const isDailyReportModalOpen = ref(false)
const isCollectionsReportModalOpen = ref(false)
const selectedVenueIdForReport = ref<string | null>(null)

const openCollectionsReportModal = (venueId?: string) => {
  selectedVenueIdForReport.value = venueId || null
  isCollectionsReportModalOpen.value = true
}

// Kalan Borcu Silme Onay Durumu
const isClearCarriedModalOpen = ref(false)
const venueToClearCarried = ref<VenueItem | null>(null)
const clearingCarried = ref(false)

// Settle / Tahsilat Modal State
const isSettleModalOpen = ref(false)
const venueToSettle = ref<VenueItem | null>(null)
const settlingVenue = ref(false)
const settleCollectedAmount = ref<string | number>('')
const settleRemainingAmount = ref<string | number>('')
const settlePaymentMethod = ref<'CASH' | 'TRANSFER' | 'SPLIT'>('CASH')
const settleCashAmount = ref<string | number>('')
const settleTransferAmount = ref<string | number>('')
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

const selectPaymentMethod = (method: 'CASH' | 'TRANSFER' | 'SPLIT') => {
  settlePaymentMethod.value = method
  const total = numericCollectedAmount.value
  if (method === 'CASH') {
    settleCashAmount.value = total > 0 ? total : ''
    settleTransferAmount.value = ''
  } else if (method === 'TRANSFER') {
    settleTransferAmount.value = total > 0 ? total : ''
    settleCashAmount.value = ''
  } else {
    // Karma (Split)
    if (total > 0) {
      settleCashAmount.value = (total / 2).toFixed(2)
      settleTransferAmount.value = (total / 2).toFixed(2)
    } else {
      settleCashAmount.value = ''
      settleTransferAmount.value = ''
    }
  }
}

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

  // Ödeme yöntemi dağılımını güncelle
  const total = isNaN(num) ? 0 : Math.max(0, num)
  if (settlePaymentMethod.value === 'CASH') {
    settleCashAmount.value = total > 0 ? total : ''
    settleTransferAmount.value = ''
  } else if (settlePaymentMethod.value === 'TRANSFER') {
    settleTransferAmount.value = total > 0 ? total : ''
    settleCashAmount.value = ''
  } else if (settlePaymentMethod.value === 'SPLIT') {
    settleCashAmount.value = total > 0 ? (total / 2).toFixed(2) : ''
    settleTransferAmount.value = total > 0 ? (total / 2).toFixed(2) : ''
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

  const colNum = parseFloat(String(settleCollectedAmount.value)) || 0
  if (settlePaymentMethod.value === 'CASH') {
    settleCashAmount.value = colNum > 0 ? colNum : ''
  } else if (settlePaymentMethod.value === 'TRANSFER') {
    settleTransferAmount.value = colNum > 0 ? colNum : ''
  }
}

const onSplitCashInput = (val: string | number) => {
  settleCashAmount.value = val
  const clean = String(val).trim().replace(',', '.')
  const cashVal = parseFloat(clean) || 0
  const total = numericCollectedAmount.value
  const trRem = Math.max(0, Number((total - cashVal).toFixed(2)))
  settleTransferAmount.value = trRem
}

const onSplitTransferInput = (val: string | number) => {
  settleTransferAmount.value = val
  const clean = String(val).trim().replace(',', '.')
  const trVal = parseFloat(clean) || 0
  const total = numericCollectedAmount.value
  const cashRem = Math.max(0, Number((total - trVal).toFixed(2)))
  settleCashAmount.value = cashRem
}

const setFullSettlement = () => {
  settleCollectedAmount.value = settleTotalDue.value
  settleRemainingAmount.value = 0
  if (settlePaymentMethod.value === 'CASH') {
    settleCashAmount.value = settleTotalDue.value
    settleTransferAmount.value = ''
  } else if (settlePaymentMethod.value === 'TRANSFER') {
    settleTransferAmount.value = settleTotalDue.value
    settleCashAmount.value = ''
  } else if (settlePaymentMethod.value === 'SPLIT') {
    settleCashAmount.value = (settleTotalDue.value / 2).toFixed(2)
    settleTransferAmount.value = (settleTotalDue.value / 2).toFixed(2)
  }
}

// History / Breakdown Modal State
const isHistoryModalOpen = ref(false)
const historyVenue = ref<VenueItem | null>(null)
const historyViewMode = ref<'all' | 'filtered'>('all')
const historyDisplayMode = ref<'table' | 'cards'>('table')
const historySearchQuery = ref('')

const formatHistoryDayName = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return ''
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.toLocaleDateString('tr-TR', { weekday: 'long' })
  } catch {
    return ''
  }
}

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
  let list = historyViewMode.value === 'filtered'
    ? (historyVenue.value.dailyBreakdown || [])
    : (historyVenue.value.allDailyBreakdown && historyVenue.value.allDailyBreakdown.length > 0
        ? historyVenue.value.allDailyBreakdown
        : (historyVenue.value.dailyBreakdown || []))

  if (historySearchQuery.value.trim()) {
    const q = historySearchQuery.value.trim().toLowerCase()
    list = list.filter(d => d.date.toLowerCase().includes(q))
  }
  return list
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
  settlePaymentMethod.value = 'CASH'
  settleCashAmount.value = total > 0 ? total : ''
  settleTransferAmount.value = ''
  settleNote.value = ''
  isSettleModalOpen.value = true
}

const handleConfirmSettle = async () => {
  if (!venueToSettle.value) return
  settlingVenue.value = true
  try {
    let finalCash = 0
    let finalTransfer = 0
    if (settlePaymentMethod.value === 'CASH') {
      finalCash = numericCollectedAmount.value
      finalTransfer = 0
    } else if (settlePaymentMethod.value === 'TRANSFER') {
      finalCash = 0
      finalTransfer = numericCollectedAmount.value
    } else {
      finalCash = parseFloat(String(settleCashAmount.value).trim().replace(',', '.')) || 0
      finalTransfer = parseFloat(String(settleTransferAmount.value).trim().replace(',', '.')) || 0
    }

    const ok = await settleVenue(venueToSettle.value.id, {
      collectedAmount: numericCollectedAmount.value,
      remainingBalance: numericRemainingAmount.value,
      paymentMethod: settlePaymentMethod.value,
      cashAmount: finalCash,
      transferAmount: finalTransfer,
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

const openClearCarriedModal = (venue: VenueItem) => {
  venueToClearCarried.value = venue
  isClearCarriedModalOpen.value = true
}

const openClearCarriedFromSettleModal = () => {
  if (venueToSettle.value) {
    const target = venueToSettle.value
    isSettleModalOpen.value = false
    openClearCarriedModal(target)
  }
}

const handleConfirmClearCarried = async () => {
  if (!venueToClearCarried.value) return
  clearingCarried.value = true
  try {
    const ok = await clearCarriedBalance(venueToClearCarried.value.id)
    if (ok) {
      isClearCarriedModalOpen.value = false
      venueToClearCarried.value = null
    }
  } finally {
    clearingCarried.value = false
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

        <!-- Haftalık Tahsilat Geçmişi & Raporu Butonu -->
        <BaseButton
          variant="outline"
          size="md"
          class="h-10 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700 font-bold shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
          title="Mekanlardan yapılan haftalık tahsilatları, nakit/havale kırılımlarını ve geçmiş kayıtları raporla"
          @click="openCollectionsReportModal()"
        >
          <template #leading>
            <Receipt class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </template>
          Tahsilat Raporu & Geçmişi
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

    <!-- KPI Summary Cards (Modern Bento Fintech Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Toplam Mekan Sayısı -->
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kayıtlı Mekanlar
            </span>
            <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform border border-slate-200/60 dark:border-slate-700/60">
              <Store class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-3 font-mono tracking-tight">
            <CountUp :value="totalVenuesCount" :decimals="0" /> <span class="text-sm font-semibold text-slate-400 font-sans">Mekan</span>
          </div>
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <span>Aktif Mekan:</span>
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <CountUp :value="activeVenuesCount" :decimals="0" /> Aktif
          </span>
        </div>
      </div>

      <!-- 2. Toplam Atılan Paket Sayısı -->
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 border-l-4 border-l-emerald-500 shadow-xs flex flex-col justify-between group hover:border-emerald-500/40 transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Toplam Atılan Paket</span>
            </span>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-500/20">
              <Package class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-3 font-mono tracking-tight">
            <CountUp :value="totalPackagesAcrossVenues" :decimals="0" /> <span class="text-sm font-semibold font-sans">Adet</span>
          </div>
        </div>
        <div class="text-xs font-medium text-emerald-700/90 dark:text-emerald-400/90 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <span class="font-mono text-[11px]">İç: {{ totalIndoorPackages }} · Dış: {{ totalOutdoorPackages }}</span>
          <span class="font-mono font-bold">{{ totalPackagesAcrossVenues }} Pkt</span>
        </div>
      </div>

      <!-- 3. İç Mekan / Dış Mekan Dağılımı -->
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 border-l-4 border-l-sky-500 shadow-xs flex flex-col justify-between group hover:border-sky-500/40 transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Teslimat Türü Dağılımı
            </span>
            <div class="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform border border-sky-500/20">
              <Layers class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-3 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600 dark:text-slate-400 font-medium">İç Mekan:</span>
              <span class="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60"><CountUp :value="totalIndoorPackages" :decimals="0" /> Paket</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Dış Mekan:</span>
              <span class="font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200/60 dark:border-sky-800/60"><CountUp :value="totalOutdoorPackages" :decimals="0" /> Paket</span>
            </div>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
          Birim fiyatlar üzerinden anlık hesaplanır
        </div>
      </div>

      <!-- 4. Toplam Tutar / Hakediş (Tahsilat Durumu) -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900 dark:to-slate-950 text-white p-5 rounded-2xl border border-slate-800/90 shadow-xs flex flex-col justify-between group hover:border-emerald-500/50 transition-all duration-200">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              {{ currentFilterMode === 'pending' ? 'Bekleyen Tahsilat' : 'Toplam Ciro' }}
            </span>
            <div class="w-9 h-9 rounded-xl bg-slate-800/90 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-700/60">
              <Wallet class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-emerald-400 mt-3 font-mono tracking-tight">
            <CountUp :value="totalAmountAcrossVenues" :decimals="2" /> ₺
          </div>
        </div>
        <div class="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span v-if="currentFilterMode === 'pending'">Tahsil Edilen: {{ totalCollectedAcrossVenues.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
          <span v-else>Aktif Dönem</span>
          <span class="font-mono text-emerald-300 font-bold">{{ totalPackagesAcrossVenues }} Paket</span>
        </div>
      </div>
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
              'group transition-all duration-200 border-b border-slate-100/80 dark:border-slate-800/60',
              venue.isActive
                ? 'hover:bg-slate-50/90 dark:hover:bg-slate-800/50'
                : 'bg-slate-50/40 dark:bg-slate-900/30 opacity-75 hover:opacity-100'
            ]"
          >
            <!-- 1. Mekan Adı & Durum -->
            <td class="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
              <div class="flex items-center gap-3.5">
                <div
                  :class="[
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-105 group-hover:shadow-sm',
                    venue.isActive
                      ? 'bg-gradient-to-br from-emerald-500/10 via-slate-50 to-teal-500/10 text-emerald-600 border-emerald-500/20 dark:from-emerald-950/40 dark:via-slate-850 dark:to-teal-950/40 dark:text-emerald-400 dark:border-emerald-700/40 shadow-2xs'
                      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-850 dark:text-slate-600 dark:border-slate-800'
                  ]"
                >
                  <Store class="w-5 h-5 stroke-[1.8]" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base tracking-tight truncate">
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
                      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-2xs"
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
                  <div class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
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
                <span class="inline-flex items-center px-2.5 py-1 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 text-xs sm:text-sm font-bold font-mono shadow-2xs group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-colors">
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
                <span class="inline-flex items-center px-2.5 py-1 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60 text-xs sm:text-sm font-bold font-mono shadow-2xs group-hover:border-sky-300 dark:group-hover:border-sky-700 transition-colors">
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
                <span class="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs sm:text-sm border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  {{ venue.totalPackageCount || 0 }} Paket
                </span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                  İç: {{ venue.indoorPackageCount || 0 }} · Dış: {{ venue.outdoorPackageCount || 0 }}
                </span>
              </div>
            </td>

            <!-- 5. Toplam Tutar / Hakediş -->
            <td class="px-5 py-4 text-right">
              <div class="flex flex-col items-end gap-1.5">
                <!-- Üst Tutar Kutusu (Fintech Capsule) -->
                <span :class="[
                  'inline-flex items-center px-3.5 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm border transition-all duration-200 shadow-2xs',
                  (venue.totalAmount || 0) > 0
                    ? 'bg-slate-900 text-emerald-400 dark:bg-slate-950 dark:text-emerald-400 border-slate-800 dark:border-slate-700 shadow-emerald-500/5 group-hover:shadow-xs group-hover:scale-[1.02]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                ]">
                  {{ (venue.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>

                <!-- Borcun Tamamı Tahsil Edildi (Sıfırlandı) Rozeti -->
                <span
                  v-if="venue.lastSettledAt && (venue.totalAmount || 0) === 0"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-900/60"
                >
                  <CheckCircle2 class="w-3 h-3 text-emerald-500" />
                  <span>Tahsil Edildi (Sıfırlandı)</span>
                </span>

                <!-- Ödeme Yöntemi Bilgisi: Nakit mi Havale mi? -->
                <!-- 1. Nakit Rozeti -->
                <span
                  v-if="venue.lastPaymentMethod === 'CASH' && (venue.lastCashAmount || venue.lastSettledAmount || 0) > 0"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/80 shadow-2xs"
                  :title="`Son tahsilat elden nakit alındı: ${(venue.lastCashAmount || venue.lastSettledAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`"
                >
                  <Banknote class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Nakit: {{ (venue.lastCashAmount || venue.lastSettledAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
                </span>

                <!-- 2. Havale Rozeti -->
                <span
                  v-else-if="venue.lastPaymentMethod === 'TRANSFER' && (venue.lastTransferAmount || venue.lastSettledAmount || 0) > 0"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold border border-sky-200 dark:border-sky-800/80 shadow-2xs"
                  :title="`Son tahsilat havale / EFT ile alındı: ${(venue.lastTransferAmount || venue.lastSettledAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`"
                >
                  <CreditCard class="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>Havale: {{ (venue.lastTransferAmount || venue.lastSettledAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
                </span>

                <!-- 3. Karma (Nakit + Havale) Rozeti -->
                <div
                  v-else-if="venue.lastPaymentMethod === 'SPLIT'"
                  class="inline-flex items-center gap-1 text-[10px] font-mono font-bold"
                >
                  <span
                    v-if="(venue.lastCashAmount || 0) > 0"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80"
                    :title="`Nakit: ${(venue.lastCashAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`"
                  >
                    <Banknote class="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{{ (venue.lastCashAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }} ₺</span>
                  </span>
                  <span
                    v-if="(venue.lastTransferAmount || 0) > 0"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80"
                    :title="`Havale: ${(venue.lastTransferAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`"
                  >
                    <CreditCard class="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
                    <span>{{ (venue.lastTransferAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }} ₺</span>
                  </span>
                </div>

                <!-- Eski kayıtlar için ödeme yöntemi yoksa ödenen toplam tutar -->
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
                  class="!text-xs !py-1.5 !px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700 font-bold shadow-2xs hover:shadow-xs transition-all active:scale-95"
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
                  class="!text-xs !py-1.5 !px-2.5 text-sky-700 hover:bg-sky-50 border-sky-200 dark:text-sky-300 dark:border-sky-900/60 dark:hover:bg-sky-950/40 font-medium transition-all"
                  title="Günlük Paket Dökümünü ve Hesaplamalarını Gör"
                  @click="openHistoryModal(venue)"
                >
                  <template #leading>
                    <FileText class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  </template>
                  Döküm
                </BaseButton>

                <!-- Mekana Özel Tahsilat Geçmişi Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1.5 !px-2 text-emerald-800 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40 font-medium transition-all"
                  :title="`${venue.name} için haftalık tahsilat raporunu ve ödeme geçmişini aç`"
                  @click="openCollectionsReportModal(venue.id)"
                >
                  <template #leading>
                    <Receipt class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </template>
                </BaseButton>

                <!-- Paket Gir Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1.5 !px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40 font-medium transition-all"
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
      size="4xl"
      :title="`Günlük Paket Dökümü — ${historyVenue?.name || 'Mekan'}`"
      description="Seçilen mekana ait gün gün atılan iç ve dış mekan paket adetleri, tahsilat durumları ve birim fiyat üzerinden hakediş dökümü."
    >
      <div class="space-y-4">
        <!-- Mekan Finansal Durum & Fiyat Kartı -->
        <div class="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs shadow-2xs">
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
                <Store class="w-4 h-4" />
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Mekan</span>
                <span class="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">{{ historyVenue?.name }}</span>
              </div>
            </div>
            <div class="flex items-center gap-3 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div class="text-right">
                <span class="text-slate-400 block text-[9.5px] uppercase font-bold">İç Mekan Birim</span>
                <span class="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{{ (historyVenue?.indoorPrice || 0).toFixed(2) }} ₺</span>
              </div>
              <span class="text-slate-300 dark:text-slate-700">|</span>
              <div class="text-right">
                <span class="text-slate-400 block text-[9.5px] uppercase font-bold">Dış Mekan Birim</span>
                <span class="font-mono font-black text-sky-600 dark:text-sky-400 text-xs sm:text-sm">{{ (historyVenue?.outdoorPrice || 0).toFixed(2) }} ₺</span>
              </div>
            </div>
          </div>

          <!-- Tahsilat Özeti Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 font-mono text-center">
            <div class="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
              <span class="text-[10px] font-sans font-bold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wide">Bekleyen Tahsilat</span>
              <span class="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                {{ (historyVenue?.pendingAmount ?? historyVenue?.totalAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
            <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span class="text-[10px] font-sans font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">Toplam Tahsil Edilen</span>
              <span class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                {{ (historyVenue?.totalCollectedAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
            <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span class="text-[10px] font-sans font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">Toplam Ciro</span>
              <span class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                {{ (historyVenue?.allTimeTotalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
          </div>

          <!-- Son Tahsilat Bilgisi & Geri Al Butonu -->
          <div v-if="historyVenue?.lastSettledAt" class="pt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
            <span class="flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 text-emerald-600" />
              <span>Son Tahsilat: <strong>{{ new Date(historyVenue.lastSettledAt).toLocaleString('tr-TR') }}</strong> ({{ (historyVenue.lastSettledAmount || 0).toFixed(2) }} ₺)</span>
            </span>
            <button
              type="button"
              class="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1 underline cursor-pointer"
              :disabled="settlingVenue"
              title="Son yapılan tahsilat işlemini geri al ve tutarı tekrar aktif bakiyeye dahil et"
              @click="handleUndoSettle(historyVenue.id)"
            >
              <RotateCcw class="w-3 h-3" />
              <span>Tahsilatı Geri Al</span>
            </button>
          </div>
        </div>

        <!-- Görünüm Seçimi & Kontroller -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <!-- Dönem Filtre Butonları -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs flex-1">
            <button
              type="button"
              :class="[
                'flex-1 py-1.5 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                historyViewMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
              @click="historyViewMode = 'all'"
            >
              <Calendar class="w-3.5 h-3.5 text-emerald-600" />
              <span>Tüm Geçmiş ({{ historyVenue?.allDailyBreakdown?.length || 0 }} Gün)</span>
            </button>
            <button
              type="button"
              :class="[
                'flex-1 py-1.5 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                historyViewMode === 'filtered'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
              @click="historyViewMode = 'filtered'"
            >
              <Filter class="w-3.5 h-3.5 text-sky-600" />
              <span>Seçili Dönem ({{ activePeriodLabel }})</span>
            </button>
          </div>

          <!-- Sağ Taraf: Tarih Arama + Tablo/Kart Geçişi -->
          <div class="flex items-center gap-2 self-end sm:self-auto">
            <!-- Tarih Hızlı Arama -->
            <div class="relative w-32 sm:w-36">
              <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="historySearchQuery"
                type="text"
                placeholder="Tarih ara..."
                class="w-full pl-8 pr-2 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <!-- Tablo / Kart Görünüm Butonları -->
            <div class="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <button
                type="button"
                :class="[
                  'px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  historyDisplayMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                ]"
                title="Genişletilmiş Tablo Görünümü"
                @click="historyDisplayMode = 'table'"
              >
                <Table class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Tablo</span>
              </button>
              <button
                type="button"
                :class="[
                  'px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  historyDisplayMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                ]"
                title="Mobil Kart Görünümü"
                @click="historyDisplayMode = 'cards'"
              >
                <LayoutGrid class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Kartlar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 1. TABLO GÖRÜNÜMÜ (Responsive Yatay Kaydırmalı, Asla Kırılmaz) -->
        <div
          v-if="activeHistoryBreakdown && activeHistoryBreakdown.length > 0 && historyDisplayMode === 'table'"
          class="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
        >
          <div class="overflow-x-auto max-h-[55vh] scrollbar-thin">
            <table class="w-full min-w-[680px] text-left text-xs border-collapse">
              <thead class="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th class="px-4 py-3 whitespace-nowrap">Tarih</th>
                  <th class="px-4 py-3 text-right text-emerald-800 dark:text-emerald-400 whitespace-nowrap">İç Mekan</th>
                  <th class="px-4 py-3 text-right text-sky-800 dark:text-sky-400 whitespace-nowrap">Dış Mekan</th>
                  <th class="px-4 py-3 text-right whitespace-nowrap">Toplam Paket</th>
                  <th class="px-4 py-3 text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">Toplam Tutar</th>
                  <th class="px-4 py-3 text-center whitespace-nowrap">Durum</th>
                  <th class="px-4 py-3 text-center whitespace-nowrap">İşlem</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                <tr
                  v-for="day in activeHistoryBreakdown"
                  :key="day.date"
                  class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <!-- 1. Tarih -->
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Calendar class="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span class="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs block">
                          {{ day.date }}
                        </span>
                        <span class="text-[10px] text-slate-400 font-sans block">
                          {{ formatHistoryDayName(day.date) }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- 2. İç Mekan -->
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <div class="inline-flex flex-col items-end">
                      <span class="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                        {{ day.indoorCount }} Paket
                      </span>
                      <span class="text-[10px] font-mono text-slate-400 mt-0.5">
                        ({{ day.indoorAmount.toFixed(2) }} ₺)
                      </span>
                    </div>
                  </td>

                  <!-- 3. Dış Mekan -->
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <div class="inline-flex flex-col items-end">
                      <span class="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
                        {{ day.outdoorCount }} Paket
                      </span>
                      <span class="text-[10px] font-mono text-slate-400 mt-0.5">
                        ({{ day.outdoorAmount.toFixed(2) }} ₺)
                      </span>
                    </div>
                  </td>

                  <!-- 4. Toplam Paket -->
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-900 dark:text-slate-100 text-xs border border-slate-200/80 dark:border-slate-700/80">
                      <Package class="w-3 h-3 text-slate-500" />
                      <span>{{ day.totalCount }} Adet</span>
                    </span>
                  </td>

                  <!-- 5. Toplam Tutar -->
                  <td class="px-4 py-3 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {{ day.totalAmount.toFixed(2) }} ₺
                  </td>

                  <!-- 6. Durum -->
                  <td class="px-4 py-3 text-center whitespace-nowrap font-sans">
                    <span
                      v-if="day.isSettled"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80"
                    >
                      <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                      <span>Tahsil Edildi</span>
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80"
                    >
                      <Clock class="w-3 h-3 text-amber-600" />
                      <span>Bekliyor</span>
                    </span>
                  </td>

                  <!-- 7. İşlem -->
                  <td class="px-4 py-3 text-center whitespace-nowrap font-sans">
                    <button
                      v-if="!day.isSettled"
                      type="button"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      title="Bu tarihteki paket sayılarını güncelle"
                      @click="editDayFromHistory(day.date)"
                    >
                      <Edit2 class="w-3 h-3" />
                      <span>Güncelle</span>
                    </button>
                    <span
                      v-else
                      class="text-[11px] text-slate-400 font-sans italic"
                    >
                      Kilitli
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot class="sticky bottom-0 z-10 bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td class="px-4 py-3 font-bold font-sans whitespace-nowrap">DÖKÜM TOPLAMI</td>
                  <td class="px-4 py-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                    <div>{{ activeHistoryIndoorCount }} Paket</div>
                    <span class="text-[10px] text-slate-400 block font-sans">({{ activeHistoryIndoorAmount.toFixed(2) }} ₺)</span>
                  </td>
                  <td class="px-4 py-3 text-right text-sky-400 font-bold whitespace-nowrap">
                    <div>{{ activeHistoryOutdoorCount }} Paket</div>
                    <span class="text-[10px] text-slate-400 block font-sans">({{ activeHistoryOutdoorAmount.toFixed(2) }} ₺)</span>
                  </td>
                  <td class="px-4 py-3 text-right font-extrabold text-white whitespace-nowrap">
                    {{ activeHistoryTotalCount }} Adet
                  </td>
                  <td class="px-4 py-3 text-right font-extrabold text-emerald-400 text-sm whitespace-nowrap">
                    {{ activeHistoryTotalAmount.toFixed(2) }} ₺
                  </td>
                  <td class="px-4 py-3 text-center text-[10.5px] font-sans text-slate-300 whitespace-nowrap">
                    Genel Kayıt
                  </td>
                  <td class="px-4 py-3 text-center text-slate-500 whitespace-nowrap">
                    —
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- 2. KART GÖRÜNÜMÜ (Mobil Dostu & Kompakt) -->
        <div
          v-else-if="activeHistoryBreakdown && activeHistoryBreakdown.length > 0 && historyDisplayMode === 'cards'"
          class="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin"
        >
          <div
            v-for="day in activeHistoryBreakdown"
            :key="day.date"
            class="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-2xs transition-all space-y-2.5"
          >
            <!-- Kart Üst Bar: Tarih & Durum & Güncelle -->
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Calendar class="w-4 h-4" />
                </div>
                <div>
                  <span class="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm block">
                    {{ day.date }}
                  </span>
                  <span class="text-[11px] text-slate-400 font-sans block">
                    {{ formatHistoryDayName(day.date) }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <!-- Durum Rozeti -->
                <span
                  v-if="day.isSettled"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                  <span>Tahsil Edildi</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  <Clock class="w-3 h-3 text-amber-600" />
                  <span>Bekliyor</span>
                </span>

                <!-- Güncelle Butonu -->
                <button
                  v-if="!day.isSettled"
                  type="button"
                  class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Güncelle"
                  @click="editDayFromHistory(day.date)"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- 3 Kolonlu Metrik Kutucukları -->
            <div class="grid grid-cols-3 gap-2 text-center font-mono">
              <!-- İç Mekan -->
              <div class="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                <span class="text-[9.5px] font-sans font-bold text-emerald-800 dark:text-emerald-300 block uppercase">İç Mekan</span>
                <div class="font-extrabold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {{ day.indoorCount }} Pkt
                </div>
                <div class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {{ day.indoorAmount.toFixed(2) }} ₺
                </div>
              </div>

              <!-- Dış Mekan -->
              <div class="p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
                <span class="text-[9.5px] font-sans font-bold text-sky-800 dark:text-sky-300 block uppercase">Dış Mekan</span>
                <div class="font-extrabold text-xs sm:text-sm text-sky-900 dark:text-sky-200 mt-0.5">
                  {{ day.outdoorCount }} Pkt
                </div>
                <div class="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">
                  {{ day.outdoorAmount.toFixed(2) }} ₺
                </div>
              </div>

              <!-- Toplam Tutar -->
              <div class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span class="text-[9.5px] font-sans font-bold text-slate-600 dark:text-slate-300 block uppercase">Toplam ({{ day.totalCount }} Adet)</span>
                <div class="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                  {{ day.totalAmount.toFixed(2) }} ₺
                </div>
                <div class="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-sans mt-0.5 font-bold">
                  Hakediş
                </div>
              </div>
            </div>
          </div>

          <!-- Kart Görünümü Toplam Özeti -->
          <div class="p-3.5 rounded-2xl bg-slate-900 text-white font-mono shadow-md space-y-2.5">
            <div class="flex items-center justify-between text-xs font-sans font-bold">
              <span class="text-slate-300">DÖKÜM TOPLAMI</span>
              <span class="text-emerald-400 font-mono text-base font-black">{{ activeHistoryTotalAmount.toFixed(2) }} ₺</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-800">
              <div>
                <span class="text-[10px] text-slate-400 block font-sans">İç Mekan</span>
                <span class="text-emerald-400 font-bold">{{ activeHistoryIndoorCount }} Pkt ({{ activeHistoryIndoorAmount.toFixed(2) }} ₺)</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block font-sans">Dış Mekan</span>
                <span class="text-sky-400 font-bold">{{ activeHistoryOutdoorCount }} Pkt ({{ activeHistoryOutdoorAmount.toFixed(2) }} ₺)</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block font-sans">Toplam Paket</span>
                <span class="text-white font-black">{{ activeHistoryTotalCount }} Adet</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-slate-500 text-xs bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <Calendar class="w-8 h-8 text-slate-400 mx-auto opacity-40 mb-1" />
          <p class="font-semibold text-slate-700 dark:text-slate-300">Teslimat Kaydı Bulunamadı</p>
          <p class="text-[11px] text-slate-400">Bu dönem veya arama kriterine uygun mekana ait paket teslimat kaydı bulunmuyor.</p>
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

          <!-- Eğer önceki devir borcu varsa göster ve doğrudan silme butonu sun -->
          <div
            v-if="venueToSettle.carriedBalance && venueToSettle.carriedBalance > 0"
            class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-200"
          >
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span>Bu tutarın <strong>{{ venueToSettle.carriedBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong> kısmı önceki kalan borçtur.</span>
            </div>
            <button
              type="button"
              class="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
              title="Önceki kalan borcu ödendi olarak işaretle ve sil"
              @click="openClearCarriedFromSettleModal"
            >
              Borcu Sil
            </button>
          </div>
        </div>

        <!-- Ödeme Giriş Alanları (Gelen Para, Ödeme Yöntemi ve Kalan Miktar) -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Wallet class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ödeme Detayı & Kalan Bakiye</span>
            </span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="px-2.5 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors shadow-2xs"
                @click="setFullSettlement"
              >
                Tamamı ({{ settleTotalDue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺)
              </button>
            </div>
          </div>

          <!-- Ödeme Yöntemi Seçici (Nakit / Havale / Karma) -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ödeme Şekli
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                :class="[
                  'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold border transition-all',
                  settlePaymentMethod === 'CASH'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                ]"
                @click="selectPaymentMethod('CASH')"
              >
                <Banknote class="w-3.5 h-3.5" />
                <span>Nakit</span>
              </button>

              <button
                type="button"
                :class="[
                  'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold border transition-all',
                  settlePaymentMethod === 'TRANSFER'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                ]"
                @click="selectPaymentMethod('TRANSFER')"
              >
                <CreditCard class="w-3.5 h-3.5" />
                <span>Havale / EFT</span>
              </button>

              <button
                type="button"
                :class="[
                  'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold border transition-all',
                  settlePaymentMethod === 'SPLIT'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                ]"
                @click="selectPaymentMethod('SPLIT')"
              >
                <Layers class="w-3.5 h-3.5" />
                <span>Karma (İkisi)</span>
              </button>
            </div>
          </div>

          <!-- Gelen Para ve Kalan Miktar Alanları -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- 1. Gelen Para / Alınan Tahsilat Tutarı -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gelen Toplam Tutar (Tahsil Edilen)
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
              <span class="text-[10px] text-slate-400 mt-1 block">Mekandan fiilen elinize geçen toplam tutar</span>
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
              <span class="text-[10px] text-slate-400 mt-1 block">Eksik tahsilat sonrası mekanda kalan borç</span>
            </div>
          </div>

          <!-- Karma (Split) Seçildiyse: Nakit ve Havale Ayrımı Girişi -->
          <div v-if="settlePaymentMethod === 'SPLIT'" class="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
            <span class="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
              Karma Ödeme Detayı (Nakit & Havale Dağılımı)
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Banknote class="w-3 h-3 text-emerald-600" />
                  <span>Nakit Kısmı</span>
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₺</span>
                  <input
                    :value="settleCashAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-full pl-7 pr-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    @input="onSplitCashInput(($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <CreditCard class="w-3 h-3 text-sky-600" />
                  <span>Havale Kısmı</span>
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₺</span>
                  <input
                    :value="settleTransferAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-full pl-7 pr-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    @input="onSplitTransferInput(($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
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
            Mekandan toplam <strong>{{ numericCollectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong>
            <span class="font-semibold text-emerald-700 dark:text-emerald-300">
              ({{ settlePaymentMethod === 'TRANSFER' ? 'Havale/EFT ile' : settlePaymentMethod === 'SPLIT' ? `${(parseFloat(String(settleCashAmount)) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ Nakit + ${(parseFloat(String(settleTransferAmount)) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ Havale` : 'Nakit olarak' }})
            </span>
            tahsil edilmiş olarak kaydedilir ve güncel hesaplanan toplam borç <strong>0,00 ₺</strong> olarak sıfırlanır. Kalan borç etiketi tamamen kalkar.
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
            Tahsil edilen <strong>{{ numericCollectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong>
            <span class="font-semibold text-amber-700 dark:text-amber-300">
              ({{ settlePaymentMethod === 'TRANSFER' ? 'Havale/EFT ile' : settlePaymentMethod === 'SPLIT' ? `${(parseFloat(String(settleCashAmount)) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ Nakit + ${(parseFloat(String(settleTransferAmount)) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ Havale` : 'Nakit olarak' }})
            </span>
            ana paradan düşülür. Kalan <strong>{{ numericRemainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong> tutar mekanın borcu olarak kalmaya devam eder.
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

    <!-- Kalan Borcu Silme Onay Modal -->
    <BaseConfirmDialog
      v-model="isClearCarriedModalOpen"
      title="Kalan Borcu Sil / Sıfırla"
      :message="venueToClearCarried ? `&quot;${venueToClearCarried.name}&quot; mekanına ait ${venueToClearCarried.carriedBalance?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ tutarındaki kalan borç ödendiği için sistemden silinecektir. Toplam tutardan bu borç düşülecektir. Onaylıyor musunuz?` : 'Kalan borcu silmek istediğinizden emin misiniz?'"
      confirm-text="Borcu Sil ve Sıfırla"
      variant="danger"
      :loading="clearingCarried"
      @confirm="handleConfirmClearCarried"
    />

    <!-- Gün Sonu Raporu Dışa Aktarma (PDF & Excel) Modalı -->
    <DailyReportExportModal
      v-model="isDailyReportModalOpen"
      :initial-date="filterDate || ''"
    />

    <!-- Haftalık Tahsilat Raporu & Geçmişi Modalı -->
    <VenueCollectionsReportModal
      v-model="isCollectionsReportModalOpen"
      :initial-venue-id="selectedVenueIdForReport"
    />
  </div>
</template>


