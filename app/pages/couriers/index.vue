<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
  Store
} from 'lucide-vue-next'
import { useCouriers, type CourierItem, type CourierFormData } from '~/composables/useCouriers'

useHead({
  title: 'Kuryeler — Kurye & Hakediş Takip'
})

const {
  couriers,
  loading,
  searchQuery,
  fetchCouriers,
  createCourier,
  updateCourier,
  toggleCourierStatus,
  deleteCourier
} = useCouriers()

// Modal states
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentCourierId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const courierToDelete = ref<CourierItem | null>(null)

// Form state
const formData = ref<CourierFormData>({
  name: '',
  phone: '',
  isActive: true
})
const formErrors = ref<Record<string, string>>({})

const columns = [
  { key: 'name', label: 'Ad Soyad' },
  { key: 'phone', label: 'Telefon' },
  { key: 'isActive', label: 'Durum', align: 'center' as const }
]

// Filtered couriers based on local search
const filteredCouriers = computed(() => {
  if (!searchQuery.value.trim()) return couriers.value
  const q = searchQuery.value.toLowerCase().trim()
  return couriers.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone && c.phone.toLowerCase().includes(q))
  )
})

const openAddModal = () => {
  isEditing.value = false
  currentCourierId.value = null
  formData.value = {
    name: '',
    phone: '',
    isActive: true
  }
  formErrors.value = {}
  isModalOpen.value = true
}

const openEditModal = (courier: CourierItem) => {
  isEditing.value = true
  currentCourierId.value = courier.id
  formData.value = {
    name: courier.name,
    phone: courier.phone || '',
    isActive: courier.isActive
  }
  formErrors.value = {}
  isModalOpen.value = true
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
    if (success) isModalOpen.value = false
  } else {
    const success = await createCourier(formData.value)
    if (success) isModalOpen.value = false
  }
}

onMounted(() => {
  fetchCouriers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          Kuryeler
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Kuryeleri ve operasyonel aktiflik durumlarını yönetin.
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
        <BaseButton variant="primary" size="md" @click="openAddModal">
          <template #leading>
            <Plus class="w-4 h-4" />
          </template>
          Kurye Ekle
        </BaseButton>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <BaseInput
          v-model="searchQuery"
          placeholder="Kurye adına veya telefona göre ara... (Örn: Ahmet Yılmaz)"
        >
          <template #leading>
            <Search class="w-4 h-4 text-slate-400" />
          </template>
        </BaseInput>
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
              'hover:bg-slate-50/80 transition-colors',
              !courier.isActive ? 'bg-slate-50/50 opacity-75' : ''
            ]"
          >
            <!-- Ad Soyad -->
            <td class="px-4 py-3.5 font-medium text-slate-900">
              <div class="flex items-center gap-2.5">
                <div
                  :class="[
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                    courier.isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
                  ]"
                >
                  <Bike class="w-3.5 h-3.5" />
                </div>
                <div>
                  <NuxtLink
                    :to="`/couriers/${courier.id}`"
                    class="font-semibold text-slate-900 hover:text-slate-700 hover:underline text-xs sm:text-sm block"
                  >
                    {{ courier.name }}
                  </NuxtLink>
                  <div v-if="courier.hasRecords" class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>{{ courier.deliveryCount || 0 }} paket kaydı</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Telefon -->
            <td class="px-4 py-3.5 text-slate-600 text-xs sm:text-sm">
              <div v-if="courier.phone" class="flex items-center gap-1.5 font-mono">
                <Phone class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ courier.phone }}</span>
              </div>
              <span v-else class="text-slate-400 italic text-xs">Belirtilmedi</span>
            </td>

            <!-- Durum (Aktif/Pasif) -->
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

            <!-- İşlemler -->
            <td class="px-4 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <NuxtLink
                  :to="`/couriers/${courier.id}`"
                  class="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Detay Görüntüle"
                >
                  <Eye class="w-3.5 h-3.5" />
                </NuxtLink>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Düzenle"
                  @click="openEditModal(courier)"
                >
                  <Edit2 class="w-3.5 h-3.5 text-slate-600" />
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
                      courier.isActive ? 'text-amber-600' : 'text-emerald-600'
                    ]"
                  />
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="Sil"
                  @click="openDeleteConfirm(courier)"
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
            Toplam {{ filteredCouriers.length }} kurye listelendi
          </div>
        </template>
      </BaseTable>
    </div>

    <!-- Kurye Ekleme / Düzenleme Modal -->
    <BaseModal
      v-model="isModalOpen"
      :title="isEditing ? 'Kurye Bilgilerini Düzenle' : 'Yeni Kurye Ekle'"
      :description="isEditing ? 'Kurye iletişim ve durum bilgilerini güncelleyin.' : 'Kurye adı ve iletişim numarasını sisteme kaydedin.'"
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
          label="Telefon Numarası (Opsiyonel)"
          placeholder="05XX XXX XX XX"
          :error="formErrors.phone"
        >
          <template #leading>
            <Phone class="w-4 h-4 text-slate-400" />
          </template>
        </BaseInput>

        <!-- Aktif / Pasif Seçimi -->
        <div class="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div class="text-xs font-semibold text-slate-900">
              Kurye Durumu
            </div>
            <div class="text-[11px] text-slate-500">
              Pasif kuryeler yeni paket kayıtlarında seçilemez, geçmiş verileri korunur.
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
      title="Kuryeyi Sil"
      :message="`&quot;${courierToDelete?.name}&quot; kuryesini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`"
      confirm-text="Kalıcı Olarak Sil"
      variant="danger"
      :loading="loading"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
