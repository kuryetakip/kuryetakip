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
  TrendingUp
} from 'lucide-vue-next'
import { useVenues, type VenueItem, type VenueFormData } from '~/composables/useVenues'

useHead({
  title: 'Mekan Yönetimi — Kurye & Hakediş Takip'
})

const {
  venues,
  loading,
  searchQuery,
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

// Form state
const formData = ref<VenueFormData>({
  name: '',
  indoorPrice: '',
  outdoorPrice: '',
  isActive: true
})
const formErrors = ref<Record<string, string>>({})

const columns = [
  { key: 'name', label: 'Mekan Adı' },
  { key: 'indoorPrice', label: 'İç Teslimat Fiyatı', align: 'right' as const },
  { key: 'outdoorPrice', label: 'Dış Teslimat Fiyatı', align: 'right' as const },
  { key: 'isActive', label: 'Durum', align: 'center' as const }
]

// Filtered venues based on local search
const filteredVenues = computed(() => {
  if (!searchQuery.value.trim()) return venues.value
  const q = searchQuery.value.toLowerCase().trim()
  return venues.value.filter(v => v.name.toLowerCase().includes(q))
})

const openAddModal = () => {
  isEditing.value = false
  currentVenueId.value = null
  formData.value = {
    name: '',
    indoorPrice: '',
    outdoorPrice: '',
    isActive: true
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
    isActive: venue.isActive
  }
  formErrors.value = {}
  isModalOpen.value = true
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

onMounted(() => {
  fetchVenues()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          Mekanlar
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Mekanların iç ve dış teslimat paket fiyatlarını yönetin.
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

    <!-- Search & Filter Bar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <BaseInput
          v-model="searchQuery"
          placeholder="Mekan adına göre ara... (Örn: Terra Pizza)"
        >
          <template #leading>
            <Search class="w-4 h-4 text-slate-400" />
          </template>
        </BaseInput>
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
            <!-- Mekan Adı -->
            <td class="px-4 py-3.5 font-medium text-slate-900">
              <div class="flex items-center gap-2.5">
                <div
                  :class="[
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                    venue.isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-400'
                  ]"
                >
                  <Store class="w-3.5 h-3.5" />
                </div>
                <div>
                  <div class="font-semibold text-slate-900 text-xs sm:text-sm">
                    {{ venue.name }}
                  </div>
                  <div v-if="venue.hasRecords" class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>Geçmiş kayıtları mevcut</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- İç Teslimat Fiyatı -->
            <td class="px-4 py-3.5 text-right font-semibold text-slate-800">
              <span class="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs sm:text-sm">
                {{ venue.indoorPrice.toFixed(2) }} ₺
              </span>
            </td>

            <!-- Dış Teslimat Fiyatı -->
            <td class="px-4 py-3.5 text-right font-semibold text-slate-800">
              <span class="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs sm:text-sm">
                {{ venue.outdoorPrice.toFixed(2) }} ₺
              </span>
            </td>

            <!-- Durum (Aktif/Pasif) -->
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

            <!-- İşlemler -->
            <td class="px-4 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Düzenle"
                  @click="openEditModal(venue)"
                >
                  <Edit2 class="w-3.5 h-3.5 text-slate-600" />
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
                      venue.isActive ? 'text-amber-600' : 'text-emerald-600'
                    ]"
                  />
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Sil"
                  @click="openDeleteConfirm(venue)"
                >
                  <Trash2 class="w-3.5 h-3.5 text-rose-600" />
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
          <div class="text-xs text-slate-500 font-medium">
            Toplam {{ filteredVenues.length }} mekan listelendi
          </div>
        </template>
      </BaseTable>
    </div>

    <!-- Mekan Ekleme / Düzenleme Modal -->
    <BaseModal
      v-model="isModalOpen"
      :title="isEditing ? 'Mekanı Düzenle' : 'Yeni Mekan Ekle'"
      :description="isEditing ? 'Mekan bilgilerini ve varsayılan birim fiyatlarını güncelleyin.' : 'Mekan adı ve varsayılan iç/dış teslimat paket fiyatlarını belirleyin.'"
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

    <!-- Silme Onay Modal -->
    <BaseConfirmDialog
      v-model="isConfirmDeleteOpen"
      title="Mekanı Sil"
      :message="`&quot;${venueToDelete?.name}&quot; mekanını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
