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
  Filter
} from 'lucide-vue-next'
import { useVenues, type VenueItem, type VenueFormData } from '~/composables/useVenues'

useHead({
  title: 'Mekan Yönetimi & Günlük Paket Takibi — KuryeTakip'
})

const {
  venues,
  loading,
  searchQuery,
  filterDate,
  fetchVenues,
  createVenue,
  updateVenue,
  toggleVenueStatus,
  deleteVenue
} = useVenues()

// Modal states
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentVenueId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const venueToDelete = ref<VenueItem | null>(null)

// History / Breakdown Modal State
const isHistoryModalOpen = ref(false)
const historyVenue = ref<VenueItem | null>(null)

// Quick Daily Delivery Modal
const isQuickDeliveryOpen = ref(false)
const targetVenue = ref<VenueItem | null>(null)
const quickDeliveryForm = ref({
  date: new Date().toISOString().substring(0, 10),
  indoorCount: '' as string | number,
  outdoorCount: '' as string | number
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
  { key: 'totalAmount', label: 'Toplam Tutar', align: 'right' as const },
  { key: 'isActive', label: 'Durum', align: 'center' as const }
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

// Live calculations in Quick Delivery modal
const quickIndoorTotal = computed(() => {
  if (!targetVenue.value) return 0
  const count = Number(quickDeliveryForm.value.indoorCount) || 0
  return Number((count * targetVenue.value.indoorPrice).toFixed(2))
})

const quickOutdoorTotal = computed(() => {
  if (!targetVenue.value) return 0
  const count = Number(quickDeliveryForm.value.outdoorCount) || 0
  return Number((count * targetVenue.value.outdoorPrice).toFixed(2))
})

const quickGrandTotal = computed(() => {
  return Number((quickIndoorTotal.value + quickOutdoorTotal.value).toFixed(2))
})

// Filtered venues based on local search
const filteredVenues = computed(() => {
  if (!searchQuery.value.trim()) return venues.value
  const q = searchQuery.value.toLowerCase().trim()
  return venues.value.filter(v => v.name.toLowerCase().includes(q))
})

// Date Quick Filter Handler
const setDateQuickFilter = (type: 'today' | 'yesterday' | 'all') => {
  if (type === 'all') {
    filterDate.value = ''
  } else if (type === 'today') {
    filterDate.value = new Date().toISOString().substring(0, 10)
  } else if (type === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    filterDate.value = d.toISOString().substring(0, 10)
  }
  fetchVenues()
}

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
  formData.value = {
    name: venue.name,
    indoorPrice: venue.indoorPrice,
    outdoorPrice: venue.outdoorPrice,
    isActive: venue.isActive,
    date: filterDate.value || new Date().toISOString().substring(0, 10),
    indoorCount: '',
    outdoorCount: ''
  }
  formErrors.value = {}
  isModalOpen.value = true
}

const openQuickDelivery = (venue: VenueItem) => {
  targetVenue.value = venue
  quickDeliveryForm.value = {
    date: filterDate.value || new Date().toISOString().substring(0, 10),
    indoorCount: '',
    outdoorCount: ''
  }
  isQuickDeliveryOpen.value = true
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
    const success = await updateVenue(currentVenueId.value, formData.value)
    if (success) isModalOpen.value = false
  } else {
    const success = await createVenue(formData.value)
    if (success) isModalOpen.value = false
  }
}

const handleQuickDeliverySubmit = async () => {
  if (!targetVenue.value) return
  const indoor = Number(quickDeliveryForm.value.indoorCount) || 0
  const outdoor = Number(quickDeliveryForm.value.outdoorCount) || 0
  if (indoor <= 0 && outdoor <= 0) return

  const payload: VenueFormData = {
    name: targetVenue.value.name,
    indoorPrice: targetVenue.value.indoorPrice,
    outdoorPrice: targetVenue.value.outdoorPrice,
    isActive: targetVenue.value.isActive,
    date: quickDeliveryForm.value.date,
    indoorCount: indoor,
    outdoorCount: outdoor
  }

  const success = await updateVenue(targetVenue.value.id, payload)
  if (success) {
    isQuickDeliveryOpen.value = false
  }
}

