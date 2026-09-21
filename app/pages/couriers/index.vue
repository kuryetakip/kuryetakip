<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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
  Tag
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
  toggleCourierStatus,
  deleteCourier
} = useCouriers()

const { venues, fetchVenues } = useVenues()
const { createDelivery } = useDeliveries()

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
  { key: 'name', label: 'Kurye Adı' },
  { key: 'phone', label: 'Telefon' },
  { key: 'indoorPackages', label: 'İç Mekan', align: 'right' as const },
  { key: 'outdoorPackages', label: 'Dış Mekan', align: 'right' as const },
  { key: 'totalPackages', label: 'Toplam Paket', align: 'right' as const },
  { key: 'totalAmount', label: 'Hakediş', align: 'right' as const },
  { key: 'isActive', label: 'Durum', align: 'center' as const }
]

// KPI calculations across all filtered couriers for the selected date
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
  if (!quickDeliveryForm.value.courierId) {
    errors.courierId = 'Kurye seçimi zorunludur.'
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
  await Promise.all([
    fetchCouriers(),
    fetchVenues()
  ])
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

      <!-- 2. Günlük İç Mekan Paketleri -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
            <span>Seçilen Gün: İç Mekan</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            {{ totalIndoorAmountAcrossCouriers.toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>İç Paket Adedi:</span>
          <span class="font-mono font-bold">{{ totalIndoorAcrossCouriers }} Adet</span>
        </div>
      </BaseCard>

      <!-- 3. Günlük Dış Mekan Paketleri -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-sky-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-sky-800 dark:text-sky-400 flex items-center justify-between">
            <span>Seçilen Gün: Dış Mekan</span>
            <span class="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <div class="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1 font-mono">
            {{ totalOutdoorAmountAcrossCouriers.toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-sky-600/90 dark:text-sky-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Dış Paket Adedi:</span>
          <span class="font-mono font-bold">{{ totalOutdoorAcrossCouriers }} Adet</span>
        </div>
      </BaseCard>

      <!-- 4. Günlük Toplam Hakediş -->
      <BaseCard no-padding class="p-4 bg-slate-900 dark:bg-slate-900 text-white border-slate-800 dark:border-slate-700 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Günlük Toplam Hakediş
          </div>
          <div class="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {{ totalAmountAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 dark:border-slate-800 flex items-center justify-between">
          <span>Toplam Atılan Paket</span>
          <span class="font-mono text-emerald-300 font-semibold">{{ totalPackagesAcrossCouriers }} Paket</span>
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

      <!-- Quick Date Shortcuts -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
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

        <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
          <Calendar class="w-3.5 h-3.5" />
          <span>Hesaplanan Tarih: {{ filterDate }}</span>
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
      <BaseTable
        :columns="columns"
        :loading="loading"
      >
        <template #default>
          <tr
            v-for="courier in filteredCouriers"
            :key="courier.id"
            :class="[
              'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors',
              !courier.isActive ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-75' : ''
            ]"
          >
            <!-- 1. Ad Soyad -->
            <td class="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
              <div class="flex items-center gap-2.5">
                <div
                  :class="[
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                    courier.isActive ? 'bg-slate-900 dark:bg-slate-700 text-white dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                  ]"
                >
                  <Bike class="w-3.5 h-3.5" />
                </div>
                <div>
                  <button
                    type="button"
                    class="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-xs sm:text-sm text-left block"
                    @click="openDetailModal(courier)"
                  >
                    {{ courier.name }}
                  </button>
                  <div class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                    <span v-if="courier.todayTotalPackages && courier.todayTotalPackages > 0" class="text-emerald-600 dark:text-emerald-400 font-medium">
                      {{ courier.todayTotalPackages }} paket atıldı
                    </span>
                    <span v-else class="text-slate-400 dark:text-slate-500">
                      Bugün paket kaydı yok
                    </span>
                  </div>
                </div>
              </div>
            </td>

            <!-- 2. Telefon -->
            <td class="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
              <div v-if="courier.phone" class="flex items-center gap-1.5 font-mono">
                <Phone class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{{ courier.phone }}</span>
              </div>
              <span v-else class="text-slate-400 dark:text-slate-600 italic text-xs">Belirtilmedi</span>
            </td>

            <!-- 3. Bugünkü İç Mekan -->
            <td
              class="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors group"
              title="Hızlı paket girmek için tıklayın"
              @click="openQuickDeliveryModal(courier)"
            >
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-400 font-mono group-hover:underline">
                  {{ courier.todayIndoorPackages || 0 }} Paket
                </span>
                <span class="text-[11px] text-emerald-600 dark:text-emerald-500 font-mono">
                  {{ (courier.todayIndoorAmount || 0).toFixed(2) }} ₺
                </span>
              </div>
            </td>

            <!-- 4. Bugünkü Dış Mekan -->
            <td
              class="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-sky-50/60 dark:hover:bg-sky-950/40 transition-colors group"
              title="Hızlı paket girmek için tıklayın"
              @click="openQuickDeliveryModal(courier)"
            >
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-xs sm:text-sm font-bold text-sky-800 dark:text-sky-400 font-mono group-hover:underline">
                  {{ courier.todayOutdoorPackages || 0 }} Paket
                </span>
                <span class="text-[11px] text-sky-600 dark:text-sky-500 font-mono">
                  {{ (courier.todayOutdoorAmount || 0).toFixed(2) }} ₺
                </span>
              </div>
            </td>

            <!-- 5. Bugünkü Toplam Paket -->
            <td
              class="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              title="Hızlı paket girmek için tıklayın"
              @click="openQuickDeliveryModal(courier)"
            >
              <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-mono group-hover:underline">
                {{ courier.todayTotalPackages || 0 }} Paket
              </span>
            </td>

            <!-- 6. Bugünkü Toplam Hakediş -->
            <td class="px-4 py-3.5 text-right">
              <span class="inline-flex items-center px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-800 text-emerald-400 font-mono font-bold text-xs sm:text-sm border border-slate-800 dark:border-slate-700">
                {{ (courier.todayTotalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </td>

            <!-- 7. Durum (Aktif/Pasif) -->
            <td class="px-4 py-3.5 text-center">
              <button
                type="button"
                :title="courier.isActive ? 'Pasife al' : 'Aktife al'"
                class="focus:outline-none"
                @click="toggleCourierStatus(courier)"
              >
                <BaseBadge
                  :variant="courier.isActive ? 'success' : 'neutral'"
                  dot
                >
                  {{ courier.isActive ? 'Aktif' : 'Pasif' }}
                </BaseBadge>
              </button>
            </td>

            <!-- 8. İşlemler -->
            <td class="px-4 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <!-- Paket Gir Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold"
                  title="Bu Kurye İçin Paket ve Hakediş Gir"
                  @click="openQuickDeliveryModal(courier)"
                >
                  <template #leading>
                    <Plus class="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 stroke-[2.5]" />
                  </template>
                  Paket Gir
                </BaseButton>

                <!-- Detay Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                  title="Günlük / Haftalık Hakediş Detayı"
                  @click="openDetailModal(courier)"
                >
                  <template #leading>
                    <Eye class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  </template>
                  Detay
                </BaseButton>

                <!-- WhatsApp Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
                  title="WhatsApp Hakediş Faturası Gönder"
                  @click="openWhatsAppModal(courier)"
                >
                  <template #leading>
                    <MessageSquare class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </template>
                  WhatsApp
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Düzenle"
                  @click="openEditModal(courier)"
                >
                  <Edit2 class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  :title="courier.isActive ? 'Pasife Al' : 'Aktife Al'"
                  @click="toggleCourierStatus(courier)"
                >
                  <Power
                    :class="[
                      'w-3.5 h-3.5',
                      courier.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    ]"
                  />
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Sil"
                  @click="openDeleteConfirm(courier)"
                >
                  <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                </BaseButton>
              </div>
            </td>
          </tr>
        </template>

        <template #actions>
          <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right text-xs whitespace-nowrap">
            İşlemler
          </th>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium w-full">
            <span>Toplam <strong class="text-slate-900 dark:text-slate-200 font-bold">{{ filteredCouriers.length }}</strong> kurye listelendi</span>
            <div class="flex items-center gap-3 text-xs">
              <span>Toplam Paket: <strong class="text-slate-900 dark:text-slate-200 font-mono font-bold">{{ totalPackagesAcrossCouriers }} Adet</strong></span>
              <span class="text-slate-300 dark:text-slate-700">|</span>
              <span>Toplam Hakediş: <strong class="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{{ totalAmountAcrossCouriers.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong></span>
            </div>
          </div>
        </template>
      </BaseTable>
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
      description="Tarih, kurye ve teslimat tipine göre (İç ve Dış Paket) birim fiyat ve paket sayılarını girerek anında hakediş hesaplayın."
    >
      <form class="space-y-4" @submit.prevent="handleQuickDeliverySubmit">
        <!-- Genel Hata Bildirimi -->
        <div v-if="quickDeliveryErrors.general" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-medium">
          {{ quickDeliveryErrors.general }}
        </div>

        <!-- 1. Tarih ve Kurye Seçimi -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="quickDeliveryForm.date"
            label="Tarih"
            type="date"
            :error="quickDeliveryErrors.date"
            required
          />

          <BaseSelect
            v-model="quickDeliveryForm.courierId"
            label="Kurye"
            :options="activeCouriersList.map(c => ({ value: c.id, label: c.name }))"
            :error="quickDeliveryErrors.courierId"
            placeholder="Kurye seçiniz..."
            required
            @update:model-value="onQuickCourierChange"
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
    <BaseConfirmDialog
      v-model="isConfirmDeleteOpen"
      title="Kuryeyi Sil"
      :message="courierToDelete ? `&quot;${courierToDelete.name}&quot; kuryesini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.` : 'Kuryeyi silmek istediğinizden emin misiniz?'"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
