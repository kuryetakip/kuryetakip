<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import {
  Plus,
  Users,
  Search,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Phone,
  Eye,
  Bike,
  Store,
  Calendar,
  Layers,
  Package,
  TrendingUp,
  Sparkles,
  MessageSquare,
  FileText,
  Copy,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Tag,
  AlertTriangle,
  Wallet,
  MoreHorizontal,
  MoreVertical,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-vue-next'
import { useCouriers, type CourierItem, type CourierFormData } from '~/composables/useCouriers'
import { useDeliveries } from '~/composables/useDeliveries'
import { useVenues } from '~/composables/useVenues'
import { whatsAppShareService } from '~/services/whatsapp/whatsappShareService'
import type { WhatsAppMessagePayload } from '~/services/whatsapp/types'
import { useToast } from '~/composables/useToast'

useHead({
  title: 'Kuryeler — Günlük Paket Takibi & Hakediş — KuryeTakip'
})

const toast = useToast()

const {
  couriers,
  loading,
  searchQuery,
  filterDate,
  fetchCouriers,
  createCourier,
  updateCourier,
  updateCourierPaidAmount,
  toggleCourierStatus,
  deleteCourier,
  createTransaction
} = useCouriers()

const { venues, fetchVenues } = useVenues()
const { createDelivery, updateDelivery, deleteDelivery } = useDeliveries()

// Inline Paid Amount (Avans / Ödenen) State
const courierPaidInputs = ref<Record<string, string | number>>({})
const savingPaidCourierId = ref<string | null>(null)

const onPaidAmountInput = (courierId: string, val: string) => {
  courierPaidInputs.value[courierId] = val
}

const getCourierPaidAmount = (courier: CourierItem) => {
  if (courierPaidInputs.value[courier.id] !== undefined) {
    const val = Number(courierPaidInputs.value[courier.id])
    return isNaN(val) ? 0 : val
  }
  return Number(courier.paidAmount || 0)
}

const getCourierRemainingBalance = (courier: CourierItem) => {
  const tot = courier.cumulativeTotalAmount ?? courier.totalEarnings ?? 0
  const paid = getCourierPaidAmount(courier)
  return Number((tot - paid).toFixed(2))
}

const savePaidAmount = async (courier: CourierItem) => {
  const inputVal = courierPaidInputs.value[courier.id]
  if (inputVal === undefined) return
  const num = Number(inputVal)
  if (isNaN(num) || num < 0) {
    toast.error('Geçerli bir verilen tutar giriniz.', 'Hata')
    return
  }
  if (num === (courier.paidAmount || 0)) {
    delete courierPaidInputs.value[courier.id]
    return
  }

  savingPaidCourierId.value = courier.id
  try {
    const success = await updateCourierPaidAmount(courier.id, num)
    if (success) {
      delete courierPaidInputs.value[courier.id]
      await fetchCouriers()
    }
  } finally {
    savingPaidCourierId.value = null
  }
}

// Dropdown & responsive view mode state
const activeActionDropdownId = ref<string | null>(null)
const viewMode = ref<'table' | 'cards'>('table')

const toggleActionDropdown = (id: string, e?: Event) => {
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }
  activeActionDropdownId.value = activeActionDropdownId.value === id ? null : id
}

const closeAllDropdowns = () => {
  activeActionDropdownId.value = null
}

// Past delivery record edit modal state
const isEditDeliveryModalOpen = ref(false)
const editDeliveryLoading = ref(false)
const editDeliveryForm = ref({
  id: '',
  date: '',
  courierId: '',
  venueId: '',
  deliveryType: 'INDOOR' as 'INDOOR' | 'OUTDOOR',
  packageCount: 1 as string | number,
  courierUnitPrice: 0 as string | number
})
const editDeliveryErrors = ref<Record<string, string>>({})

// Delivery record delete confirm state
const isConfirmDeleteDeliveryOpen = ref(false)
const deliveryToDelete = ref<any | null>(null)
const deleteDeliveryLoading = ref(false)

const openEditDeliveryModal = (record: any) => {
  editDeliveryForm.value = {
    id: record.id,
    date: record.date,
    courierId: record.courierId || detailCourier.value?.id || '',
    venueId: record.venueId || '',
    deliveryType: record.deliveryType || 'INDOOR',
    packageCount: record.packageCount,
    courierUnitPrice: record.courierPriceSnapshot !== undefined && record.courierPriceSnapshot > 0
      ? record.courierPriceSnapshot
      : record.unitPriceSnapshot
  }
  editDeliveryErrors.value = {}
  isEditDeliveryModalOpen.value = true
}

const editDeliveryCalculatedTotal = computed(() => {
  const count = Number(editDeliveryForm.value.packageCount) || 0
  const price = Number(editDeliveryForm.value.courierUnitPrice) || 0
  if (count <= 0 || price < 0) return 0
  return Number((count * price).toFixed(2))
})

const validateEditDeliveryForm = () => {
  const errors: Record<string, string> = {}
  if (!editDeliveryForm.value.date) {
    errors.date = 'Tarih zorunludur.'
  }
  const count = Number(editDeliveryForm.value.packageCount)
  if (isNaN(count) || !Number.isInteger(count) || count <= 0) {
    errors.packageCount = 'Paket sayısı en az 1 tam sayı olmalıdır.'
  }
  const price = Number(editDeliveryForm.value.courierUnitPrice)
  if (isNaN(price) || price < 0) {
    errors.courierUnitPrice = 'Geçerli bir hakediş birim fiyatı giriniz.'
  }
  editDeliveryErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleEditDeliverySubmit = async () => {
  if (!validateEditDeliveryForm() || !editDeliveryForm.value.id) return
  editDeliveryLoading.value = true
  try {
    const payload = {
      date: editDeliveryForm.value.date,
      courierId: editDeliveryForm.value.courierId,
      venueId: editDeliveryForm.value.venueId || undefined,
      deliveryType: editDeliveryForm.value.deliveryType,
      packageCount: Number(editDeliveryForm.value.packageCount),
      courierUnitPrice: Number(editDeliveryForm.value.courierUnitPrice),
      unitPrice: Number(editDeliveryForm.value.courierUnitPrice)
    }
    const success = await updateDelivery(editDeliveryForm.value.id, payload)
    if (success) {
      isEditDeliveryModalOpen.value = false
      toast.success('Geçmiş paket kaydı başarıyla güncellendi.', 'Güncellendi')
      await fetchDetailReport()
      await fetchCouriers()
    }
  } finally {
    editDeliveryLoading.value = false
  }
}

const openDeleteDeliveryConfirm = (record: any) => {
  deliveryToDelete.value = record
  isConfirmDeleteDeliveryOpen.value = true
}

const handleConfirmDeleteDelivery = async () => {
  if (!deliveryToDelete.value) return
  deleteDeliveryLoading.value = true
  try {
    const success = await deleteDelivery(deliveryToDelete.value.id)
    if (success) {
      isConfirmDeleteDeliveryOpen.value = false
      deliveryToDelete.value = null
      toast.success('Paket kaydı silindi ve kurye hakedişi güncellendi.', 'Silindi')
      await fetchDetailReport()
      await fetchCouriers()
    }
  } finally {
    deleteDeliveryLoading.value = false
  }
}

// Quick Delivery Modal State
const isQuickDeliveryModalOpen = ref(false)
const quickDeliveryCourier = ref<CourierItem | null>(null)
const quickDeliveryLoading = ref(false)
const quickDeliveryForm = ref({
  date: new Date().toISOString().substring(0, 10),
  courierId: '',
  venueId: '',
  venueIndoorPrice: '' as string | number,
  venueOutdoorPrice: '' as string | number,
  courierIndoorPrice: '' as string | number,
  courierOutdoorPrice: '' as string | number,
  indoorPrice: '' as string | number,
  indoorCount: '' as string | number,
  outdoorPrice: '' as string | number,
  outdoorCount: '' as string | number
})
const quickDeliveryErrors = ref<Record<string, string>>({})

// Modal states
const isAddModalOpen = ref(false)
const isEditing = ref(false)
const currentCourierId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const courierToDelete = ref<CourierItem | null>(null)

// Courier Detail Modal State
const isTransactionModalOpen = ref(false)
const transactionCourier = ref<CourierItem | null>(null)
const transactionForm = ref({
  amount: '',
  date: new Date().toISOString().substring(0, 10),
  description: ''
})
const transactionErrors = ref<Record<string, string>>({})
const transactionLoading = ref(false)

const openTransactionModal = (courier: CourierItem) => {
  transactionCourier.value = courier
  transactionForm.value = {
    amount: '',
    date: new Date().toISOString().substring(0, 10),
    description: ''
  }
  transactionErrors.value = {}
  isTransactionModalOpen.value = true
}

const validateTransactionForm = () => {
  const errors: Record<string, string> = {}
  const amount = Number(transactionForm.value.amount)
  if (!transactionForm.value.amount || amount === 0 || isNaN(amount)) {
    errors.amount = 'Geçerli bir tutar giriniz (sıfır olamaz, düzeltme için negatif değer girebilirsiniz).'
  }
  if (!transactionForm.value.date) {
    errors.date = 'Tarih zorunludur.'
  }
  transactionErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleTransactionSubmit = async () => {
  if (!validateTransactionForm() || !transactionCourier.value) return
  transactionLoading.value = true
  const success = await createTransaction(transactionCourier.value.id, {
    amount: Number(transactionForm.value.amount),
    date: transactionForm.value.date,
    description: transactionForm.value.description
  })
  transactionLoading.value = false
  if (success) {
    isTransactionModalOpen.value = false
  }
}

// Courier Detail Modal State
const isDetailModalOpen = ref(false)
const detailCourier = ref<CourierItem | null>(null)
const detailMode = ref<'daily' | 'weekly'>('daily')
const detailStartDate = ref(new Date().toISOString().substring(0, 10))
const detailEndDate = ref(new Date().toISOString().substring(0, 10))
const detailLoading = ref(false)
const detailReportData = ref<any | null>(null)

// WhatsApp Share Modal State
const isWhatsAppModalOpen = ref(false)
const whatsAppPayload = ref<WhatsAppMessagePayload>({
  recipientName: '',
  recipientPhone: '',
  startDate: '',
  endDate: '',
  totalPackages: 0,
  totalAmount: 0,
  currency: 'TL',
  records: []
})

// Form state (Add / Edit)
const formData = ref<CourierFormData>({
  name: '',
  phone: '',
  indoorPrice: '',
  outdoorPrice: '',
  isActive: true
})
const formErrors = ref<Record<string, string>>({})

const columns = [
  { key: 'courier', label: 'Kurye Bilgisi', align: 'left' as const },
  { key: 'indoor', label: 'İç Mekan', align: 'right' as const },
  { key: 'outdoor', label: 'Dış Mekan', align: 'right' as const },
  { key: 'totalPackages', label: 'Toplam Paket', align: 'center' as const },
  { key: 'totalEarnings', label: 'Toplam Hakediş', align: 'right' as const },
  { key: 'paidAmount', label: 'Verilen Avans', align: 'center' as const },
  { key: 'remainingBalance', label: 'Kalan Hakediş', align: 'right' as const }
]

// KPI calculations across all filtered couriers for the selected date & overall
const totalCouriersCount = computed(() => couriers.value.length)
const activeCouriersCount = computed(() => couriers.value.filter(c => c.isActive).length)
const totalIndoorAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.todayIndoorPackages || 0), 0)
})
const totalIndoorAmountAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.todayIndoorAmount || 0), 0)
})
const totalOutdoorAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.todayOutdoorPackages || 0), 0)
})
const totalOutdoorAmountAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.todayOutdoorAmount || 0), 0)
})
const totalPackagesAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.todayTotalPackages || 0), 0)
})
const totalAmountAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.todayTotalAmount || 0), 0)
})

