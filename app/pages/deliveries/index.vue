<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  Plus,
  Package,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Bike,
  Store,
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-vue-next'
import { useDeliveries, type DeliveryRecordItem, type DeliveryFormData } from '~/composables/useDeliveries'
import { useCouriers } from '~/composables/useCouriers'
import { useVenues } from '~/composables/useVenues'

useHead({
  title: 'Paket Kayıtları & Hakediş — KuryeTakip'
})

const {
  deliveries,
  summary,
  loading,
  filterDate,
  filterCourierId,
  filterVenueId,
  filterDeliveryType,
  fetchDeliveries,
  createDelivery,
  updateDelivery,
  deleteDelivery
} = useDeliveries()

const { couriers, fetchCouriers } = useCouriers()
const { venues, fetchVenues } = useVenues()

// Modal states
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedDeliveryId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const deliveryToDelete = ref<DeliveryRecordItem | null>(null)

// Add Form State (Combined Indoor + Outdoor)
const addForm = ref({
  date: new Date().toISOString().substring(0, 10),
  courierId: '',
  venueId: '',
  courierIndoorPrice: '' as string | number,
  courierOutdoorPrice: '' as string | number,
  venueIndoorPrice: '' as string | number,
  venueOutdoorPrice: '' as string | number,
  indoorPrice: '' as string | number,
  indoorCount: '' as string | number,
  outdoorPrice: '' as string | number,
  outdoorCount: '' as string | number
})

// Edit Form State (Single Record)
const editForm = ref({
  date: new Date().toISOString().substring(0, 10),
  courierId: '',
  venueId: '',
  deliveryType: 'INDOOR' as 'INDOOR' | 'OUTDOOR',
  courierUnitPrice: '' as string | number,
  venueUnitPrice: '' as string | number,
  unitPrice: '' as string | number,
  packageCount: 1 as string | number
})

const addFormErrors = ref<Record<string, string>>({})
const editFormErrors = ref<Record<string, string>>({})

// Active entities for selection
const activeCouriers = computed(() => couriers.value.filter(c => c.isActive))
const activeVenues = computed(() => venues.value.filter(v => v.isActive))

const fetchAddRates = async () => {
  const cId = addForm.value.courierId
  const vId = addForm.value.venueId
  if (!cId || !vId) return
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/deliveries/rates', {
      query: { courierId: cId, venueId: vId, deliveryType: 'INDOOR' }
    })
    if (res.success && res.data) {
      addForm.value.venueIndoorPrice = res.data.venueIndoorPrice
      addForm.value.venueOutdoorPrice = res.data.venueOutdoorPrice
      addForm.value.courierIndoorPrice = res.data.courierIndoorPrice
      addForm.value.courierOutdoorPrice = res.data.courierOutdoorPrice
      addForm.value.indoorPrice = res.data.courierIndoorPrice
      addForm.value.outdoorPrice = res.data.courierOutdoorPrice
    }
  } catch (err) {
    console.error('Fetch add rates error:', err)
  }
}

// Venue & Courier Change Handlers -> Auto-fill default unit prices
const onAddVenueChange = (newVenueId: string) => {
  addForm.value.venueId = newVenueId
  if (newVenueId) {
    const selected = venues.value.find(v => v.id === newVenueId)
    if (selected) {
      addForm.value.venueIndoorPrice = selected.indoorPrice
      addForm.value.venueOutdoorPrice = selected.outdoorPrice
    }
    if (addForm.value.courierId) {
      fetchAddRates()
    }
  }
}

const onAddCourierChange = (newCourierId: string) => {
  addForm.value.courierId = newCourierId
  if (newCourierId && addForm.value.venueId) {
    fetchAddRates()
  } else if (newCourierId) {
    const selected = couriers.value.find(c => c.id === newCourierId)
    if (selected) {
      if (selected.indoorPrice) addForm.value.courierIndoorPrice = selected.indoorPrice
      if (selected.outdoorPrice) addForm.value.courierOutdoorPrice = selected.outdoorPrice
    }
  }
}

