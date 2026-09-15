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
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-vue-next'
import { useDeliveries, type DeliveryRecordItem, type DeliveryFormData } from '~/composables/useDeliveries'
import { useCouriers } from '~/composables/useCouriers'

useHead({
  title: 'Paket Kayıtları & Hakediş — KuryeTakip'
})

const {
  deliveries,
  summary,
  loading,
  filterDate,
  filterCourierId,
  filterDeliveryType,
  fetchDeliveries,
  createDelivery,
  updateDelivery,
  deleteDelivery
} = useDeliveries()

const { couriers, fetchCouriers } = useCouriers()

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
  indoorPrice: '' as string | number,
  indoorCount: '' as string | number,
  outdoorPrice: '' as string | number,
  outdoorCount: '' as string | number
})

// Edit Form State (Single Record)
const editForm = ref({
  date: new Date().toISOString().substring(0, 10),
  courierId: '',
  deliveryType: 'INDOOR' as 'INDOOR' | 'OUTDOOR',
  unitPrice: '' as string | number,
  packageCount: 1 as string | number
})

const addFormErrors = ref<Record<string, string>>({})
const editFormErrors = ref<Record<string, string>>({})

// Active couriers for selection
const activeCouriers = computed(() => couriers.value.filter(c => c.isActive))