// Cumulative totals across all couriers
const totalCumulativeEarningsAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + (c.cumulativeTotalAmount ?? c.totalEarnings ?? 0), 0)
})
const totalPaidAcrossCouriers = computed(() => {
  return couriers.value.reduce((sum, c) => sum + getCourierPaidAmount(c), 0)
})
const totalRemainingBalanceAcrossCouriers = computed(() => {
  return Number((totalCumulativeEarningsAcrossCouriers.value - totalPaidAcrossCouriers.value).toFixed(2))
})

// Filtered couriers based on search query
const filteredCouriers = computed(() => {
  if (!searchQuery.value.trim()) return couriers.value
  const q = searchQuery.value.toLowerCase().trim()
  return couriers.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone && c.phone.toLowerCase().includes(q))
  )
})

// Quick date filter buttons
const setDateFilter = (type: 'today' | 'yesterday') => {
  if (type === 'today') {
    filterDate.value = new Date().toISOString().substring(0, 10)
  } else if (type === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    filterDate.value = d.toISOString().substring(0, 10)
  }
  fetchCouriers()
}

// Fetch detailed report for the selected courier in modal
const fetchDetailReport = async () => {
  if (!detailCourier.value) return
  detailLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/reports/courier', {
      query: {
        courierId: detailCourier.value.id,
        startDate: detailStartDate.value,
        endDate: detailEndDate.value
      }
    })
    if (res.success) {
      detailReportData.value = res.data
    }
  } catch (err: any) {
    console.error('Fetch detail report error:', err)
    toast.error(err?.data?.message || 'Kurye hakediş detayları yüklenemedi.', 'Hata')
  } finally {
    detailLoading.value = false
  }
}

// Detail Date Presets
const setDetailDaily = (dateStr: string) => {
  detailMode.value = 'daily'
  detailStartDate.value = dateStr
  detailEndDate.value = dateStr
  fetchDetailReport()
}

const setDetailWeekly = (type: 'thisWeek' | 'lastWeek' | 'thisMonth') => {
  detailMode.value = 'weekly'
  const today = new Date()

  if (type === 'thisWeek') {
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Monday
    const monday = new Date(today.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    detailStartDate.value = monday.toISOString().substring(0, 10)
    detailEndDate.value = sunday.toISOString().substring(0, 10)
  } else if (type === 'lastWeek') {
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7 // Prev Monday
    const monday = new Date(today.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    detailStartDate.value = monday.toISOString().substring(0, 10)
    detailEndDate.value = sunday.toISOString().substring(0, 10)
  } else if (type === 'thisMonth') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    detailStartDate.value = firstDay.toISOString().substring(0, 10)
    detailEndDate.value = lastDay.toISOString().substring(0, 10)
  }
  fetchDetailReport()
}

// Open Detail Modal
const openDetailModal = (courier: CourierItem) => {
  detailCourier.value = courier
  detailMode.value = 'daily'
  const targetDate = filterDate.value || new Date().toISOString().substring(0, 10)
  detailStartDate.value = targetDate
  detailEndDate.value = targetDate
  detailReportData.value = null
  isDetailModalOpen.value = true
  fetchDetailReport()
}

// Open WhatsApp Modal for a courier
const openWhatsAppModal = (courier: CourierItem) => {
  const targetDate = filterDate.value || new Date().toISOString().substring(0, 10)
  const dParts = targetDate.split('-')
  const dateFormatted = dParts.length === 3 ? `${dParts[2]}.${dParts[1]}.${dParts[0]}` : targetDate

  whatsAppPayload.value = {
    recipientName: courier.name,
    recipientPhone: courier.phone || '',
    startDate: dateFormatted,
    endDate: dateFormatted,
    totalPackages: courier.todayTotalPackages || 0,
    totalAmount: courier.todayTotalAmount || 0,
    currency: 'TL',
    records: []
  }
  isWhatsAppModalOpen.value = true
}

// Open WhatsApp Modal from inside Detail Modal with complete itemized breakdown
const openWhatsAppFromDetail = () => {
  if (!detailReportData.value || !detailCourier.value) return

  const rep = detailReportData.value
  whatsAppPayload.value = {
    recipientName: rep.courier?.name || detailCourier.value.name,
    recipientPhone: rep.courier?.phone || detailCourier.value.phone || '',
    startDate: rep.startDateFormatted || rep.startDate,
    endDate: rep.endDateFormatted || rep.endDate,
    totalPackages: rep.totalPackageCount || 0,
    totalAmount: rep.totalAmount || 0,
    currency: 'TL',
    records: (rep.records || []).map((r: any) => ({
      date: r.dateFormatted || r.date,
      venueName: r.venueName,
      deliveryTypeLabel: r.deliveryTypeLabel || (r.deliveryType === 'INDOOR' ? 'İç Mekan' : 'Dış Mekan'),
      packageCount: r.packageCount,
      unitPrice: r.unitPriceSnapshot,
      totalAmount: r.totalAmount
    }))
  }
  isWhatsAppModalOpen.value = true
}

const openAddModal = () => {
  isEditing.value = false
  currentCourierId.value = null
  formData.value = {
    name: '',
    phone: '',
    indoorPrice: '',
    outdoorPrice: '',
    paidAmount: '',
    isActive: true
  }
  formErrors.value = {}
  isAddModalOpen.value = true
}

const openEditModal = (courier: CourierItem) => {
  isEditing.value = true
  currentCourierId.value = courier.id
  formData.value = {
    name: courier.name,
    phone: courier.phone || '',
    indoorPrice: courier.indoorPrice !== undefined && courier.indoorPrice > 0 ? courier.indoorPrice : '',
    outdoorPrice: courier.outdoorPrice !== undefined && courier.outdoorPrice > 0 ? courier.outdoorPrice : '',
    paidAmount: courier.paidAmount !== undefined && courier.paidAmount > 0 ? courier.paidAmount : '',
    isActive: courier.isActive
  }
  formErrors.value = {}
  isAddModalOpen.value = true
}

const openDeleteConfirm = (courier: CourierItem) => {
  courierToDelete.value = courier
  isConfirmDeleteOpen.value = true
}

const handleConfirmDelete = async () => {
  if (courierToDelete.value) {
    await deleteCourier(courierToDelete.value.id)
    isConfirmDeleteOpen.value = false
    courierToDelete.value = null
  }
}

const validateForm = () => {
  const errors: Record<string, string> = {}
  if (!formData.value.name.trim()) {
    errors.name = 'Kurye ad ve soyadı zorunludur.'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleFormSubmit = async () => {
  if (!validateForm()) return

  if (isEditing.value && currentCourierId.value) {
    const success = await updateCourier(currentCourierId.value, formData.value)
    if (success) isAddModalOpen.value = false
  } else {
    const success = await createCourier(formData.value)
    if (success) isAddModalOpen.value = false
  }
}

// Quick Package Entry State & Handlers
const activeCouriersList = computed(() => couriers.value.filter(c => c.isActive))
const activeVenuesList = computed(() => venues.value.filter(v => v.isActive))

const fetchQuickRates = async (cId: string, vId: string) => {
  if (!cId || !vId) return
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/deliveries/rates', {
      query: { courierId: cId, venueId: vId, deliveryType: 'INDOOR' }
    })
    if (res.success && res.data) {
      quickDeliveryForm.value.venueIndoorPrice = res.data.venueIndoorPrice
      quickDeliveryForm.value.venueOutdoorPrice = res.data.venueOutdoorPrice
      quickDeliveryForm.value.courierIndoorPrice = res.data.courierIndoorPrice
      quickDeliveryForm.value.courierOutdoorPrice = res.data.courierOutdoorPrice
      quickDeliveryForm.value.indoorPrice = res.data.courierIndoorPrice
      quickDeliveryForm.value.outdoorPrice = res.data.courierOutdoorPrice
    }
  } catch (err) {
    console.error('Fetch quick rates error:', err)
  }
}