// Add Form Calculations: Courier Payouts
const courierIndoorTotal = computed(() => {
  const count = Number(addForm.value.indoorCount) || 0
  const price = Number(addForm.value.courierIndoorPrice || addForm.value.indoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const courierOutdoorTotal = computed(() => {
  const count = Number(addForm.value.outdoorCount) || 0
  const price = Number(addForm.value.courierOutdoorPrice || addForm.value.outdoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const courierGrandTotal = computed(() => {
  return Number((courierIndoorTotal.value + courierOutdoorTotal.value).toFixed(2))
})

// Add Form Calculations: Venue Billing
const venueIndoorTotal = computed(() => {
  const count = Number(addForm.value.indoorCount) || 0
  const price = Number(addForm.value.venueIndoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const venueOutdoorTotal = computed(() => {
  const count = Number(addForm.value.outdoorCount) || 0
  const price = Number(addForm.value.venueOutdoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const venueGrandTotal = computed(() => {
  return Number((venueIndoorTotal.value + venueOutdoorTotal.value).toFixed(2))
})

const netAddProfit = computed(() => {
  return Number((venueGrandTotal.value - courierGrandTotal.value).toFixed(2))
})

const totalAddPackages = computed(() => {
  const indoor = Number(addForm.value.indoorCount) || 0
  const outdoor = Number(addForm.value.outdoorCount) || 0
  return (indoor > 0 ? indoor : 0) + (outdoor > 0 ? outdoor : 0)
})

// Compatibility aliases
const indoorTotal = courierIndoorTotal
const outdoorTotal = courierOutdoorTotal
const grandAddTotal = courierGrandTotal

// Edit Form Calculation
const editCourierTotal = computed(() => {
  const count = Number(editForm.value.packageCount) || 0
  const price = Number(editForm.value.courierUnitPrice || editForm.value.unitPrice) || 0
  if (count <= 0 || price < 0) return 0
  return Number((count * price).toFixed(2))
})

const editVenueTotal = computed(() => {
  const count = Number(editForm.value.packageCount) || 0
  const price = Number(editForm.value.venueUnitPrice) || 0
  if (count <= 0 || price < 0) return 0
  return Number((count * price).toFixed(2))
})

const editTotal = editCourierTotal

const setDateQuickFilter = (daysOffset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  filterDate.value = d.toISOString().substring(0, 10)
  fetchDeliveries()
}

const openAddModal = async () => {
  const defaultVenue = activeVenues.value.length > 0 ? activeVenues.value[0] : null
  const defaultCourier = activeCouriers.value.length > 0 ? activeCouriers.value[0] : null

  addForm.value = {
    date: filterDate.value || new Date().toISOString().substring(0, 10),
    courierId: defaultCourier ? defaultCourier.id : '',
    venueId: defaultVenue ? defaultVenue.id : '',
    venueIndoorPrice: defaultVenue ? defaultVenue.indoorPrice : '',
    venueOutdoorPrice: defaultVenue ? defaultVenue.outdoorPrice : '',
    courierIndoorPrice: defaultCourier?.indoorPrice ? defaultCourier.indoorPrice : (defaultVenue ? defaultVenue.indoorPrice : ''),
    courierOutdoorPrice: defaultCourier?.outdoorPrice ? defaultCourier.outdoorPrice : (defaultVenue ? defaultVenue.outdoorPrice : ''),
    indoorPrice: defaultCourier?.indoorPrice ? defaultCourier.indoorPrice : (defaultVenue ? defaultVenue.indoorPrice : ''),
    indoorCount: '',
    outdoorPrice: defaultCourier?.outdoorPrice ? defaultCourier.outdoorPrice : (defaultVenue ? defaultVenue.outdoorPrice : ''),
    outdoorCount: ''
  }
  addFormErrors.value = {}
  isAddModalOpen.value = true

  if (defaultCourier && defaultVenue) {
    await fetchAddRates()
  }
}

const openEditModal = (record: DeliveryRecordItem) => {
  selectedDeliveryId.value = record.id
  editForm.value = {
    date: record.date,
    courierId: record.courierId,
    venueId: record.venueId,
    deliveryType: record.deliveryType,
    courierUnitPrice: record.courierPriceSnapshot !== undefined && record.courierPriceSnapshot > 0 ? record.courierPriceSnapshot : record.unitPriceSnapshot,
    venueUnitPrice: record.venuePriceSnapshot !== undefined && record.venuePriceSnapshot > 0 ? record.venuePriceSnapshot : Number(record.venue?.indoorPrice || record.unitPriceSnapshot),
    unitPrice: record.unitPriceSnapshot,
    packageCount: record.packageCount
  }
  editFormErrors.value = {}
  isEditModalOpen.value = true
}

const openDeleteConfirm = (record: DeliveryRecordItem) => {
  deliveryToDelete.value = record
  isConfirmDeleteOpen.value = true
}

const handleConfirmDelete = async () => {
  if (deliveryToDelete.value) {
    const success = await deleteDelivery(deliveryToDelete.value.id)
    if (success) {
      isConfirmDeleteOpen.value = false
      deliveryToDelete.value = null
      await fetchVenues()
    }
  }
}

const validateAddForm = () => {
  const errors: Record<string, string> = {}
  if (!addForm.value.date) {
    errors.date = 'Tarih zorunludur.'
  }
  if (!addForm.value.courierId) {
    errors.courierId = 'Kurye seçimi zorunludur.'
  }

  const indoorCountNum = Number(addForm.value.indoorCount) || 0
  const outdoorCountNum = Number(addForm.value.outdoorCount) || 0

  if (indoorCountNum <= 0 && outdoorCountNum <= 0) {
    errors.general = 'En az bir teslimat tipi için (İç Mekan veya Dış Mekan) paket sayısı girmelisiniz.'
  }

  addFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleAddSubmit = async () => {
  if (!validateAddForm()) return

  const payload: DeliveryFormData = {
    date: addForm.value.date,
    courierId: addForm.value.courierId,
    venueId: addForm.value.venueId || undefined,
    indoorCount: Number(addForm.value.indoorCount) || 0,
    outdoorCount: Number(addForm.value.outdoorCount) || 0,
    venueIndoorPrice: Number(addForm.value.venueIndoorPrice) || 0,
    venueOutdoorPrice: Number(addForm.value.venueOutdoorPrice) || 0,
    courierIndoorPrice: Number(addForm.value.courierIndoorPrice || addForm.value.indoorPrice) || 0,
    courierOutdoorPrice: Number(addForm.value.courierOutdoorPrice || addForm.value.outdoorPrice) || 0,
    indoorPrice: Number(addForm.value.courierIndoorPrice || addForm.value.indoorPrice) || 0,
    outdoorPrice: Number(addForm.value.courierOutdoorPrice || addForm.value.outdoorPrice) || 0
  }

  const success = await createDelivery(payload)
  if (success) {
    isAddModalOpen.value = false
    fetchVenues() // Refresh venue counts as well
  }
}

const validateEditForm = () => {
  const errors: Record<string, string> = {}
  if (!editForm.value.date) {
    errors.date = 'Tarih zorunludur.'
  }
  if (!editForm.value.courierId) {
    errors.courierId = 'Kurye seçimi zorunludur.'
  }
  const count = Number(editForm.value.packageCount)
  if (isNaN(count) || !Number.isInteger(count) || count <= 0) {
    errors.packageCount = 'Paket sayısı en az 1 olmalıdır.'
  }
  editFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleEditSubmit = async () => {
  if (!validateEditForm() || !selectedDeliveryId.value) return

  const payload: DeliveryFormData = {
    date: editForm.value.date,
    courierId: editForm.value.courierId,
    venueId: editForm.value.venueId || undefined,
    deliveryType: editForm.value.deliveryType,
    courierUnitPrice: Number(editForm.value.courierUnitPrice || editForm.value.unitPrice),
    venueUnitPrice: Number(editForm.value.venueUnitPrice),
    unitPrice: Number(editForm.value.courierUnitPrice || editForm.value.unitPrice),
    packageCount: Number(editForm.value.packageCount)
  }

  const success = await updateDelivery(selectedDeliveryId.value, payload)
  if (success) {
    isEditModalOpen.value = false
    fetchVenues()
  }
}

onMounted(async () => {
  await Promise.all([
    fetchDeliveries(),
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
          <Package class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Paket Kayıtları & Hakediş</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kuryelerin günlük iç ve dış mekan teslimatlarını ve birim fiyatlarını girerek hakediş hesaplayın.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <BaseButton
          variant="outline"
          size="md"
          :disabled="loading"
          @click="fetchDeliveries()"
        >
          <template #leading>
            <RefreshCw :class="['w-4 h-4', loading ? 'animate-spin' : '']" />
          </template>
          Yenile
        </BaseButton>
        <BaseButton variant="primary" size="md" @click="openAddModal">
          <template #leading>
            <Plus class="w-4 h-4" />
          </template>
          Paket Kaydı Ekle
        </BaseButton>
      </div>
    </div>

    <!-- Filter & Date Selection Bar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Date Selector -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Tarih
          </label>
          <BaseInput
            v-model="filterDate"
            type="date"
            @blur="fetchDeliveries"
          />
        </div>

        <!-- Courier Filter -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Kurye
          </label>
          <BaseSelect
            v-model="filterCourierId"
            :options="[
              { value: 'all', label: 'Tüm Kuryeler' },
              ...couriers.map(c => ({ value: c.id, label: `${c.name} ${!c.isActive ? '(Pasif)' : ''}` }))
            ]"
            @change="fetchDeliveries"
          />
        </div>

        <!-- Delivery Type Filter -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Teslimat Tipi
          </label>
          <BaseSelect
            v-model="filterDeliveryType"
            :options="[
              { value: 'all', label: 'Tüm Tipler (İç + Dış)' },
              { value: 'INDOOR', label: 'Yalnızca İç Paket' },
              { value: 'OUTDOOR', label: 'Yalnızca Dış Paket' }
            ]"
            @change="fetchDeliveries"
          />
        </div>
      </div>

      <!-- Quick Date Shortcuts -->
      <div class="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500">Hızlı Seçim:</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          @click="setDateQuickFilter(0)"
        >
          Bugün
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          @click="setDateQuickFilter(-1)"
        >
          Dün
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          @click="filterDate = ''; fetchDeliveries()"
        >
          Tüm Tarihler
        </button>
      </div>
    </div>

    <!-- Operational KPI Summary Cards (Kurye Hakedişi, Mekan Tahsilatı ve Net Kâr) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Toplam Paket Kartı -->
      <BaseCard no-padding class="p-4 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Toplam Paket Sayısı
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {{ summary.totalPackages }} Adet
          </div>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>İç: {{ summary.indoorPackages }} / Dış: {{ summary.outdoorPackages }}</span>
          <span>{{ summary.totalRecords }} kayıt</span>
        </div>
      </BaseCard>

      <!-- 2. Kurye Hakediş Toplamı -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-amber-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center justify-between">
            <span>Kurye Hakedişi (Ödenen)</span>
            <Bike class="w-4 h-4 text-amber-500" />
          </div>
          <div class="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 font-mono">
            {{ (summary.totalCourierAmount || summary.totalSettlementAmount || 0).toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-amber-700 dark:text-amber-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Kuryelere ödenecek toplam</span>
        </div>
      </BaseCard>

      <!-- 3. Mekan Tahsilat Toplamı -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-indigo-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-indigo-800 dark:text-indigo-400 flex items-center justify-between">
            <span>Mekan Ücreti (Alınan)</span>
            <Store class="w-4 h-4 text-indigo-500" />
          </div>
          <div class="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1 font-mono">
            {{ (summary.totalVenueAmount || summary.totalSettlementAmount || 0).toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-indigo-700 dark:text-indigo-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Mekanlardan tahsil edilecek</span>
        </div>
      </BaseCard>

      <!-- 4. NET FARK / KÂR KARTI -->
      <BaseCard no-padding class="p-4 bg-slate-900 dark:bg-slate-900 text-white border-slate-800 dark:border-slate-700 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Net Kâr / Fark</span>
            <Sparkles class="w-4 h-4 text-emerald-400" />
          </div>
          <div class="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {{ (summary.netProfitAmount !== undefined ? summary.netProfitAmount : ((summary.totalVenueAmount || 0) - (summary.totalCourierAmount || summary.totalSettlementAmount || 0))).toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 dark:border-slate-800 flex items-center justify-between">
          <span>Mekan Alınan - Kurye Ödenen</span>
        </div>
      </BaseCard>
    </div>

    <!-- Deliveries Table / Empty State -->
    <div v-if="!loading && deliveries.length === 0">
      <BaseEmptyState
        title="Seçilen kriterlere uygun paket kaydı bulunamadı."
        description="Yukarıdaki filtrelere uygun paket kaydı bulunmuyor. Yeni bir günlük teslimat kaydı ekleyebilirsiniz."
        action-text="Paket Kaydı Ekle"
        @action="openAddModal"
      >
        <template #icon>
          <Package class="w-6 h-6 stroke-[1.5]" />
        </template>
      </BaseEmptyState>
    </div>

    <div v-else class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tarih</th>
              <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Kurye</th>
              <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Mekan</th>
              <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center">Teslimat Tipi</th>
              <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Paket</th>
              <th class="px-4 py-3 font-semibold text-amber-800 dark:text-amber-400 text-right">Kurye Hakediş</th>
              <th class="px-4 py-3 font-semibold text-indigo-800 dark:text-indigo-400 text-right">Mekan Ücreti</th>
              <th class="px-4 py-3 font-semibold text-emerald-800 dark:text-emerald-400 text-right">Net Kâr</th>
              <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="item in deliveries"
              :key="item.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
            >
              <!-- Tarih -->
              <td class="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400 text-xs">
                {{ item.date }}
              </td>

              <!-- Kurye -->
              <td class="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded bg-slate-900 dark:bg-slate-700 text-white dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Bike class="w-3 h-3" />
                  </div>
                  <span>{{ item.courier?.name || 'Mekan Genel Kaydı' }}</span>
                </div>
              </td>

              <!-- Mekan -->
              <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                <div class="flex items-center gap-1.5">
                  <Store class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span class="text-xs">{{ item.venue?.name || 'Genel' }}</span>
                </div>
              </td>

              <!-- Teslimat Tipi -->
              <td class="px-4 py-3.5 text-center">
                <BaseBadge
                  :variant="item.deliveryType === 'INDOOR' ? 'success' : 'brand'"
                  dot
                >
                  {{ item.deliveryType === 'INDOOR' ? 'İç Mekan' : 'Dış Mekan' }}
                </BaseBadge>
              </td>

              <!-- Paket Sayısı -->
              <td class="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                {{ item.packageCount }}
              </td>

              <!-- Kurye Hakediş Tutarı -->
              <td class="px-4 py-3.5 text-right font-bold text-amber-700 dark:text-amber-400 font-mono">
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200/60 dark:border-amber-800/60">
                  {{ (item.courierTotalAmount !== undefined ? item.courierTotalAmount : item.totalAmount).toFixed(2) }} ₺
                </span>
                <div class="text-[10px] text-slate-400 font-normal">
                  @{{ (item.courierPriceSnapshot !== undefined ? item.courierPriceSnapshot : item.unitPriceSnapshot).toFixed(2) }} ₺
                </div>
              </td>

              <!-- Mekan Ücreti Tutarı -->
              <td class="px-4 py-3.5 text-right font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                  {{ (item.venueTotalAmount !== undefined ? item.venueTotalAmount : item.totalAmount).toFixed(2) }} ₺
                </span>
                <div class="text-[10px] text-slate-400 font-normal">
                  @{{ (item.venuePriceSnapshot !== undefined ? item.venuePriceSnapshot : (item.venue?.indoorPrice || item.unitPriceSnapshot)).toFixed(2) }} ₺
                </div>
              </td>

              <!-- Net Kâr / Fark -->
              <td class="px-4 py-3.5 text-right font-bold font-mono">
                <span :class="[
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold',
                  ((item.venueTotalAmount || item.totalAmount) - (item.courierTotalAmount || item.totalAmount)) >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
                ]">
                  {{ ((item.venueTotalAmount !== undefined ? item.venueTotalAmount : item.totalAmount) - (item.courierTotalAmount !== undefined ? item.courierTotalAmount : item.totalAmount)).toFixed(2) }} ₺
                </span>
              </td>

              <!-- İşlemler -->
              <td class="px-4 py-3.5 text-right">
                <div class="flex items-center justify-end gap-1">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    title="Düzenle"
                    @click="openEditModal(item)"
                  >
                    <Edit2 class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    title="Sil"
                    @click="openDeleteConfirm(item)"
                  >
                    <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alt Özet Satırı -->
      <div class="px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
        <span>Toplam <strong class="text-slate-900 dark:text-slate-100 font-bold">{{ deliveries.length }}</strong> kayıt listelendi</span>
        <div class="flex flex-wrap items-center gap-4 text-xs">
          <span class="text-amber-800 dark:text-amber-400 font-semibold">
            Kurye Hakediş: <strong class="font-mono text-amber-900 dark:text-amber-300 font-bold">{{ (summary.totalCourierAmount || summary.totalSettlementAmount || 0).toFixed(2) }} ₺</strong>
          </span>
          <span class="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <span class="text-indigo-800 dark:text-indigo-400 font-semibold">
            Mekan Tahsilat: <strong class="font-mono text-indigo-900 dark:text-indigo-300 font-bold">{{ (summary.totalVenueAmount || summary.totalSettlementAmount || 0).toFixed(2) }} ₺</strong>
          </span>
          <span class="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <span class="text-emerald-800 dark:text-emerald-400 font-bold">
            Net Kâr: <strong class="text-emerald-700 dark:text-emerald-400 font-extrabold font-mono text-sm">{{ (summary.netProfitAmount !== undefined ? summary.netProfitAmount : ((summary.totalVenueAmount || 0) - (summary.totalCourierAmount || summary.totalSettlementAmount || 0))).toFixed(2) }} ₺</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- 1. YENİ PAKET KAYDI EKLEME MODAL (İç Mekan & Dış Mekan Birlikte Hesaplama) -->
    <BaseModal
      v-model="isAddModalOpen"
      title="Paket Kaydı Ekle"
      description="Tarih, kurye ve teslimat tipine göre (İç ve Dış Paket) birim fiyat ve paket sayılarını giriniz."
    >
      <form class="space-y-4" @submit.prevent="handleAddSubmit">
        <!-- Genel Hata Bildirimi -->
        <div v-if="addFormErrors.general" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-medium">
          {{ addFormErrors.general }}
        </div>

        <!-- 1. Tarih ve Kurye Seçimi -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput
            v-model="addForm.date"
            label="Tarih"
            type="date"
            :error="addFormErrors.date"
            required
          />

          <BaseSelect
            v-model="addForm.courierId"
            label="Kurye"
            :options="activeCouriers.map(c => ({ value: c.id, label: c.name }))"
            :error="addFormErrors.courierId"
            placeholder="Kurye seçiniz..."
            required
            @change="onAddCourierChange"
          />
        </div>

        <!-- 2. TESLİMAT PAKET SAYILARI -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 space-y-1">
            <BaseInput
              v-model="addForm.indoorCount"
              label="İç Paket Sayısı (Adet)"
              type="number"
              min="0"
              step="1"
              placeholder="Örn: 10"
              hint="İç teslimat adedi"
            />
          </div>

          <div class="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/50 space-y-1">
            <BaseInput
              v-model="addForm.outdoorCount"
              label="Dış Paket Sayısı (Adet)"
              type="number"
              min="0"
              step="1"
              placeholder="Örn: 5"
              hint="Dış teslimat adedi"
            />
          </div>
        </div>

        <!-- 3. FİYAT GİRİŞLERİ: KURYE HAKEDİŞİ VE MEKAN TAHSİLATI (AYRI AYRI) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Kurye Hakediş Fiyatları -->
          <div class="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bike class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Kurye Hakedişi (Ödenen)</span>
              </span>
              <span class="text-xs font-bold font-mono text-amber-800 dark:text-amber-300">
                Toplam: {{ courierGrandTotal.toFixed(2) }} ₺
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <BaseInput
                v-model="addForm.courierIndoorPrice"
                label="İç Hakediş (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Örn: 30.00"
                hint="Paket başı hakediş"
              />
              <BaseInput
                v-model="addForm.courierOutdoorPrice"
                label="Dış Hakediş (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Örn: 32.00"
                hint="Paket başı hakediş"
              />
            </div>
          </div>

          <!-- Mekan Tahsilat Fiyatları -->
          <div class="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Store class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Mekan Ücreti (Alınan)</span>
              </span>
              <span class="text-xs font-bold font-mono text-indigo-800 dark:text-indigo-300">
                Toplam: {{ venueGrandTotal.toFixed(2) }} ₺
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <BaseInput
                v-model="addForm.venueIndoorPrice"
                label="İç Mekan (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Örn: 45.00"
                hint="Mekandan alınan"
              />
              <BaseInput
                v-model="addForm.venueOutdoorPrice"
                label="Dış Mekan (₺)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Örn: 50.00"
                hint="Mekandan alınan"
              />
            </div>
          </div>
        </div>

        <!-- 4. CANLI HESAPLAMA & GENEL TOPLAM HAKEDİŞ ÖNİZLEME KARTI -->
        <div class="p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white space-y-2.5 border border-slate-800 dark:border-slate-700">
          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Toplam Paket Sayısı:</span>
            <span class="font-bold font-mono text-white">{{ totalAddPackages }} Adet (İç: {{ addForm.indoorCount || 0 }} / Dış: {{ addForm.outdoorCount || 0 }})</span>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 dark:border-slate-700">
            <div class="p-2 rounded-lg bg-slate-800/80 dark:bg-slate-900/60 text-center">
              <div class="text-[10px] text-amber-300 uppercase font-bold">Kurye Hakedişi</div>
              <div class="text-base font-extrabold font-mono text-amber-400">{{ courierGrandTotal.toFixed(2) }} ₺</div>
            </div>
            <div class="p-2 rounded-lg bg-slate-800/80 dark:bg-slate-900/60 text-center">
              <div class="text-[10px] text-indigo-300 uppercase font-bold">Mekan Tahsilatı</div>
              <div class="text-base font-extrabold font-mono text-indigo-400">{{ venueGrandTotal.toFixed(2) }} ₺</div>
            </div>
            <div class="p-2 rounded-lg bg-slate-800/80 dark:bg-slate-900/60 text-center">
              <div class="text-[10px] text-emerald-300 uppercase font-bold">Net Fark / Kâr</div>
              <div class="text-base font-extrabold font-mono text-emerald-400">{{ netAddProfit.toFixed(2) }} ₺</div>
            </div>
          </div>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
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
            Kaydı Oluştur
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 2. PAKET KAYDI DÜZENLEME MODAL (Tek Kayıt) -->
    <BaseModal
      v-model="isEditModalOpen"
      title="Paket Kaydını Düzenle"
      description="Paket kaydı bilgilerini, kurye hakedişini, mekan ücretini ve paket adedini güncelleyin."
    >
      <form class="space-y-4" @submit.prevent="handleEditSubmit">
        <!-- Tarih -->
        <BaseInput
          v-model="editForm.date"
          label="Tarih"
          type="date"
          :error="editFormErrors.date"
          required
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Kurye -->
          <BaseSelect
            v-model="editForm.courierId"
            label="Kurye"
            :options="activeCouriers.map(c => ({ value: c.id, label: c.name }))"
            :error="editFormErrors.courierId"
            placeholder="Kurye seçiniz..."
            required
          />

          <!-- Mekan -->
          <BaseSelect
            v-model="editForm.venueId"
            label="Mekan"
            :options="[
              { value: '', label: 'Genel' },
              ...activeVenues.map(v => ({ value: v.id, label: v.name }))
            ]"
            placeholder="Mekan seçiniz..."
          />
        </div>

        <!-- Teslimat Tipi -->
        <div>
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Teslimat Tipi
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              :class="[
                'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all',
                editForm.deliveryType === 'INDOOR'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-900/40'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              ]"
              @click="editForm.deliveryType = 'INDOOR'"
            >
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              İç Mekan
            </button>

            <button
              type="button"
              :class="[
                'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all',
                editForm.deliveryType === 'OUTDOOR'
                  ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 dark:border-sky-600 text-sky-800 dark:text-sky-300 ring-2 ring-sky-200 dark:ring-sky-900/40'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              ]"
              @click="editForm.deliveryType = 'OUTDOOR'"
            >
              <span class="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Dış Mekan
            </button>
          </div>
        </div>

        <!-- Paket Sayısı -->
        <BaseInput
          v-model="editForm.packageCount"
          label="Paket Sayısı (Adet)"
          type="number"
          min="1"
          step="1"
          placeholder="Örn: 10"
          :error="editFormErrors.packageCount"
          hint="Teslim edilen toplam paket adedi"
          required
        />

        <!-- Ayrı Ayrı Fiyat Girişleri (Kurye & Mekan) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseInput
            v-model="editForm.courierUnitPrice"
            label="Kurye Birim Hakedişi (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="Örn: 30.00"
            hint="Kuryeye ödenecek birim ücret"
            required
          />

          <BaseInput
            v-model="editForm.venueUnitPrice"
            label="Mekan Birim Ücreti (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="Örn: 45.00"
            hint="Mekandan alınan birim ücret"
            required
          />
        </div>

        <!-- Önizleme Kartı -->
        <div class="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white space-y-2 border border-slate-800 dark:border-slate-700">
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 rounded bg-slate-800 dark:bg-slate-900/70">
              <div class="text-[10px] text-amber-300 uppercase font-bold">Kurye Hakediş</div>
              <div class="text-sm font-extrabold font-mono text-amber-400">{{ editCourierTotal.toFixed(2) }} ₺</div>
            </div>
            <div class="p-2 rounded bg-slate-800 dark:bg-slate-900/70">
              <div class="text-[10px] text-indigo-300 uppercase font-bold">Mekan Tahsilat</div>
              <div class="text-sm font-extrabold font-mono text-indigo-400">{{ editVenueTotal.toFixed(2) }} ₺</div>
            </div>
            <div class="p-2 rounded bg-slate-800 dark:bg-slate-900/70">
              <div class="text-[10px] text-emerald-300 uppercase font-bold">Net Fark</div>
              <div class="text-sm font-extrabold font-mono text-emerald-400">{{ (editVenueTotal - editCourierTotal).toFixed(2) }} ₺</div>
            </div>
          </div>
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            @click="isEditModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="loading"
          >
            Kaydı Güncelle
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Silme Onay Modal -->
    <BaseConfirmDialog
      v-model="isConfirmDeleteOpen"
      title="Paket Kaydını Sil"
      :message="deliveryToDelete ? `Bu paket kaydını (${deliveryToDelete.courier?.name || deliveryToDelete.venue?.name || 'Mekan Kaydı'} — ${deliveryToDelete.packageCount} Adet ${deliveryToDelete.deliveryType === 'INDOOR' ? 'İç' : 'Dış'} Mekan) kalıcı olarak silmek istediğinize emin misiniz?` : 'Seçili paket kaydını kalıcı olarak silmek istediğinize emin misiniz?'"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