// Add Form Calculations
const indoorTotal = computed(() => {
  const count = Number(addForm.value.indoorCount) || 0
  const price = Number(addForm.value.indoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const outdoorTotal = computed(() => {
  const count = Number(addForm.value.outdoorCount) || 0
  const price = Number(addForm.value.outdoorPrice) || 0
  if (count <= 0 || price <= 0) return 0
  return Number((count * price).toFixed(2))
})

const totalAddPackages = computed(() => {
  const indoor = Number(addForm.value.indoorCount) || 0
  const outdoor = Number(addForm.value.outdoorCount) || 0
  return (indoor > 0 ? indoor : 0) + (outdoor > 0 ? outdoor : 0)
})

const grandAddTotal = computed(() => {
  return Number((indoorTotal.value + outdoorTotal.value).toFixed(2))
})

// Edit Form Calculation
const editTotal = computed(() => {
  const count = Number(editForm.value.packageCount) || 0
  const price = Number(editForm.value.unitPrice) || 0
  if (count <= 0 || price < 0) return 0
  return Number((count * price).toFixed(2))
})

const setDateQuickFilter = (daysOffset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  filterDate.value = d.toISOString().substring(0, 10)
  fetchDeliveries()
}

const openAddModal = () => {
  addForm.value = {
    date: filterDate.value || new Date().toISOString().substring(0, 10),
    courierId: activeCouriers.value.length > 0 ? activeCouriers.value[0].id : '',
    indoorPrice: '',
    indoorCount: '',
    outdoorPrice: '',
    outdoorCount: ''
  }
  addFormErrors.value = {}
  isAddModalOpen.value = true
}

const openEditModal = (record: DeliveryRecordItem) => {
  selectedDeliveryId.value = record.id
  editForm.value = {
    date: record.date,
    courierId: record.courierId,
    deliveryType: record.deliveryType,
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
    await deleteDelivery(deliveryToDelete.value.id)
    isConfirmDeleteOpen.value = false
    deliveryToDelete.value = null
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

  if (indoorCountNum > 0) {
    const p = Number(addForm.value.indoorPrice)
    if (addForm.value.indoorPrice === '' || isNaN(p) || p < 0) {
      errors.indoorPrice = 'İç mekan birim fiyatı giriniz.'
    }
  }

  if (outdoorCountNum > 0) {
    const p = Number(addForm.value.outdoorPrice)
    if (addForm.value.outdoorPrice === '' || isNaN(p) || p < 0) {
      errors.outdoorPrice = 'Dış mekan birim fiyatı giriniz.'
    }
  }

  addFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleAddSubmit = async () => {
  if (!validateAddForm()) return

  const payload: DeliveryFormData = {
    date: addForm.value.date,
    courierId: addForm.value.courierId,
    indoorCount: Number(addForm.value.indoorCount) || 0,
    indoorPrice: Number(addForm.value.indoorPrice) || 0,
    outdoorCount: Number(addForm.value.outdoorCount) || 0,
    outdoorPrice: Number(addForm.value.outdoorPrice) || 0
  }

  const success = await createDelivery(payload)
  if (success) {
    isAddModalOpen.value = false
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
  const price = Number(editForm.value.unitPrice)
  if (editForm.value.unitPrice === '' || isNaN(price) || price < 0) {
    errors.unitPrice = 'Geçerli bir birim fiyat giriniz.'
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
    deliveryType: editForm.value.deliveryType,
    unitPrice: Number(editForm.value.unitPrice),
    packageCount: Number(editForm.value.packageCount)
  }

  const success = await updateDelivery(selectedDeliveryId.value, payload)
  if (success) {
    isEditModalOpen.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchDeliveries(),
    fetchCouriers()
  ])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Package class="w-6 h-6 text-emerald-600" />
          <span>Paket Kayıtları & Hakediş</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
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
    <div class="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Date Selector -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
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
      <div class="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
        <span class="text-[11px] font-medium text-slate-400">Hızlı Seçim:</span>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-xs hover:bg-slate-100 text-slate-700 transition-colors"
          @click="setDateQuickFilter(0)"
        >
          Bugün
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-xs hover:bg-slate-100 text-slate-700 transition-colors"
          @click="setDateQuickFilter(-1)"
        >
          Dün
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded text-xs hover:bg-slate-100 text-slate-700 transition-colors"
          @click="filterDate = ''; fetchDeliveries()"
        >
          Tüm Tarihler
        </button>
      </div>
    </div>

    <!-- Operational KPI Summary Cards (İç ve Dış Mekan Detaylı Hesaplama) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Toplam Paket Kartı -->
      <BaseCard no-padding class="p-4 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500">
            Toplam Paket Sayısı
          </div>
          <div class="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {{ summary.totalPackages }} Adet
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
          {{ summary.totalRecords }} teslimat kaydı
        </div>
      </BaseCard>

      <!-- 2. İç Mekan Toplamı (Adet & Hakediş Tutarı) -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>İç Mekan Hakediş</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div class="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {{ (summary.indoorSettlementAmount || 0).toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-emerald-600/90 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span>İç Paket Adedi:</span>
          <span class="font-bold font-mono">{{ summary.indoorPackages }} Adet</span>
        </div>
      </BaseCard>

      <!-- 3. Dış Mekan Toplamı (Adet & Hakediş Tutarı) -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-sky-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-sky-800 flex items-center justify-between">
            <span>Dış Mekan Hakediş</span>
            <span class="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <div class="text-2xl font-bold text-sky-700 mt-1 font-mono">
            {{ (summary.outdoorSettlementAmount || 0).toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] font-medium text-sky-600/90 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span>Dış Paket Adedi:</span>
          <span class="font-bold font-mono">{{ summary.outdoorPackages }} Adet</span>
        </div>
      </BaseCard>

      <!-- 4. GENEL TOPLAM HAKEDİŞ -->
      <BaseCard no-padding class="p-4 bg-slate-900 text-white border-slate-800 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Genel Toplam Hakediş
          </div>
          <div class="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {{ (summary.totalSettlementAmount || 0).toFixed(2) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span>İç + Dış Toplam</span>
          <span class="font-mono text-emerald-300 font-semibold">{{ summary.totalPackages }} Paket</span>
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

    <div v-else class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 font-semibold text-slate-700">Tarih</th>
              <th class="px-4 py-3 font-semibold text-slate-700">Kurye</th>
              <th class="px-4 py-3 font-semibold text-slate-700 text-center">Teslimat Tipi</th>
              <th class="px-4 py-3 font-semibold text-slate-700 text-right">Birim Fiyat</th>
              <th class="px-4 py-3 font-semibold text-slate-700 text-right">Paket Sayısı</th>
              <th class="px-4 py-3 font-semibold text-slate-900 text-right">Toplam Hakediş</th>
              <th class="px-4 py-3 font-semibold text-slate-700 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in deliveries"
              :key="item.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- Tarih -->
              <td class="px-4 py-3.5 font-mono text-slate-600 text-xs">
                {{ item.date }}
              </td>

              <!-- Kurye -->
              <td class="px-4 py-3.5 font-semibold text-slate-900">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Bike class="w-3 h-3 text-emerald-400" />
                  </div>
                  <span>{{ item.courier.name }}</span>
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

              <!-- Birim Fiyat Snapshot -->
              <td class="px-4 py-3.5 text-right font-mono text-slate-700 font-semibold">
                {{ item.unitPriceSnapshot.toFixed(2) }} ₺
              </td>

              <!-- Paket Sayısı -->
              <td class="px-4 py-3.5 text-right font-bold text-slate-900 font-mono">
                {{ item.packageCount }}
              </td>

              <!-- Toplam Hakediş Tutarı -->
              <td class="px-4 py-3.5 text-right font-bold text-slate-900 font-mono">
                <span class="inline-flex items-center px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-200/60">
                  {{ item.totalAmount.toFixed(2) }} ₺
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
                    <Edit2 class="w-3.5 h-3.5 text-slate-600" />
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    title="Sil"
                    @click="openDeleteConfirm(item)"
                  >
                    <Trash2 class="w-3.5 h-3.5 text-rose-600" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Alt Özet Satırı (İç Mekan, Dış Mekan ve Genel Toplam) -->
      <div class="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-medium">
        <span>Toplam <strong class="text-slate-900 font-bold">{{ deliveries.length }}</strong> kayıt listelendi</span>
        <div class="flex flex-wrap items-center gap-4 text-xs">
          <span class="text-emerald-800 font-semibold">
            İç Mekan: <strong class="font-mono text-emerald-900 font-bold">{{ (summary.indoorSettlementAmount || 0).toFixed(2) }} ₺</strong> ({{ summary.indoorPackages }} Paket)
          </span>
          <span class="text-slate-300 hidden sm:inline">|</span>
          <span class="text-sky-800 font-semibold">
            Dış Mekan: <strong class="font-mono text-sky-900 font-bold">{{ (summary.outdoorSettlementAmount || 0).toFixed(2) }} ₺</strong> ({{ summary.outdoorPackages }} Paket)
          </span>
          <span class="text-slate-300 hidden sm:inline">|</span>
          <span class="text-slate-900 font-bold">
            Genel Toplam: <strong class="text-emerald-700 font-extrabold font-mono text-sm">{{ (summary.totalSettlementAmount || 0).toFixed(2) }} ₺</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- 1. YENİ PAKET KAYDI EKLEME MODAL (İç Mekan & Dış Mekan Birlikte Hesaplama) -->
    <BaseModal
      v-model="isAddModalOpen"
      title="Paket Kaydı Ekle"
      description="Tarih, kurye ve teslimat tipine göre (İç ve Dış Mekan) birim fiyat ve paket sayılarını giriniz."
    >
      <form class="space-y-4" @submit.prevent="handleAddSubmit">
        <!-- Genel Hata Bildirimi -->
        <div v-if="addFormErrors.general" class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
          {{ addFormErrors.general }}
        </div>

        <!-- 1. Tarih & Kurye Seçimi -->
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
          />
        </div>

        <!-- 2. İÇ MEKAN TESLİMATLARI BÖLÜMÜ -->
        <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span class="text-xs font-bold text-emerald-950 uppercase tracking-wider">İç Mekan Teslimatı</span>
            </div>
            <span v-if="indoorTotal > 0" class="text-xs font-bold font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
              Ara Toplam: {{ indoorTotal.toFixed(2) }} ₺
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="addForm.indoorPrice"
              label="İç Mekan Birim Fiyat (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 30.00"
              :error="addFormErrors.indoorPrice"
              hint="Paket başı iç mekan hakedişi"
            />

            <BaseInput
              v-model="addForm.indoorCount"
              label="İç Mekan Paket Sayısı (Adet)"
              type="number"
              min="0"
              step="1"
              placeholder="Örn: 10"
              hint="İç teslimat adedi"
            />
          </div>
        </div>

        <!-- 3. DIŞ MEKAN TESLİMATLARI BÖLÜMÜ -->
        <div class="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span class="text-xs font-bold text-sky-950 uppercase tracking-wider">Dış Mekan Teslimatı</span>
            </div>
            <span v-if="outdoorTotal > 0" class="text-xs font-bold font-mono text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
              Ara Toplam: {{ outdoorTotal.toFixed(2) }} ₺
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="addForm.outdoorPrice"
              label="Dış Mekan Birim Fiyat (₺)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Örn: 32.00"
              :error="addFormErrors.outdoorPrice"
              hint="Paket başı dış mekan hakedişi"
            />

            <BaseInput
              v-model="addForm.outdoorCount"
              label="Dış Mekan Paket Sayısı (Adet)"
              type="number"
              min="0"
              step="1"
              placeholder="Örn: 5"
              hint="Dış teslimat adedi"
            />
          </div>
        </div>

        <!-- 4. CANLI HESAPLAMA & GENEL TOPLAM HAKEDİŞ ÖNİZLEME KARTI -->
        <div class="p-4 rounded-xl bg-slate-900 text-white space-y-2.5">
          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Toplam Paket Sayısı:</span>
            <span class="font-bold font-mono text-white">{{ totalAddPackages }} Adet</span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>İç Mekan Hakediş ({{ Number(addForm.indoorCount) || 0 }} × {{ Number(addForm.indoorPrice) || 0 }} ₺):</span>
            <span class="font-bold font-mono text-emerald-400">{{ indoorTotal.toFixed(2) }} ₺</span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Dış Mekan Hakediş ({{ Number(addForm.outdoorCount) || 0 }} × {{ Number(addForm.outdoorPrice) || 0 }} ₺):</span>
            <span class="font-bold font-mono text-sky-400">{{ outdoorTotal.toFixed(2) }} ₺</span>
          </div>

          <div class="flex items-center justify-between text-sm font-bold text-white border-t border-slate-800 pt-2.5">
            <span class="flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-emerald-400" />
              <span>Genel Toplam Hakediş:</span>
            </span>
            <span class="text-emerald-400 font-mono text-lg font-extrabold">{{ grandAddTotal.toFixed(2) }} ₺</span>
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
      description="Paket kaydı bilgilerini, birim fiyatını ve paket adedini güncelleyin."
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

        <!-- Kurye -->
        <BaseSelect
          v-model="editForm.courierId"
          label="Kurye"
          :options="activeCouriers.map(c => ({ value: c.id, label: c.name }))"
          :error="editFormErrors.courierId"
          placeholder="Kurye seçiniz..."
          required
        />

        <!-- Teslimat Tipi -->
        <div>
          <label class="text-xs font-semibold text-slate-700 block mb-1.5">
            Teslimat Tipi
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              :class="[
                'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all',
                editForm.deliveryType === 'INDOOR'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
              @click="editForm.deliveryType = 'INDOOR'"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-500" />
              İç Mekan
            </button>

            <button
              type="button"
              :class="[
                'flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all',
                editForm.deliveryType === 'OUTDOOR'
                  ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
              @click="editForm.deliveryType = 'OUTDOOR'"
            >
              <span class="w-2 h-2 rounded-full bg-sky-500" />
              Dış Mekan
            </button>
          </div>
        </div>

        <!-- Birim Fiyat & Paket Sayısı -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseInput
            v-model="editForm.unitPrice"
            label="Birim Fiyat (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="Örn: 30.00"
            :error="editFormErrors.unitPrice"
            hint="Paket başına hakediş ücreti"
            required
          />

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
        </div>

        <!-- Önizleme Kartı -->
        <div class="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Birim Fiyat:</span>
            <span class="font-bold font-mono text-white">{{ editForm.unitPrice ? Number(editForm.unitPrice).toFixed(2) : '0.00' }} ₺</span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-300">
            <span>Paket Sayısı:</span>
            <span class="font-bold font-mono text-white">{{ editForm.packageCount || 0 }} Adet</span>
          </div>

          <div class="flex items-center justify-between text-sm font-bold text-white border-t border-slate-800 pt-2">
            <span>Toplam Hakediş:</span>
            <span class="text-emerald-400 font-mono text-base">{{ editTotal.toFixed(2) }} ₺</span>
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
      :message="`Bu kurye paket kaydını (${deliveryToDelete?.courier.name} - ${deliveryToDelete?.packageCount} Adet ${deliveryToDelete?.deliveryType === 'INDOOR' ? 'İç' : 'Dış'} Paket) kalıcı olarak silmek istediğinize emin misiniz?`"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