const onQuickVenueChange = (venueId: string) => {
  quickDeliveryForm.value.venueId = venueId
  if (venueId && quickDeliveryForm.value.courierId) {
    fetchQuickRates(quickDeliveryForm.value.courierId, venueId)
  }
}

const quickIndoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.indoorCount) || 0
  const price = Number(quickDeliveryForm.value.indoorPrice ?? quickDeliveryForm.value.courierIndoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const quickOutdoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.outdoorCount) || 0
  const price = Number(quickDeliveryForm.value.outdoorPrice ?? quickDeliveryForm.value.courierOutdoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const quickVenueIndoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.indoorCount) || 0
  const price = Number(quickDeliveryForm.value.venueIndoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const quickVenueOutdoorTotal = computed(() => {
  const count = Number(quickDeliveryForm.value.outdoorCount) || 0
  const price = Number(quickDeliveryForm.value.venueOutdoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const quickVenueGrandTotal = computed(() => {
  return Number((quickVenueIndoorTotal.value + quickVenueOutdoorTotal.value).toFixed(2))
})

const quickTotalPackages = computed(() => {
  const indoor = Number(quickDeliveryForm.value.indoorCount) || 0
  const outdoor = Number(quickDeliveryForm.value.outdoorCount) || 0
  return (indoor > 0 ? indoor : 0) + (outdoor > 0 ? outdoor : 0)
})

const quickGrandTotal = computed(() => {
  return Number((quickIndoorTotal.value + quickOutdoorTotal.value).toFixed(2))
})

const quickNetProfit = computed(() => {
  return Number((quickVenueGrandTotal.value - quickGrandTotal.value).toFixed(2))
})

const onQuickCourierChange = (courierId: string) => {
  quickDeliveryForm.value.courierId = courierId
  const c = couriers.value.find(item => item.id === courierId)
  if (c) {
    quickDeliveryCourier.value = c
    if (c.indoorPrice) {
      quickDeliveryForm.value.courierIndoorPrice = c.indoorPrice
      quickDeliveryForm.value.indoorPrice = c.indoorPrice
    }
    if (c.outdoorPrice) {
      quickDeliveryForm.value.courierOutdoorPrice = c.outdoorPrice
      quickDeliveryForm.value.outdoorPrice = c.outdoorPrice
    }
  }
}

const openQuickDeliveryModal = async (courier?: CourierItem) => {
  quickDeliveryCourier.value = courier || null
  const targetDate = filterDate.value || new Date().toISOString().substring(0, 10)
  const targetCourierId = courier ? courier.id : (activeCouriersList.value[0]?.id || '')
  const selectedC = courier || couriers.value.find(c => c.id === targetCourierId)

  quickDeliveryForm.value = {
    date: targetDate,
    courierId: targetCourierId,
    courierIndoorPrice: selectedC?.indoorPrice ? selectedC.indoorPrice : 0,
    courierOutdoorPrice: selectedC?.outdoorPrice ? selectedC.outdoorPrice : 0,
    indoorPrice: selectedC?.indoorPrice ? selectedC.indoorPrice : 0,
    indoorCount: '',
    outdoorPrice: selectedC?.outdoorPrice ? selectedC.outdoorPrice : 0,
    outdoorCount: ''
  }
  quickDeliveryErrors.value = {}
  isQuickDeliveryModalOpen.value = true
}

const validateQuickDeliveryForm = () => {
  const errors: Record<string, string> = {}
  if (!quickDeliveryForm.value.date) {
    errors.date = 'Tarih zorunludur.'
  }
  if (!quickDeliveryForm.value.courierId && !quickDeliveryCourier.value) {
    errors.general = 'Kurye bilgisi bulunamadı. Lütfen bir kurye satırından tekrar deneyin.'
  }

  const indoorCountNum = Number(quickDeliveryForm.value.indoorCount) || 0
  const outdoorCountNum = Number(quickDeliveryForm.value.outdoorCount) || 0

  if (indoorCountNum <= 0 && outdoorCountNum <= 0) {
    errors.general = 'En az bir teslimat tipi için (İç Paket veya Dış Paket) paket sayısı girmelisiniz.'
  }

  if (indoorCountNum > 0) {
    const p = Number(quickDeliveryForm.value.courierIndoorPrice || quickDeliveryForm.value.indoorPrice)
    if (isNaN(p) || p < 0) {
      errors.indoorPrice = 'Geçerli bir iç paket hakediş fiyatı giriniz.'
    }
  }

  if (outdoorCountNum > 0) {
    const p = Number(quickDeliveryForm.value.courierOutdoorPrice || quickDeliveryForm.value.outdoorPrice)
    if (isNaN(p) || p < 0) {
      errors.outdoorPrice = 'Geçerli bir dış paket hakediş fiyatı giriniz.'
    }
  }

  quickDeliveryErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleQuickDeliverySubmit = async () => {
  if (!validateQuickDeliveryForm()) return
  quickDeliveryLoading.value = true
  try {
    const cIndoor = Number(quickDeliveryForm.value.indoorPrice ?? quickDeliveryForm.value.courierIndoorPrice) || 0
    const cOutdoor = Number(quickDeliveryForm.value.outdoorPrice ?? quickDeliveryForm.value.courierOutdoorPrice) || 0

    const payload = {
      date: quickDeliveryForm.value.date,
      courierId: quickDeliveryForm.value.courierId,
      indoorCount: Number(quickDeliveryForm.value.indoorCount) || 0,
      outdoorCount: Number(quickDeliveryForm.value.outdoorCount) || 0,
      courierIndoorPrice: cIndoor,
      courierOutdoorPrice: cOutdoor,
      indoorPrice: cIndoor,
      outdoorPrice: cOutdoor
    }

    const success = await createDelivery(payload)
    if (success) {
      isQuickDeliveryModalOpen.value = false
      await fetchCouriers()
      if (isDetailModalOpen.value && detailCourier.value) {
        await fetchDetailReport()
      }
    }
  } finally {
    quickDeliveryLoading.value = false
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('click', closeAllDropdowns)
    if (window.innerWidth < 1024) {
      viewMode.value = 'cards'
    }
  }
  await Promise.all([
    fetchCouriers(),
    fetchVenues()
  ])
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', closeAllDropdowns)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Bike class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Kuryeler</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kuryelerin günlük iç ve dış mekan teslimat adetlerini, hakedişlerini takip edin ve WhatsApp raporu gönderin.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <BaseButton
          variant="outline"
          size="md"
          :disabled="loading"
          @click="fetchCouriers()"
        >
          <template #leading>
            <RefreshCw :class="['w-4 h-4', loading ? 'animate-spin' : '']" />
          </template>
          Yenile
        </BaseButton>
        <BaseButton
          variant="outline"
          size="md"
          class="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold"
          @click="openQuickDeliveryModal()"
        >
          <template #leading>
            <Package class="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </template>
          Paket Gir
        </BaseButton>
        <BaseButton variant="primary" size="md" @click="openAddModal">
          <template #leading>
            <Plus class="w-4 h-4" />
          </template>
          Kurye Ekle
        </BaseButton>
      </div>
    </div>

    <!-- KPI Summary Cards (Toplam Kurye, Günlük İç/Dış Paket ve Hakediş) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Kayıtlı Kuryeler -->
      <BaseCard no-padding class="p-4 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Kayıtlı Kuryeler
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {{ totalCouriersCount }} Kurye
          </div>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Aktif Kurye:</span>
          <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ activeCouriersCount }} Aktif</span>
        </div>
      </BaseCard>

      <!-- 2. Seçilen Gün Paket ve Hakediş -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
            <span>Seçilen Gün: Paketler</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            {{ totalPackagesAcrossCouriers }} Paket
          </div>
        </div>
        <div class="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>İç: {{ totalIndoorAcrossCouriers }} / Dış: {{ totalOutdoorAcrossCouriers }}</span>
          <span class="font-mono font-bold">{{ totalAmountAcrossCouriers.toFixed(2) }} ₺</span>
        </div>
      </BaseCard>

      <!-- 3. Toplam Hakediş & Verilen Avans -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-amber-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center justify-between">
            <span>Verilen Tutar / Avans</span>
            <span class="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div class="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 font-mono">
            {{ totalPaidAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-amber-600/90 dark:text-amber-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Genel Toplam Hakediş:</span>
          <span class="font-mono font-bold">{{ totalCumulativeEarningsAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</span>
        </div>
      </BaseCard>

      <!-- 4. Kalan Toplam Hakediş (Net Bakiye) -->
      <BaseCard
        no-padding
        :class="[
          'p-4 flex flex-col justify-between transition-colors',
          totalRemainingBalanceAcrossCouriers < 0
            ? 'bg-rose-950/90 text-white border-rose-800 border-2 shadow-sm'
            : 'bg-slate-900 dark:bg-slate-900 text-white border-slate-800 dark:border-slate-700'
        ]"
      >
        <div>
          <div class="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
            <span :class="totalRemainingBalanceAcrossCouriers < 0 ? 'text-rose-300' : 'text-emerald-400'">
              Kalan Toplam Hakediş
            </span>
            <AlertTriangle v-if="totalRemainingBalanceAcrossCouriers < 0" class="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <div
            :class="[
              'text-2xl font-bold mt-1 font-mono',
              totalRemainingBalanceAcrossCouriers < 0 ? 'text-rose-400' : 'text-emerald-400'
            ]"
          >
            {{ totalRemainingBalanceAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-300 dark:text-slate-400 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span>{{ totalRemainingBalanceAcrossCouriers < 0 ? 'Fazla Ödeme Mevcut' : 'Ödenecek Net Bakiye' }}</span>
          <span class="font-mono font-semibold">{{ totalRemainingBalanceAcrossCouriers < 0 ? 'Kurye Borçlu' : 'Güncel Bakiye' }}</span>
        </div>
      </BaseCard>
    </div>

    <!-- Search & Date Filter Bar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Kurye Arama
          </label>
          <BaseInput
            v-model="searchQuery"
            placeholder="Kurye adına veya telefona göre ara... (Örn: Ahmet Yılmaz)"
          >
            <template #leading>
              <Search class="w-4 h-4 text-slate-400" />
            </template>
          </BaseInput>
        </div>

        <!-- Date Filter Input -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Hakediş Tarihi
          </label>
          <BaseInput
            v-model="filterDate"
            type="date"
            @blur="fetchCouriers()"
          />
        </div>
      </div>

      <!-- Quick Date Shortcuts & View Mode Switcher -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500">Hızlı Tarih:</span>
          <button
            type="button"
            :class="[
              'px-2.5 py-1 rounded text-xs font-medium transition-colors',
              filterDate === new Date().toISOString().substring(0, 10)
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            ]"
            @click="setDateFilter('today')"
          >
            Bugün
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            @click="setDateFilter('yesterday')"
          >
            Dün
          </button>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
            <Calendar class="w-3.5 h-3.5" />
            <span>Hesaplanan: {{ filterDate }}</span>
          </div>

          <!-- View Mode Toggle -->
          <div class="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              :class="[
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
              title="Tablo Görünümü"
              @click="viewMode = 'table'"
            >
              <TableIcon class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Tablo</span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
              title="Kart Görünümü"
              @click="viewMode = 'cards'"
            >
              <LayoutGrid class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Kartlar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Content: Table / Empty State -->
    <div v-if="!loading && filteredCouriers.length === 0 && !searchQuery">
      <BaseEmptyState
        title="Henüz kayıtlı kurye bulunmuyor."
        description="Paket teslimatlarını kaydetmek ve hakediş hesaplamak için kuryelerinizi sisteme ekleyin."
        action-text="İlk Kuryeyi Ekle"
        @action="openAddModal"
      >
        <template #icon>
          <Users class="w-6 h-6 stroke-[1.5]" />
        </template>
      </BaseEmptyState>
    </div>

    <div v-else-if="!loading && filteredCouriers.length === 0 && searchQuery">
      <BaseEmptyState
        title="Arama sonucu bulunamadı."
        :description="`'${searchQuery}' aramasına uygun kurye bulunamadı.`"
        action-text="Filtreyi Temizle"
        @action="searchQuery = ''"
      >
        <template #icon>
          <Search class="w-6 h-6 stroke-[1.5]" />
        </template>
      </BaseEmptyState>
    </div>

    <div v-else>
      <!-- 1. DESKTOP MODERN TABLE VIEW (Visible when viewMode === 'table') -->
      <div v-if="viewMode === 'table'">
        <BaseTable
          :columns="columns"
          :loading="loading"
        >
          <template #default>
            <tr
              v-for="courier in filteredCouriers"
              :key="courier.id"
              :class="[
                'hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/80',
                !courier.isActive ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-75' : ''
              ]"
            >
              <!-- 1. Kurye Bilgisi (Avatar + İsim + Telefon) -->
              <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                <div class="flex items-center gap-3">
                  <div class="relative shrink-0">
                    <div
                      :class="[
                        'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs transition-colors',
                        courier.isActive
                          ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-slate-700 dark:to-slate-800 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      ]"
                    >
                      <Bike class="w-4 h-4" />
                    </div>
                    <span
                      :class="[
                        'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900',
                        courier.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      ]"
                      :title="courier.isActive ? 'Aktif Kurye' : 'Pasif Kurye'"
                    />
                  </div>
                  <div class="min-w-0">
                    <button
                      type="button"
                      class="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-xs sm:text-sm truncate block text-left"
                      @click="openDetailModal(courier)"
                    >
                      {{ courier.name }}
                    </button>
                    <div class="flex items-center gap-2 mt-0.5 text-[11px]">
                      <a
                        v-if="courier.phone"
                        :href="'tel:' + courier.phone"
                        class="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                        title="Aramak için tıklayın"
                      >
                        <Phone class="w-3 h-3 text-slate-400" />
                        <span>{{ courier.phone }}</span>
                      </a>
                      <span v-else class="text-slate-400 italic">Telefon yok</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 2. İç Mekan -->
              <td
                class="px-4 py-3 text-right cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors group"
                title="Hızlı paket girmek için tıklayın"
                @click="openQuickDeliveryModal(courier)"
              >
                <div class="inline-flex flex-col items-end">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200/70 dark:border-emerald-800/70 group-hover:border-emerald-400 transition-colors">
                    {{ courier.todayIndoorPackages || 0 }} Paket
                  </span>
                  <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 font-medium">
                    {{ (courier.todayIndoorAmount || 0).toFixed(2) }} ₺
                  </span>
                </div>
              </td>

              <!-- 3. Dış Mekan -->
              <td
                class="px-4 py-3 text-right cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-colors group"
                title="Hızlı paket girmek için tıklayın"
                @click="openQuickDeliveryModal(courier)"
              >
                <div class="inline-flex flex-col items-end">
                  <span class="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-mono font-bold text-xs border border-sky-200/70 dark:border-sky-800/70 group-hover:border-sky-400 transition-colors">
                    {{ courier.todayOutdoorPackages || 0 }} Paket
                  </span>
                  <span class="text-[11px] text-sky-600 dark:text-sky-400 font-mono mt-0.5 font-medium">
                    {{ (courier.todayOutdoorAmount || 0).toFixed(2) }} ₺
                  </span>
                </div>
              </td>

              <!-- 4. Toplam Paket -->
              <td
                class="px-4 py-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                title="Hızlı paket girmek için tıklayın"
                @click="openQuickDeliveryModal(courier)"
              >
                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-200 dark:border-slate-700 group-hover:border-slate-400 transition-colors">
                  {{ courier.todayTotalPackages || 0 }}
                </span>
              </td>

              <!-- 5. Toplam Hakediş -->
              <td class="px-4 py-3 text-right font-mono">
                <div class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {{ (courier.cumulativeTotalAmount ?? courier.totalEarnings ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                  Seçilen Gün: {{ (courier.todayTotalAmount || 0).toFixed(2) }} ₺
                </div>
              </td>

              <!-- 6. Verilen Avans (₺) -->
              <td class="px-4 py-3 text-center">
                <div class="inline-flex items-center bg-slate-50 dark:bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                  <span class="text-xs font-semibold text-slate-400 shrink-0">₺</span>
                  <input
                    :value="courierPaidInputs[courier.id] !== undefined ? courierPaidInputs[courier.id] : (courier.paidAmount || 0)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-20 bg-transparent text-right font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none ml-1"
                    title="Verilen avans / ödenen tutar (Enter veya dışına tıkla kaydeder)"
                    @input="onPaidAmountInput(courier.id, ($event.target as HTMLInputElement).value)"
                    @blur="savePaidAmount(courier)"
                    @keyup.enter="savePaidAmount(courier)"
                  />
                  <button
                    v-if="courierPaidInputs[courier.id] !== undefined && Number(courierPaidInputs[courier.id]) !== (courier.paidAmount || 0)"
                    type="button"
                    class="ml-1 p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
                    title="Kaydet"
                    @click="savePaidAmount(courier)"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>

              <!-- 7. Kalan Hakediş -->
              <td class="px-4 py-3 text-right font-mono">
                <!-- Eksi bakiye (Kurye borçlu / Fazla ödeme) -->
                <div v-if="getCourierRemainingBalance(courier) < 0" class="inline-flex flex-col items-end">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono font-extrabold text-xs sm:text-sm border border-rose-200 dark:border-rose-800 shadow-2xs">
                    <AlertTriangle class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{{ getCourierRemainingBalance(courier).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</span>
                  </span>
                  <span class="text-[10px] text-rose-600 dark:text-rose-400 font-sans font-semibold mt-0.5">
                    Fazla Ödeme (Borçlu)
                  </span>
                </div>
                <!-- Pozitif / Sıfır bakiye -->
                <div v-else class="inline-flex flex-col items-end">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-extrabold text-xs sm:text-sm border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    {{ getCourierRemainingBalance(courier).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                  </span>
                </div>
              </td>

              <!-- 8. İşlemler (Sade ve Düzenli UI) -->
              <td class="px-4 py-3 text-right relative whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- + Paket Gir (Primary Action) -->
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                    title="Bu kurye için hızlı paket gir"
                    @click="openQuickDeliveryModal(courier)"
                  >
                    <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Paket Gir</span>
                  </button>

                  <!-- Detay (Secondary Action) -->
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Hakediş ve Paket Detayları"
                    @click="openDetailModal(courier)"
                  >
                    <Eye class="w-3.5 h-3.5 text-slate-500" />
                    <span class="hidden xl:inline">Detay</span>
                  </button>

                  <!-- Diğer İşlemler Menüsü (Dropdown) -->
                  <div class="relative">
                    <button
                      type="button"
                      :class="[
                        'p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors',
                        activeActionDropdownId === courier.id ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-emerald-500/20' : ''
                      ]"
                      title="Diğer İşlemler"
                      @click="toggleActionDropdown(courier.id, $event)"
                    >
                      <MoreHorizontal class="w-4 h-4" />
                    </button>

                    <!-- Dropdown Popover -->
                    <div
                      v-if="activeActionDropdownId === courier.id"
                      class="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs text-slate-700 dark:text-slate-200 text-left animate-in fade-in zoom-in-95 duration-100"
                      @click.stop
                    >
                      <button
                        type="button"
                        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
                        @click="closeAllDropdowns(); openWhatsAppModal(courier)"
                      >
                        <MessageSquare class="w-3.5 h-3.5" />
                        <span>WhatsApp Faturası</span>
                      </button>

                      <button
                        type="button"
                        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-medium transition-colors"
                        @click="closeAllDropdowns(); openTransactionModal(courier)"
                      >
                        <Plus class="w-3.5 h-3.5" />
                        <span>Para Girişi (Tahsilat)</span>
                      </button>

                      <button
                        type="button"
                        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                        @click="closeAllDropdowns(); openEditModal(courier)"
                      >
                        <Edit2 class="w-3.5 h-3.5" />
                        <span>Kuryeyi Düzenle</span>
                      </button>

                      <button
                        type="button"
                        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                        :class="courier.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
                        @click="closeAllDropdowns(); toggleCourierStatus(courier)"
                      >
                        <Power class="w-3.5 h-3.5" />
                        <span>{{ courier.isActive ? 'Pasife Al' : 'Aktife Al' }}</span>
                      </button>

                      <div class="my-1 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        type="button"
                        class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium transition-colors"
                        @click="closeAllDropdowns(); openDeleteConfirm(courier)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                        <span>Kuryeyi Sil</span>
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <template #actions>
            <span class="sr-only">İşlemler</span>
          </template>

          <template #footer>
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium w-full">
              <span>Toplam <strong class="text-slate-900 dark:text-slate-200 font-bold">{{ filteredCouriers.length }}</strong> kurye listelendi</span>
              <div class="flex flex-wrap items-center gap-3 text-xs">
                <span>Seçilen Gün: <strong class="text-slate-900 dark:text-slate-200 font-mono font-bold">{{ totalPackagesAcrossCouriers }} Paket ({{ totalAmountAcrossCouriers.toFixed(2) }} ₺)</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Toplam Hakediş: <strong class="text-slate-900 dark:text-slate-100 font-mono font-bold">{{ totalCumulativeEarningsAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Ödenen Avans: <strong class="text-amber-700 dark:text-amber-400 font-mono font-bold">{{ totalPaidAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong></span>
                <span class="text-slate-300 dark:text-slate-700">|</span>
                <span>Kalan Bakiye: <strong :class="totalRemainingBalanceAcrossCouriers < 0 ? 'text-rose-600 dark:text-rose-400 font-mono font-bold' : 'text-emerald-700 dark:text-emerald-400 font-mono font-bold'">{{ totalRemainingBalanceAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong></span>
              </div>
            </div>
          </template>
        </BaseTable>
      </div>

      <!-- 2. MOBILE & TABLET RESPONSIVE CARDS VIEW (Visible when viewMode === 'cards') -->
      <div v-else class="space-y-4">
        <div
          v-for="courier in filteredCouriers"
          :key="courier.id"
          :class="[
            'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 transition-all space-y-4',
            !courier.isActive ? 'opacity-75 bg-slate-50/50 dark:bg-slate-900/50' : ''
          ]"
        >
          <!-- Card Header -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative shrink-0">
                <div
                  :class="[
                    'w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs',
                    courier.isActive
                      ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-slate-700 dark:to-slate-800 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  ]"
                >
                  <Bike class="w-5 h-5" />
                </div>
                <span
                  :class="[
                    'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900',
                    courier.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  ]"
                />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate text-left"
                    @click="openDetailModal(courier)"
                  >
                    {{ courier.name }}
                  </button>
                  <span
                    :class="[
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0',
                      courier.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    ]"
                  >
                    {{ courier.isActive ? 'Aktif' : 'Pasif' }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1 text-xs">
                  <a
                    v-if="courier.phone"
                    :href="'tel:' + courier.phone"
                    class="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                  >
                    <Phone class="w-3 h-3 text-slate-400" />
                    <span>{{ courier.phone }}</span>
                  </a>
                  <span v-else class="text-slate-400 italic text-xs">Telefon yok</span>
                </div>
              </div>
            </div>

            <!-- Dropdown Trigger in Card Header -->
            <div class="relative shrink-0">
              <button
                type="button"
                :class="[
                  'p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors',
                  activeActionDropdownId === courier.id ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-emerald-500/20' : ''
                ]"
                title="İşlemler Menüsü"
                @click="toggleActionDropdown(courier.id, $event)"
              >
                <MoreVertical class="w-4 h-4" />
              </button>

              <!-- Dropdown Popover Menu -->
              <div
                v-if="activeActionDropdownId === courier.id"
                class="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs text-slate-700 dark:text-slate-200 text-left animate-in fade-in zoom-in-95 duration-100"
                @click.stop
              >
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
                  @click="closeAllDropdowns(); openWhatsAppModal(courier)"
                >
                  <MessageSquare class="w-3.5 h-3.5" />
                  <span>WhatsApp Faturası</span>
                </button>

                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-medium transition-colors"
                  @click="closeAllDropdowns(); openTransactionModal(courier)"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Para Girişi (Tahsilat)</span>
                </button>

                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  @click="closeAllDropdowns(); openEditModal(courier)"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                  <span>Kuryeyi Düzenle</span>
                </button>

                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                  :class="courier.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
                  @click="closeAllDropdowns(); toggleCourierStatus(courier)"
                >
                  <Power class="w-3.5 h-3.5" />
                  <span>{{ courier.isActive ? 'Pasife Al' : 'Aktife Al' }}</span>
                </button>

                <div class="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium transition-colors"
                  @click="closeAllDropdowns(); openDeleteConfirm(courier)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>Kuryeyi Sil</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3-Column Stats Grid -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div
              class="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-xl p-2.5 cursor-pointer hover:border-emerald-300 transition-colors"
              title="Hızlı paket girmek için tıklayın"
              @click="openQuickDeliveryModal(courier)"
            >
              <span class="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 block uppercase">İç Mekan</span>
              <div class="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-200 mt-0.5">
                {{ courier.todayIndoorPackages || 0 }} <span class="text-xs font-normal">Pkt</span>
              </div>
              <div class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {{ (courier.todayIndoorAmount || 0).toFixed(2) }} ₺
              </div>
            </div>

            <div
              class="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 rounded-xl p-2.5 cursor-pointer hover:border-sky-300 transition-colors"
              title="Hızlı paket girmek için tıklayın"
              @click="openQuickDeliveryModal(courier)"
            >
              <span class="text-[10px] font-semibold text-sky-800 dark:text-sky-300 block uppercase">Dış Mekan</span>
              <div class="font-mono font-bold text-sm text-sky-900 dark:text-sky-200 mt-0.5">
                {{ courier.todayOutdoorPackages || 0 }} <span class="text-xs font-normal">Pkt</span>
              </div>
              <div class="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-0.5 font-medium">
                {{ (courier.todayOutdoorAmount || 0).toFixed(2) }} ₺
              </div>
            </div>

            <div
              class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 cursor-pointer hover:border-slate-300 transition-colors"
              title="Hızlı paket girmek için tıklayın"
              @click="openQuickDeliveryModal(courier)"
            >
              <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block uppercase">Toplam Paket</span>
              <div class="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                {{ courier.todayTotalPackages || 0 }} <span class="text-xs font-normal">Pkt</span>
              </div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Seçilen Gün
              </div>
            </div>
          </div>

          <!-- Financial Breakdown Box -->
          <div class="bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Toplam Hakediş:</span>
              <div class="text-right">
                <span class="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {{ (courier.cumulativeTotalAmount ?? courier.totalEarnings ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
                <span class="text-[10px] text-slate-400 block">
                  Seçilen Gün: {{ (courier.todayTotalAmount || 0).toFixed(2) }} ₺
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Verilen Avans:</span>
              <div class="inline-flex items-center bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500">
                <span class="text-xs font-semibold text-slate-400">₺</span>
                <input
                  :value="courierPaidInputs[courier.id] !== undefined ? courierPaidInputs[courier.id] : (courier.paidAmount || 0)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-24 bg-transparent text-right font-mono font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none ml-1"
                  @input="onPaidAmountInput(courier.id, ($event.target as HTMLInputElement).value)"
                  @blur="savePaidAmount(courier)"
                  @keyup.enter="savePaidAmount(courier)"
                />
                <button
                  v-if="courierPaidInputs[courier.id] !== undefined && Number(courierPaidInputs[courier.id]) !== (courier.paidAmount || 0)"
                  type="button"
                  class="ml-1 p-0.5 rounded bg-emerald-600 text-white"
                  title="Kaydet"
                  @click="savePaidAmount(courier)"
                >
                  <CheckCircle2 class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Kalan Hakediş:</span>
              <div v-if="getCourierRemainingBalance(courier) < 0" class="text-right">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs border border-rose-300 dark:border-rose-800">
                  <AlertTriangle class="w-3 h-3" />
                  {{ getCourierRemainingBalance(courier).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
                <span class="text-[10px] text-rose-600 dark:text-rose-400 block font-medium mt-0.5">Fazla Ödeme (Borçlu)</span>
              </div>
              <div v-else>
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                  {{ getCourierRemainingBalance(courier).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
                </span>
              </div>
            </div>
          </div>

          <!-- Card Footer Actions -->
          <div class="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
              @click="openQuickDeliveryModal(courier)"
            >
              <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Paket Gir</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
              @click="openDetailModal(courier)"
            >
              <Eye class="w-3.5 h-3.5 text-slate-500" />
              <span>Detay</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-medium text-xs transition-colors"
              @click="openWhatsAppModal(courier)"
            >
              <MessageSquare class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        <!-- Card View Summary Footer -->
        <div class="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <div class="flex items-center justify-between font-medium">
            <span>Toplam Listelenen:</span>
            <strong class="text-slate-900 dark:text-slate-100">{{ filteredCouriers.length }} Kurye</strong>
          </div>
          <div class="flex items-center justify-between font-medium">
            <span>Seçilen Gün:</span>
            <strong class="text-slate-900 dark:text-slate-100 font-mono">{{ totalPackagesAcrossCouriers }} Paket ({{ totalAmountAcrossCouriers.toFixed(2) }} ₺)</strong>
          </div>
          <div class="flex items-center justify-between font-medium">
            <span>Toplam Hakediş:</span>
            <strong class="text-slate-900 dark:text-slate-100 font-mono">{{ totalCumulativeEarningsAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong>
          </div>
          <div class="flex items-center justify-between font-medium">
            <span>Ödenen Avans:</span>
            <strong class="text-amber-700 dark:text-amber-400 font-mono">{{ totalPaidAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong>
          </div>
          <div class="flex items-center justify-between font-medium pt-1.5 border-t border-slate-200 dark:border-slate-700">
            <span>Kalan Genel Bakiye:</span>
            <strong :class="totalRemainingBalanceAcrossCouriers < 0 ? 'text-rose-600 dark:text-rose-400 font-mono font-bold' : 'text-emerald-700 dark:text-emerald-400 font-mono font-bold'">{{ totalRemainingBalanceAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. KURYE DETAY & HAKEDİŞ MODALI (Günlük / Haftalık Takip) -->
    <BaseModal
      v-model="isDetailModalOpen"
      :title="`Kurye Hakediş Detayı — ${detailCourier?.name || 'Kurye'}`"
      size="lg"
      description="Seçilen tarih aralığında atılan iç ve dış mekan paket adetleri, birim fiyatlar ve hakediş dökümü."
    >
      <div class="space-y-5">
        <!-- Kurye Bilgi Başlığı -->
        <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold">
              <Bike class="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {{ detailCourier?.name }}
              </div>
              <div class="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {{ detailCourier?.phone || 'Telefon Belirtilmedi' }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <BaseBadge :variant="detailCourier?.isActive ? 'success' : 'neutral'" dot>
              {{ detailCourier?.isActive ? 'Aktif Kurye' : 'Pasif Kurye' }}
            </BaseBadge>
            <NuxtLink
              v-if="detailCourier"
              :to="`/couriers/${detailCourier.id}`"
              class="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 ml-2"
            >
              <span>Özel Fiyatlar</span>
              <ExternalLink class="w-3 h-3" />
            </NuxtLink>
          </div>
        </div>

        <!-- Periyot Seçimi: Günlük / Haftalık -->
        <div class="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  detailMode === 'daily'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                ]"
                @click="setDetailDaily(filterDate || new Date().toISOString().substring(0, 10))"
              >
                📅 Günlük Rapor
              </button>
              <button
                type="button"
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  detailMode === 'weekly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                ]"
                @click="setDetailWeekly('thisWeek')"
              >
                📊 Haftalık / Tarih Aralığı
              </button>
            </div>

            <!-- Hızlı Butonlar -->
            <div v-if="detailMode === 'daily'" class="flex items-center gap-1.5 text-xs">
              <span class="text-slate-400 dark:text-slate-500 text-[11px]">Hızlı Seç:</span>
              <button
                type="button"
                class="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                @click="setDetailDaily(new Date().toISOString().substring(0, 10))"
              >
                Bugün
              </button>
              <button
                type="button"
                class="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                @click="() => { const d = new Date(); d.setDate(d.getDate() - 1); setDetailDaily(d.toISOString().substring(0, 10)); }"
              >
                Dün
              </button>
            </div>

            <div v-else class="flex items-center gap-1.5 text-xs">
              <span class="text-slate-400 dark:text-slate-500 text-[11px]">Hızlı Seç:</span>
              <button
                type="button"
                class="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                @click="setDetailWeekly('thisWeek')"
              >
                Bu Hafta
              </button>
              <button
                type="button"
                class="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                @click="setDetailWeekly('lastWeek')"
              >
                Geçen Hafta
              </button>
              <button
                type="button"
                class="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                @click="setDetailWeekly('thisMonth')"
              >
                Bu Ay
              </button>
            </div>
          </div>

          <!-- Tarih Giriş Alanları -->
          <div v-if="detailMode === 'daily'" class="pt-1">
            <BaseInput
              v-model="detailStartDate"
              label="İncelenen Tarih"
              type="date"
              @change="() => { detailEndDate = detailStartDate; fetchDetailReport(); }"
            />
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <BaseInput
              v-model="detailStartDate"
              label="Başlangıç Tarihi"
              type="date"
              @change="fetchDetailReport"
            />
            <BaseInput
              v-model="detailEndDate"
              label="Bitiş Tarihi"
              type="date"
              @change="fetchDetailReport"
            />
          </div>
        </div>

        <!-- Yükleniyor Göstergesi -->
        <div v-if="detailLoading" class="py-8">
          <BaseLoading message="Kurye hakediş verileri hesaplanıyor..." />
        </div>

        <!-- Rapor Sonuçları -->
        <div v-else-if="detailReportData" class="space-y-4">
          <!-- 3'lü KPI Özet Kartı (İç Mekan, Dış Mekan, Genel Toplam) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- İç Mekan -->
            <div class="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between">
              <div>
                <div class="text-xs font-bold text-emerald-950 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span>İç Mekan</span>
                  <span class="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div class="text-xl font-bold text-emerald-800 dark:text-emerald-400 font-mono mt-1">
                  {{ (detailReportData.indoorAmount || 0).toFixed(2) }} ₺
                </div>
              </div>
              <div class="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-medium mt-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 font-mono">
                Paket: <strong>{{ detailReportData.indoorPackages || 0 }} Adet</strong>
              </div>
            </div>

            <!-- Dış Mekan -->
            <div class="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex flex-col justify-between">
              <div>
                <div class="text-xs font-bold text-sky-950 dark:text-sky-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Dış Mekan</span>
                  <span class="w-2 h-2 rounded-full bg-sky-500" />
                </div>
                <div class="text-xl font-bold text-sky-800 dark:text-sky-400 font-mono mt-1">
                  {{ (detailReportData.outdoorAmount || 0).toFixed(2) }} ₺
                </div>
              </div>
              <div class="text-[11px] text-sky-700 dark:text-sky-400/90 font-medium mt-2 pt-1 border-t border-sky-200/60 dark:border-sky-800/60 font-mono">
                Paket: <strong>{{ detailReportData.outdoorPackages || 0 }} Adet</strong>
              </div>
            </div>

            <!-- Genel Toplam -->
            <div class="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex flex-col justify-between border border-slate-800 dark:border-slate-700">
              <div>
                <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Toplam Hakediş
                </div>
                <div class="text-xl font-extrabold text-emerald-400 font-mono mt-1">
                  {{ (detailReportData.totalAmount || 0).toFixed(2) }} ₺
                </div>
              </div>
              <div class="text-[11px] text-slate-300 dark:text-slate-400 font-medium mt-2 pt-1 border-t border-slate-800 dark:border-slate-700 font-mono">
                Toplam: <strong class="text-white">{{ detailReportData.totalPackageCount || 0 }} Paket</strong>
              </div>
            </div>
          </div>

          <!-- Haftalık Gün Bazlı Döküm Tablosu -->
          <div
            v-if="detailMode === 'weekly' && detailReportData.dailyBreakdown && detailReportData.dailyBreakdown.length > 0"
            class="space-y-2"
          >
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Haftalık Gün Bazlı Dağılım</span>
            </div>

            <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-100/80 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th class="px-3 py-2.5">Gün / Tarih</th>
                    <th class="px-3 py-2.5 text-right text-emerald-800 dark:text-emerald-400">İç Mekan</th>
                    <th class="px-3 py-2.5 text-right text-sky-800 dark:text-sky-400">Dış Mekan</th>
                    <th class="px-3 py-2.5 text-right">Toplam Paket</th>
                    <th class="px-3 py-2.5 text-right text-slate-900 dark:text-slate-100">Günlük Hakediş</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr
                    v-for="day in detailReportData.dailyBreakdown"
                    :key="day.date"
                    class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors font-mono"
                  >
                    <td class="px-3 py-2.5 font-sans">
                      <span class="font-bold text-slate-900 dark:text-slate-100">{{ day.dayName }}</span>
                      <span class="text-slate-400 dark:text-slate-500 text-[11px] block font-mono">{{ day.dateFormatted }}</span>
                    </td>
                    <td class="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400">
                      <span>{{ day.indoorCount }} Paket</span>
                      <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-sans">({{ day.indoorAmount.toFixed(2) }} ₺)</span>
                    </td>
                    <td class="px-3 py-2.5 text-right text-sky-700 dark:text-sky-400">
                      <span>{{ day.outdoorCount }} Paket</span>
                      <span class="text-[10px] text-slate-400 dark:text-slate-500 block font-sans">({{ day.outdoorAmount.toFixed(2) }} ₺)</span>
                    </td>
                    <td class="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {{ day.totalCount }} Adet
                    </td>
                    <td class="px-3 py-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      {{ day.totalAmount.toFixed(2) }} ₺
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Detaylı Teslimat Kayıtları Tablosu -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Detaylı Paket Kayıtları ({{ (detailReportData.records || []).length }} Kayıt)</span>
              </span>
              <span class="text-[11px] text-slate-400 dark:text-slate-500">Snapshot birim fiyatlarla hesaplanmıştır</span>
            </div>

            <div v-if="detailReportData.records && detailReportData.records.length > 0" class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th class="px-3 py-2.5">Tarih</th>
                    <th class="px-3 py-2.5">Mekan</th>
                    <th class="px-3 py-2.5 text-center">Tür</th>
                    <th class="px-3 py-2.5 text-right">Paket</th>
                    <th class="px-3 py-2.5 text-right">Birim Fiyat</th>
                    <th class="px-3 py-2.5 text-right">Hakediş</th>
                    <th class="px-3 py-2.5 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr
                    v-for="rec in detailReportData.records"
                    :key="rec.id"
                    class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors font-mono"
                  >
                    <td class="px-3 py-2 text-slate-700 dark:text-slate-300 font-sans">
                      {{ rec.dateFormatted }}
                    </td>
                    <td class="px-3 py-2 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {{ rec.venueName }}
                    </td>
                    <td class="px-3 py-2 text-center font-sans">
                      <BaseBadge
                        :variant="rec.deliveryType === 'INDOOR' ? 'success' : 'brand'"
                        dot
                      >
                        {{ rec.deliveryTypeLabel }}
                      </BaseBadge>
                    </td>
                    <td class="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {{ rec.packageCount }}
                    </td>
                    <td class="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                      {{ Number(rec.unitPriceSnapshot).toFixed(2) }} ₺
                    </td>
                    <td class="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      {{ Number(rec.totalAmount).toFixed(2) }} ₺
                    </td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                          title="Paket Sayısını / Fiyatını Düzenle"
                          @click="openEditDeliveryModal(rec)"
                        >
                          <Edit2 class="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                          title="Paket Kaydını Sil"
                          @click="openDeleteDeliveryConfirm(rec)"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-center py-6 text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              Seçilen tarih aralığında bu kuryeye ait paket teslimat kaydı bulunmuyor.
            </div>
          </div>
        </div>

        <!-- Modal Alt Aksiyon Barı -->
        <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            @click="isDetailModalOpen = false"
          >
            Kapat
          </BaseButton>

          <div class="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              class="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold"
              @click="openQuickDeliveryModal(detailCourier || undefined)"
            >
              <template #leading>
                <Plus class="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              </template>
              Paket Ekle
            </BaseButton>

            <BaseButton
              variant="primary"
              size="sm"
              class="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm"
              :disabled="!detailReportData || (detailReportData.records || []).length === 0"
              @click="openWhatsAppFromDetail"
            >
              <template #leading>
                <MessageSquare class="w-3.5 h-3.5" />
              </template>
              WhatsApp Hakediş Faturası Gönder
            </BaseButton>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- 0. HIZLI PAKET GİRİŞİ & HAKEDİŞ HESAPLAMA MODAL -->
    <BaseModal
      v-model="isQuickDeliveryModalOpen"
      :title="`Paket Girişi & Hakediş — ${quickDeliveryCourier?.name || 'Kurye Seçiniz'}`"
      description="Tarih ve teslimat tipine göre (İç ve Dış Paket) birim fiyat ve paket sayılarını girerek anında hakediş hesaplayın."
    >
      <form class="space-y-4" @submit.prevent="handleQuickDeliverySubmit">
        <!-- Genel Hata Bildirimi -->
        <div v-if="quickDeliveryErrors.general" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-medium">
          {{ quickDeliveryErrors.general }}
        </div>

        <!-- 1. Tarih Seçimi -->
        <div class="grid grid-cols-1 gap-3">
          <BaseInput
            v-model="quickDeliveryForm.date"
            label="Tarih"
            type="date"
            :error="quickDeliveryErrors.date"
            required
          />
        </div>

        <!-- 2. İÇ PAKET TESLİMATI KARTI -->
        <div class="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wider">İÇ PAKET TESLİMATI</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="quickDeliveryForm.indoorPrice"
              label="İç Birim Fiyat (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 90"
              hint="Kurye iç paket birim fiyatı"
              :error="quickDeliveryErrors.indoorPrice"
            />
            <BaseInput
              v-model="quickDeliveryForm.indoorCount"
              label="İç Paket Sayısı (Adet)"
              type="number"
              min="0"
              step="1"
              placeholder="Örn: 10"
              hint="İç teslimat adedi"
            />
          </div>
        </div>

        <!-- 3. DIŞ PAKET TESLİMATI KARTI -->
        <div class="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/50 space-y-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wider">DIŞ PAKET TESLİMATI</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="quickDeliveryForm.outdoorPrice"
              label="Dış Birim Fiyat (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 135"
              hint="Kurye dış paket birim fiyatı"
              :error="quickDeliveryErrors.outdoorPrice"
            />
            <BaseInput
              v-model="quickDeliveryForm.outdoorCount"
              label="Dış Paket Sayısı (Adet)"
              type="number"
              min="0"
              step="1"
              placeholder="Örn: 5"
              hint="Dış teslimat adedi"
            />
          </div>
        </div>

        <!-- 4. CANLI HESAPLAMA & HAKEDİŞ KARTI -->
        <div class="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Toplam Paket Sayısı:</span>
            <span class="font-bold font-mono text-white text-sm">
              {{ quickTotalPackages }} Adet
            </span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>İç Paket Hakediş ({{ quickDeliveryForm.indoorCount || 0 }} × {{ Number(quickDeliveryForm.indoorPrice || 0) }} ₺):</span>
            <span class="font-bold font-mono text-emerald-400 text-sm">
              {{ quickIndoorTotal.toFixed(2) }} ₺
            </span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Dış Paket Hakediş ({{ quickDeliveryForm.outdoorCount || 0 }} × {{ Number(quickDeliveryForm.outdoorPrice || 0) }} ₺):</span>
            <span class="font-bold font-mono text-emerald-400 text-sm">
              {{ quickOutdoorTotal.toFixed(2) }} ₺
            </span>
          </div>

          <div class="pt-2.5 border-t border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-1.5 font-bold text-white text-sm">
              <Sparkles class="w-4 h-4 text-emerald-400" />
              <span>Genel Toplam Hakediş:</span>
            </div>
            <div class="text-xl font-bold font-mono text-emerald-400">
              {{ quickGrandTotal.toFixed(2) }} ₺
            </div>
          </div>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            @click="isQuickDeliveryModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="quickDeliveryLoading"
            class="!bg-slate-900 hover:!bg-slate-800 !text-white font-bold"
          >
            Hakedişi Kaydet
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 2. KURYE EKLEME / DÜZENLEME MODAL -->
    <BaseModal
      v-model="isAddModalOpen"
      :title="isEditing ? 'Kurye Bilgilerini Düzenle' : 'Yeni Kurye Ekle'"
      :description="isEditing ? 'Kurye hakediş fiyatları, iletişim ve durum bilgilerini güncelleyin.' : 'Kurye adı, varsayılan paket hakediş fiyatları ve iletişim numarasını sisteme kaydedin.'"
    >
      <form class="space-y-4" @submit.prevent="handleFormSubmit">
        <BaseInput
          v-model="formData.name"
          label="Ad Soyad"
          placeholder="Örn: Ahmet Yılmaz"
          :error="formErrors.name"
          required
        />

        <BaseInput
          v-model="formData.phone"
          label="Telefon Numarası (WhatsApp İletişimi İçin)"
          placeholder="05XX XXX XX XX"
          :error="formErrors.phone"
          hint="WhatsApp hakediş faturaları bu numaraya gönderilir."
        >
          <template #leading>
            <Phone class="w-4 h-4 text-slate-400" />
          </template>
        </BaseInput>

        <!-- Kurye Varsayılan Hakediş Fiyat Girişleri -->
        <div class="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
          <div class="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Tag class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Kurye Varsayılan Paket Hakedişleri</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="formData.indoorPrice"
              label="İç Mekan Hakediş (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 30.00"
              hint="Kuryeye ödenecek standart iç paket ücreti"
            />
            <BaseInput
              v-model="formData.outdoorPrice"
              label="Dış Mekan Hakediş (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 32.00"
              hint="Kuryeye ödenecek standart dış paket ücreti"
            />
          </div>

          <div class="pt-1">
            <BaseInput
              v-model="formData.paidAmount"
              label="Verilen Tutar / Avans (Ödenen) (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 3000.00"
              hint="Kuryeye ödenen avans tutarı. Kalan hakediş bu tutar düşülerek hesaplanır."
            />
          </div>
        </div>

        <!-- Aktif / Pasif Seçimi -->
        <div class="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <div class="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Kurye Durumu
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">
              Pasif kuryeler yeni paket kayıtlarında seçilemez, geçmiş verileri korunur.
            </div>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="sr-only peer"
            />
            <div class="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900 dark:peer-checked:bg-emerald-600" />
          </label>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            :disabled="loading"
            @click="isAddModalOpen = false"
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

    <!-- 3. WHATSAPP PAYLAŞIM MODAL -->
    <WhatsAppShareModal
      v-model="isWhatsAppModalOpen"
      :payload="whatsAppPayload"
      @update:payload="whatsAppPayload = $event"
    />

    <!-- 4. SİLME ONAY MODAL -->
    <BaseModal
      v-model="isTransactionModalOpen"
      title="Para Girişi / Düzeltme İşlemi"
      description="Kuryenin yaptığı tahsilat veya teslim ettiği nakit tutarını girin. Düzeltme yapmak için eksi (-) değerli tutar girebilirsiniz (Örn: -100). Tüm kayıtlar silinmez bir şekilde (Audit Log) tutulur."
    >
      <form @submit.prevent="handleTransactionSubmit" class="space-y-4">
        <div class="space-y-4">
          <BaseInput
            v-model="transactionForm.amount"
            label="Tutar (₺)"
            type="number"
            step="0.01"
            required
            placeholder="Örn: 500 (Düzeltme için: -100)"
            :error="transactionErrors.amount"
          />

          <BaseInput
            v-model="transactionForm.date"
            label="Tarih"
            type="date"
            required
            :error="transactionErrors.date"
          />

          <BaseInput
            v-model="transactionForm.description"
            label="Açıklama (Opsiyonel)"
            type="text"
            placeholder="Nakit teslimat vb."
          />
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            :disabled="transactionLoading"
            @click="isTransactionModalOpen = false"
          >
            İptal
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="transactionLoading"
          >
            Kaydet
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 5. KURYE SİLME ONAY MODAL -->
    <BaseConfirmDialog
      v-model="isConfirmDeleteOpen"
      title="Kuryeyi Sil"
      :message="courierToDelete ? `&quot;${courierToDelete.name}&quot; kuryesini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.` : 'Kuryeyi silmek istediğinizden emin misiniz?'"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />

    <!-- 6. GEÇMİŞ PAKET KAYDINI DÜZENLEME MODALI -->
    <BaseModal
      v-model="isEditDeliveryModalOpen"
      title="Geçmiş Paket Kaydını Düzenle"
      description="Kuryeye ait geçmiş tarihteki paket sayısını veya birim hakediş fiyatını güncelleyin. Toplam hakediş ve raporlar anında yeniden hesaplanacaktır."
    >
      <form class="space-y-4" @submit.prevent="handleEditDeliverySubmit">
        <!-- Hata bildirimi -->
        <div v-if="editDeliveryErrors.general" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-medium">
          {{ editDeliveryErrors.general }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="editDeliveryForm.date"
            label="Kayıt Tarihi"
            type="date"
            :error="editDeliveryErrors.date"
            required
          />

          <div>
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Teslimat Tipi
            </label>
            <BaseSelect
              v-model="editDeliveryForm.deliveryType"
              :options="[
                { value: 'INDOOR', label: 'İç Mekan Teslimatı' },
                { value: 'OUTDOOR', label: 'Dış Mekan Teslimatı' }
              ]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="editDeliveryForm.packageCount"
            label="Paket Sayısı (Adet)"
            type="number"
            min="1"
            step="1"
            required
            :error="editDeliveryErrors.packageCount"
            hint="Teslim edilen paket adedi"
          />

          <BaseInput
            v-model="editDeliveryForm.courierUnitPrice"
            label="Birim Hakediş Fiyatı (₺)"
            type="number"
            step="0.01"
            min="0"
            required
            :error="editDeliveryErrors.courierUnitPrice"
            hint="Paket başı ödenecek hakediş tutarı"
          />
        </div>

        <!-- Canlı Yeniden Hesaplanan Tutar Kartı -->
        <div class="p-3.5 rounded-xl bg-slate-900 text-white space-y-1.5 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Hesaplama Detayı:</span>
            <span class="font-mono text-white">
              {{ editDeliveryForm.packageCount || 0 }} Adet × {{ Number(editDeliveryForm.courierUnitPrice || 0).toFixed(2) }} ₺
            </span>
          </div>
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span class="text-xs font-semibold text-emerald-400">Güncel Kayıt Hakedişi:</span>
            <span class="text-lg font-bold font-mono text-emerald-400">
              {{ editDeliveryCalculatedTotal.toFixed(2) }} ₺
            </span>
          </div>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            :disabled="editDeliveryLoading"
            @click="isEditDeliveryModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="editDeliveryLoading"
            class="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold"
          >
            Değişiklikleri Kaydet
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 7. GEÇMİŞ PAKET KAYDINI SİLME ONAY DİYALOĞU -->
    <BaseConfirmDialog
      v-model="isConfirmDeleteDeliveryOpen"
      title="Geçmiş Paket Kaydını Sil"
      :message="deliveryToDelete ? `&quot;${deliveryToDelete.dateFormatted}&quot; tarihli, ${deliveryToDelete.packageCount} adet ${deliveryToDelete.deliveryTypeLabel} teslimat kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kuryenin toplam hakedişi ile raporları otomatik olarak güncellenecektir.` : 'Paket kaydını silmek istediğinizden emin misiniz?'"
      confirm-text="Kayıt ve Hakedişi Sil"
      variant="danger"
      :loading="deleteDeliveryLoading"
      @confirm="handleConfirmDeleteDelivery"
    />
  </div>
</template>