onMounted(() => {
  fetchVenues()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Store class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Mekanlar</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Mekanların iç ve dış teslimat paket fiyatlarını yönetin, her gün atılan paket sayılarını kaydedin ve toplam hakedişleri takip edin.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <BaseButton
          variant="outline"
          size="md"
          :disabled="loading"
          @click="fetchVenues()"
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
          Mekan Ekle
        </BaseButton>
      </div>
    </div>

    <!-- KPI Summary Cards (Toplam Mekan, Atılan Paket, Tutar) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Toplam Mekan Sayısı -->
      <BaseCard no-padding class="p-4 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Kayıtlı Mekanlar
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {{ totalVenuesCount }} Mekan
          </div>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Aktif Mekan:</span>
          <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ activeVenuesCount }} Aktif</span>
        </div>
      </BaseCard>

      <!-- 2. Toplam Atılan Paket Sayısı -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>Toplam Atılan Paket</span>
            <Package class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            {{ totalPackagesAcrossVenues }} Adet
          </div>
        </div>
        <div class="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400/90 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>İç: {{ totalIndoorPackages }}</span>
          <span>·</span>
          <span>Dış: {{ totalOutdoorPackages }}</span>
        </div>
      </BaseCard>

      <!-- 3. İç Mekan / Dış Mekan Dağılımı -->
      <BaseCard no-padding class="p-4 border-l-4 border-l-sky-500 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-sky-800 dark:text-sky-300 flex items-center justify-between">
            <span>Teslimat Türü Dağılımı</span>
            <Layers class="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-emerald-700 dark:text-emerald-400 font-medium">İç Mekan:</span>
              <span class="font-mono font-bold">{{ totalIndoorPackages }} Paket</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-sky-700 dark:text-sky-400 font-medium">Dış Mekan:</span>
              <span class="font-mono font-bold">{{ totalOutdoorPackages }} Paket</span>
            </div>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          Birim fiyatlar üzerinden anlık hesaplanır
        </div>
      </BaseCard>

      <!-- 4. Toplam Tutar / Hakediş -->
      <BaseCard no-padding class="p-4 bg-slate-900 dark:bg-slate-850 text-white border-slate-800 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Toplam Hakediş / Ciro
          </div>
          <div class="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {{ totalAmountAcrossVenues.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span>Toplam Hakediş</span>
          <span class="font-mono text-emerald-300 font-semibold">{{ totalPackagesAcrossVenues }} Paket</span>
        </div>
      </BaseCard>
    </div>

    <!-- Search & Date Filter Bar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Mekan Arama
          </label>
          <BaseInput
            v-model="searchQuery"
            placeholder="Mekan adına göre ara... (Örn: Terra Pizza)"
          >
            <template #leading>
              <Search class="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </template>
          </BaseInput>
        </div>

        <!-- Date Filter Input -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Tarihe Göre Paket Hesaplama
          </label>
          <BaseInput
            v-model="filterDate"
            type="date"
            @blur="fetchVenues()"
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
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            ]"
            @click="setDateQuickFilter('today')"
          >
            Bugün
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            @click="setDateQuickFilter('yesterday')"
          >
            Dün
          </button>
          <button
            type="button"
            :class="[
              'px-2.5 py-1 rounded text-xs font-medium transition-colors',
              !filterDate ? 'bg-slate-900 text-white dark:bg-emerald-600 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            ]"
            @click="setDateQuickFilter('all')"
          >
            Tüm Zamanlar
          </button>
        </div>

        <div v-if="filterDate" class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
          <Calendar class="w-3.5 h-3.5" />
          <span>Filtrelenen Tarih: {{ filterDate }}</span>
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
              'hover:bg-slate-50/80 transition-colors',
              !venue.isActive ? 'bg-slate-50/50 opacity-75' : ''
            ]"
          >
            <!-- 1. Mekan Adı -->
            <td class="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
              <div class="flex items-center gap-2.5">
                <div
                  :class="[
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                    venue.isActive
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : 'bg-slate-200 text-slate-400 dark:bg-slate-850 dark:text-slate-600'
                  ]"
                >
                  <Store class="w-3.5 h-3.5" />
                </div>
                <div>
                  <div class="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                    {{ venue.name }}
                  </div>
                  <div class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                    <span v-if="venue.totalPackageCount && venue.totalPackageCount > 0" class="text-emerald-600 dark:text-emerald-400 font-medium">
                      {{ venue.totalPackageCount }} paket kaydı mevcut
                    </span>
                    <span v-else-if="venue.hasRecords">
                      Geçmiş kayıtları mevcut
                    </span>
                    <span v-else class="text-slate-300 dark:text-slate-600">
                      Henüz teslimat yok
                    </span>
                  </div>
                </div>
              </div>
            </td>

            <!-- 2. İç Teslimat Fiyatı & Atılan Paket -->
            <td class="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200">
              <div class="flex flex-col items-end gap-1">
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs sm:text-sm font-bold font-mono">
                  {{ venue.indoorPrice.toFixed(2) }} ₺
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                  {{ venue.indoorPackageCount || 0 }} İç Paket
                </span>
              </div>
            </td>

            <!-- 3. Dış Teslimat Fiyatı & Atılan Paket -->
            <td class="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200">
              <div class="flex flex-col items-end gap-1">
                <span class="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 text-xs sm:text-sm font-bold font-mono">
                  {{ venue.outdoorPrice.toFixed(2) }} ₺
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                  {{ venue.outdoorPackageCount || 0 }} Dış Paket
                </span>
              </div>
            </td>

            <!-- 4. Toplam Atılan Paket Sayısı -->
            <td class="px-4 py-3.5 text-right">
              <div class="flex flex-col items-end gap-0.5">
                <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {{ venue.totalPackageCount || 0 }} Paket
                </span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  İç: {{ venue.indoorPackageCount || 0 }} · Dış: {{ venue.outdoorPackageCount || 0 }}
                </span>
              </div>
            </td>

            <!-- 5. Toplam Tutar / Hakediş -->
            <td class="px-4 py-3.5 text-right">
              <span class="inline-flex items-center px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-850 text-emerald-400 font-mono font-bold text-xs sm:text-sm border border-transparent dark:border-slate-800">
                {{ (venue.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </td>

            <!-- 6. Durum (Aktif/Pasif) -->
            <td class="px-4 py-3.5 text-center">
              <button
                type="button"
                :title="venue.isActive ? 'Pasife al' : 'Aktife al'"
                class="focus:outline-none"
                @click="toggleVenueStatus(venue)"
              >
                <BaseBadge
                  :variant="venue.isActive ? 'success' : 'neutral'"
                  dot
                >
                  {{ venue.isActive ? 'Aktif' : 'Pasif' }}
                </BaseBadge>
              </button>
            </td>

            <!-- 7. İşlemler -->
            <td class="px-4 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <!-- Günlük Döküm Butonu -->
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2 text-sky-700 hover:bg-sky-50 border-sky-200 dark:text-sky-300 dark:border-sky-900/60 dark:hover:bg-sky-950/40"
                  title="Günlük Paket Dökümünü ve Hesaplamalarını Gör"
                  @click="openHistoryModal(venue)"
                >
                  <template #leading>
                    <FileText class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  </template>
                  Günlük Döküm
                </BaseButton>

                <BaseButton
                  variant="outline"
                  size="sm"
                  class="!text-xs !py-1 !px-2.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40"
                  title="Günlük Paket Girişi Yap"
                  @click="openQuickDelivery(venue)"
                >
                  <template #leading>
                    <Plus class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </template>
                  Paket Gir
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Düzenle"
                  @click="openEditModal(venue)"
                >
                  <Edit2 class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
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
                  title="Sil"
                  @click="openDeleteConfirm(venue)"
                >
                  <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                </BaseButton>
              </div>
            </td>
          </tr>
        </template>

        <template #actions>
          <th class="px-4 py-3 font-semibold text-slate-700 text-right text-xs whitespace-nowrap">
            İşlemler
          </th>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-medium w-full">
            <span>Toplam <strong class="text-slate-900 font-bold">{{ filteredVenues.length }}</strong> mekan listelendi</span>
            <div class="flex items-center gap-3 text-xs">
              <span>Toplam Paket: <strong class="text-slate-900 font-mono font-bold">{{ totalPackagesAcrossVenues }} Adet</strong></span>
              <span class="text-slate-300">|</span>
              <span>Toplam Hakediş: <strong class="text-emerald-700 font-mono font-bold">{{ totalAmountAcrossVenues.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</strong></span>
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
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <BaseInput
                v-model="formData.indoorCount"
                label="İç Mekan Paket Sayısı (Adet)"
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
                label="Dış Mekan Paket Sayısı (Adet)"
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
      description="Seçilen mekana ait iç ve dış teslimat birim fiyatları üzerinden günlük paket adetlerini girin."
    >
      <form class="space-y-4" @submit.prevent="handleQuickDeliverySubmit">
        <div>
          <BaseInput
            v-model="quickDeliveryForm.date"
            label="Teslimat Tarihi"
            type="date"
            required
          />
        </div>

        <div class="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-emerald-950">İç Teslimat (Birim: {{ targetVenue?.indoorPrice.toFixed(2) }} ₺)</span>
            <span v-if="quickIndoorTotal > 0" class="font-mono font-bold text-emerald-800">
              {{ quickIndoorTotal.toFixed(2) }} ₺
            </span>
          </div>
          <BaseInput
            v-model="quickDeliveryForm.indoorCount"
            label="İç Mekan Paket Sayısı (Adet)"
            type="number"
            min="0"
            step="1"
            placeholder="Örn: 10"
          />
        </div>

        <div class="p-3 rounded-lg bg-sky-50/70 border border-sky-200/80 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-sky-950">Dış Teslimat (Birim: {{ targetVenue?.outdoorPrice.toFixed(2) }} ₺)</span>
            <span v-if="quickOutdoorTotal > 0" class="font-mono font-bold text-sky-800">
              {{ quickOutdoorTotal.toFixed(2) }} ₺
            </span>
          </div>
          <BaseInput
            v-model="quickDeliveryForm.outdoorCount"
            label="Dış Mekan Paket Sayısı (Adet)"
            type="number"
            min="0"
            step="1"
            placeholder="Örn: 5"
          />
        </div>

        <!-- Toplam Özeti -->
        <div class="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono text-xs">
          <div>
            <span class="text-slate-400 block text-[11px]">Toplam Atılan Paket:</span>
            <span class="font-bold text-white text-sm">
              {{ (Number(quickDeliveryForm.indoorCount) || 0) + (Number(quickDeliveryForm.outdoorCount) || 0) }} Adet
            </span>
          </div>
          <div class="text-right">
            <span class="text-slate-400 block text-[11px]">Toplam Hakediş:</span>
            <span class="font-bold text-emerald-400 text-base">
              {{ quickGrandTotal.toFixed(2) }} ₺
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
            Paket Kaydını Ekle
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 3. MEKAN GÜNLÜK PAKET DÖKÜMÜ & HESAPLAMA MODAL -->
    <BaseModal
      v-model="isHistoryModalOpen"
      :title="`Günlük Paket Dökümü — ${historyVenue?.name || 'Mekan'}`"
      description="Seçilen mekana ait gün gün atılan iç ve dış mekan paket adetleri ve birim fiyat üzerinden hakediş dökümü."
    >
      <div class="space-y-4">
        <!-- Mekan Fiyat Bilgi Kartı -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span class="text-slate-500 block text-[10px]">Mekan:</span>
            <span class="font-bold text-slate-900 text-sm">{{ historyVenue?.name }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div>
              <span class="text-slate-500 block text-[10px]">İç Birim Fiyatı:</span>
              <span class="font-mono font-bold text-emerald-700">{{ historyVenue?.indoorPrice.toFixed(2) }} ₺</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">Dış Birim Fiyatı:</span>
              <span class="font-mono font-bold text-sky-700">{{ historyVenue?.outdoorPrice.toFixed(2) }} ₺</span>
            </div>
          </div>
        </div>

        <!-- Günlük Döküm Tablosu -->
        <div v-if="historyVenue?.dailyBreakdown && historyVenue.dailyBreakdown.length > 0" class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th class="px-3 py-2.5">Tarih</th>
                <th class="px-3 py-2.5 text-right text-emerald-800">İç Mekan</th>
                <th class="px-3 py-2.5 text-right text-sky-800">Dış Mekan</th>
                <th class="px-3 py-2.5 text-right">Toplam Paket</th>
                <th class="px-3 py-2.5 text-right text-slate-900">Toplam Tutar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="day in historyVenue.dailyBreakdown"
                :key="day.date"
                class="hover:bg-slate-50/80 transition-colors font-mono"
              >
                <td class="px-3 py-2.5 font-sans font-semibold text-slate-900">
                  {{ day.date }}
                </td>
                <td class="px-3 py-2.5 text-right text-emerald-700">
                  <span>{{ day.indoorCount }} Paket</span>
                  <span class="text-[10px] text-slate-400 block font-sans">({{ day.indoorAmount.toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right text-sky-700">
                  <span>{{ day.outdoorCount }} Paket</span>
                  <span class="text-[10px] text-slate-400 block font-sans">({{ day.outdoorAmount.toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right font-bold text-slate-900">
                  {{ day.totalCount }} Adet
                </td>
                <td class="px-3 py-2.5 text-right font-bold text-emerald-700">
                  {{ day.totalAmount.toFixed(2) }} ₺
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-900 text-white font-mono text-xs">
              <tr>
                <td class="px-3 py-2.5 font-bold font-sans">GENEL TOPLAM</td>
                <td class="px-3 py-2.5 text-right text-emerald-400 font-bold">
                  {{ historyVenue.indoorPackageCount || 0 }} Paket
                  <span class="text-[10px] text-slate-400 block font-sans">({{ (historyVenue.indoorAmount || 0).toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right text-sky-400 font-bold">
                  {{ historyVenue.outdoorPackageCount || 0 }} Paket
                  <span class="text-[10px] text-slate-400 block font-sans">({{ (historyVenue.outdoorAmount || 0).toFixed(2) }} ₺)</span>
                </td>
                <td class="px-3 py-2.5 text-right font-extrabold text-white">
                  {{ historyVenue.totalPackageCount || 0 }} Adet
                </td>
                <td class="px-3 py-2.5 text-right font-extrabold text-emerald-400 text-sm">
                  {{ (historyVenue.totalAmount || 0).toFixed(2) }} ₺
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-else class="text-center py-6 text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
          Bu mekana ait henüz günlük paket teslimat kaydı bulunmuyor.
        </div>

        <div class="pt-2 flex items-center justify-between">
          <BaseButton
            variant="outline"
            size="sm"
            @click="isHistoryModalOpen = false"
          >
            Kapat
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
  </div>
</template>


