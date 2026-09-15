<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  Bike,
  Phone,
  Calendar,
  Edit2,
  Package,
  Store,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  TrendingDown,
  Info
} from 'lucide-vue-next'
import { useCouriers, type CourierFormData, type CourierPriceFormData, type CourierVenuePriceItem } from '~/composables/useCouriers'
import { useVenues, type VenueItem } from '~/composables/useVenues'

const route = useRoute()
const courierId = computed(() => route.params.id as string)

const {
  currentCourier,
  courierPrices,
  loading: courierLoading,
  fetchCourierById,
  fetchCourierPrices,
  addCourierPrice,
  updateCourierPrice,
  deleteCourierPrice,
  updateCourier,
  toggleCourierStatus
} = useCouriers()

const {
  venues,
  fetchVenues
} = useVenues()

// Courier edit modal state
const isEditModalOpen = ref(false)
const formData = ref<CourierFormData>({
  name: '',
  phone: '',
  isActive: true
})
const formErrors = ref<Record<string, string>>({})

// Custom price modals state
const isPriceModalOpen = ref(false)
const isEditingPrice = ref(false)
const selectedPriceId = ref<string | null>(null)
const priceFormData = ref<CourierPriceFormData>({
  venueId: '',
  indoorPrice: '',
  outdoorPrice: ''
})
const priceFormErrors = ref<Record<string, string>>({})

// Price delete confirmation state
const isDeletePriceConfirmOpen = ref(false)
const priceToDelete = ref<CourierVenuePriceItem | null>(null)

useHead({
  title: computed(() => currentCourier.value ? `${currentCourier.value.name} — Kurye & Özel Fiyatlar` : 'Kurye Detayı')
})

// Available active venues that don't have custom price yet for this courier
const availableVenues = computed(() => {
  const existingVenueIds = new Set(courierPrices.value.map(p => p.venueId))
  return venues.value.filter(v => v.isActive && !existingVenueIds.has(v.id))
})

// Selected venue reference in add modal
const selectedVenueDetail = computed(() => {
  if (!priceFormData.value.venueId) return null
  return venues.value.find(v => v.id === priceFormData.value.venueId) || null
})

const onVenueSelected = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const venue = venues.value.find(v => v.id === target.value)
  if (venue) {
    // Prefill with venue default prices as a base guide
    if (priceFormData.value.indoorPrice === '') {
      priceFormData.value.indoorPrice = venue.indoorPrice
    }
    if (priceFormData.value.outdoorPrice === '') {
      priceFormData.value.outdoorPrice = venue.outdoorPrice
    }
  }
}

const openEditCourierModal = () => {
  if (!currentCourier.value) return
  formData.value = {
    name: currentCourier.value.name,
    phone: currentCourier.value.phone || '',
    isActive: currentCourier.value.isActive
  }
  formErrors.value = {}
  isEditModalOpen.value = true
}

const handleCourierSubmit = async () => {
  if (!formData.value.name.trim()) {
    formErrors.value = { name: 'Kurye adı zorunludur.' }
    return
  }

  const success = await updateCourier(courierId.value, formData.value)
  if (success) {
    isEditModalOpen.value = false
    await fetchCourierById(courierId.value)
  }
}

const openAddPriceModal = () => {
  isEditingPrice.value = false
  selectedPriceId.value = null
  priceFormData.value = {
    venueId: availableVenues.value.length > 0 ? availableVenues.value[0].id : '',
    indoorPrice: availableVenues.value.length > 0 ? availableVenues.value[0].indoorPrice : '',
    outdoorPrice: availableVenues.value.length > 0 ? availableVenues.value[0].outdoorPrice : ''
  }
  priceFormErrors.value = {}
  isPriceModalOpen.value = true
}

const openEditPriceModal = (priceItem: CourierVenuePriceItem) => {
  isEditingPrice.value = true
  selectedPriceId.value = priceItem.id
  priceFormData.value = {
    venueId: priceItem.venueId,
    indoorPrice: priceItem.indoorPrice,
    outdoorPrice: priceItem.outdoorPrice
  }
  priceFormErrors.value = {}
  isPriceModalOpen.value = true
}

const openDeletePriceConfirm = (priceItem: CourierVenuePriceItem) => {
  priceToDelete.value = priceItem
  isDeletePriceConfirmOpen.value = true
}

const handleConfirmDeletePrice = async () => {
  if (priceToDelete.value) {
    await deleteCourierPrice(courierId.value, priceToDelete.value.id)
    isDeletePriceConfirmOpen.value = false
    priceToDelete.value = null
  }
}

const validatePriceForm = () => {
  const errors: Record<string, string> = {}
  if (!priceFormData.value.venueId) {
    errors.venueId = 'Mekan seçimi zorunludur.'
  }
  const indoor = Number(priceFormData.value.indoorPrice)
  if (priceFormData.value.indoorPrice === '' || isNaN(indoor) || indoor < 0) {
    errors.indoorPrice = 'Geçerli bir iç teslimat fiyatı (>= 0) giriniz.'
  }
  const outdoor = Number(priceFormData.value.outdoorPrice)
  if (priceFormData.value.outdoorPrice === '' || isNaN(outdoor) || outdoor < 0) {
    errors.outdoorPrice = 'Geçerli bir dış teslimat fiyatı (>= 0) giriniz.'
  }
  priceFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handlePriceSubmit = async () => {
  if (!validatePriceForm()) return

  if (isEditingPrice.value && selectedPriceId.value) {
    const success = await updateCourierPrice(courierId.value, selectedPriceId.value, {
      indoorPrice: priceFormData.value.indoorPrice,
      outdoorPrice: priceFormData.value.outdoorPrice
    })
    if (success) isPriceModalOpen.value = false
  } else {
    const success = await addCourierPrice(courierId.value, priceFormData.value)
    if (success) isPriceModalOpen.value = false
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

onMounted(async () => {
  if (courierId.value) {
    await Promise.all([
      fetchCourierById(courierId.value),
      fetchCourierPrices(courierId.value),
      fetchVenues()
    ])
  }
})
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Back Button & Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/couriers"
          class="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <ArrowLeft class="w-4 h-4" />
        </NuxtLink>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Kurye Detayı & Özel Fiyatlar
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kurye bilgileri ve mekan bazlı özel hakediş fiyat tanımları.
          </p>
        </div>
      </div>

      <div v-if="currentCourier" class="flex items-center gap-2.5">
        <BaseButton
          variant="outline"
          size="sm"
          @click="toggleCourierStatus(currentCourier)"
        >
          {{ currentCourier.isActive ? 'Pasife Al' : 'Aktife Al' }}
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          @click="openEditCourierModal"
        >
          <template #leading>
            <Edit2 class="w-3.5 h-3.5" />
          </template>
          Bilgileri Düzenle
        </BaseButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="courierLoading && !currentCourier" class="py-12">
      <BaseLoading message="Kurye ve fiyat bilgileri yükleniyor..." />
    </div>

    <!-- Not Found State -->
    <div v-else-if="!currentCourier">
      <BaseEmptyState
        title="Kurye bulunamadı"
        description="Görüntülemek istediğiniz kurye sistemde mevcut değil veya silinmiş olabilir."
        action-text="Kurye Listesine Dön"
        @action="navigateTo('/couriers')"
      />
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Profile & Basic Info Card -->
      <BaseCard>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bike class="w-7 h-7 text-emerald-400 dark:text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {{ currentCourier.name }}
                </h2>
                <BaseBadge :variant="currentCourier.isActive ? 'success' : 'neutral'" dot>
                  {{ currentCourier.isActive ? 'Aktif Kurye' : 'Pasif Kurye' }}
                </BaseBadge>
              </div>
              <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                <div class="flex items-center gap-1.5">
                  <Phone class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{{ currentCourier.phone || 'Telefon belirtilmedi' }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Calendar class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Kayıt: {{ formatDate(currentCourier.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Section: Mekan Özel Fiyatlandırması (CourierVenuePrice) -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Tag class="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Mekan Bazlı Özel Fiyatlar
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bu kuryeye özel tanımlanan iç ve dış teslimat hakediş birim fiyatları.
            </p>
          </div>

          <BaseButton
            variant="primary"
            size="sm"
            :disabled="!currentCourier.isActive"
            @click="openAddPriceModal"
          >
            <template #leading>
              <Plus class="w-3.5 h-3.5" />
            </template>
            Özel Fiyat Ekle
          </BaseButton>
        </div>

        <!-- Price Rules Explanatory Banner -->
        <div class="flex items-start gap-3 p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 text-xs leading-relaxed">
          <Info class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span class="font-semibold">Fiyatlandırma Mantığı:</span> Bir kurye için bir mekanda özel fiyat tanımlanmışsa, paket girişlerinde kuryenin özel fiyatı uygulanır. Özel fiyat tanımlanmamış mekanlarda ise mekanın standart fiyatı otomatik geçerli olur.
          </div>
        </div>

        <!-- Prices Table / Empty State -->
        <div v-if="courierPrices.length === 0">
          <BaseEmptyState
            title="Özel mekan fiyatı bulunmuyor"
            description="Bu kurye için henüz mekana özel fiyat tanımlanmadı. Tanımlanmayan mekanlarda kurye için mekanın standart liste fiyatı geçerli olacaktır."
            action-text="İlk Özel Fiyatı Ekle"
            @action="openAddPriceModal"
          >
            <template #icon>
              <Store class="w-6 h-6 stroke-[1.5]" />
            </template>
          </BaseEmptyState>
        </div>

        <div v-else class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead class="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Mekan</th>
                  <th class="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Mekan Standart (İç / Dış)</th>
                  <th class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 text-right">Kurye Özel İç Fiyat</th>
                  <th class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 text-right">Kurye Özel Dış Fiyat</th>
                  <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                <tr
                  v-for="priceItem in courierPrices"
                  :key="priceItem.id"
                  class="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors"
                >
                  <!-- Mekan Adı -->
                  <td class="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                    <div class="flex items-center gap-2">
                      <Store class="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{{ priceItem.venue.name }}</span>
                    </div>
                  </td>

                  <!-- Mekan Standart Liste Fiyatı Referansı -->
                  <td class="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {{ priceItem.venue.indoorPrice.toFixed(2) }} ₺ / {{ priceItem.venue.outdoorPrice.toFixed(2) }} ₺
                  </td>

                  <!-- Kurye Özel İç Fiyat -->
                  <td class="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                    <span class="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-mono">
                      {{ priceItem.indoorPrice.toFixed(2) }} ₺
                    </span>
                  </td>

                  <!-- Kurye Özel Dış Fiyat -->
                  <td class="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                    <span class="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 font-mono">
                      {{ priceItem.outdoorPrice.toFixed(2) }} ₺
                    </span>
                  </td>

                  <!-- İşlemler -->
                  <td class="px-4 py-3.5 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <BaseButton
                        variant="ghost"
                        size="sm"
                        title="Fiyatı Düzenle"
                        @click="openEditPriceModal(priceItem)"
                      >
                        <Edit2 class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      </BaseButton>

                      <BaseButton
                        variant="ghost"
                        size="sm"
                        title="Özel Fiyatı Kaldır"
                        @click="openDeletePriceConfirm(priceItem)"
                      >
                        <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      </BaseButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Toplam {{ courierPrices.length }} mekana özel fiyat tanımlı
          </div>
        </div>
      </div>
    </div>

    <!-- Kurye Temel Bilgi Düzenleme Modal -->
    <BaseModal
      v-model="isEditModalOpen"
      title="Kurye Bilgilerini Düzenle"
      description="Kurye ad, telefon ve aktiflik durumunu güncelleyin."
    >
      <form class="space-y-4" @submit.prevent="handleCourierSubmit">
        <BaseInput
          v-model="formData.name"
          label="Ad Soyad"
          placeholder="Örn: Ahmet Yılmaz"
          :error="formErrors.name"
          required
        />

        <BaseInput
          v-model="formData.phone"
          label="Telefon Numarası"
          placeholder="05XX XXX XX XX"
        >
          <template #leading>
            <Phone class="w-4 h-4 text-slate-400" />
          </template>
        </BaseInput>

        <div class="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div class="text-xs font-semibold text-slate-900">
              Kurye Durumu
            </div>
            <div class="text-[11px] text-slate-500">
              Aktif kuryeler paket dağıtım işlemlerine dahil edilir.
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
            @click="isEditModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
          >
            Güncelle
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Özel Mekan Fiyatı Ekleme / Düzenleme Modal -->
    <BaseModal
      v-model="isPriceModalOpen"
      :title="isEditingPrice ? 'Özel Mekan Fiyatını Düzenle' : 'Kuryeye Özel Mekan Fiyatı Ekle'"
      :description="isEditingPrice ? 'Kuryenin bu mekan için alacağı iç ve dış teslimat birim fiyatlarını güncelleyin.' : 'Mekan seçerek bu kuryeye özel iç ve dış teslimat birim hakediş fiyatlarını tanımlayın.'"
    >
      <form class="space-y-4" @submit.prevent="handlePriceSubmit">
        <!-- Mekan Seçimi (Sadece ekleme anında) -->
        <div v-if="!isEditingPrice">
          <BaseSelect
            v-model="priceFormData.venueId"
            label="Mekan Seçiniz"
            :options="availableVenues.map(v => ({
              value: v.id,
              label: `${v.name} (Standart İç: ${v.indoorPrice.toFixed(2)} ₺, Dış: ${v.outdoorPrice.toFixed(2)} ₺)`
            }))"
            :error="priceFormErrors.venueId"
            placeholder="Mekan seçin..."
            required
            @change="onVenueSelected"
          />
          <p v-if="availableVenues.length === 0" class="text-xs text-amber-600 mt-1 font-medium">
            Tüm aktif mekanlar için özel fiyat tanımlanmış.
          </p>
        </div>

        <!-- Düzenleme Anında Mekan Bilgisi -->
        <div v-else class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div class="text-xs font-semibold text-slate-700">Mekan</div>
          <div class="text-sm font-bold text-slate-900 mt-0.5">
            {{ courierPrices.find(p => p.id === selectedPriceId)?.venue.name }}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">
            Standart Liste Fiyatı: İç {{ courierPrices.find(p => p.id === selectedPriceId)?.venue.indoorPrice.toFixed(2) }} ₺ / Dış {{ courierPrices.find(p => p.id === selectedPriceId)?.venue.outdoorPrice.toFixed(2) }} ₺
          </div>
        </div>

        <!-- İç & Dış Fiyat Girişi -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseInput
            v-model="priceFormData.indoorPrice"
            label="Kurye İç Teslimat Fiyatı (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="30.00"
            :error="priceFormErrors.indoorPrice"
            hint="Kuryeye ödenecek iç paket birim tutarı"
            required
          />

          <BaseInput
            v-model="priceFormData.outdoorPrice"
            label="Kurye Dış Teslimat Fiyatı (₺)"
            type="number"
            step="0.01"
            min="0"
            placeholder="32.00"
            :error="priceFormErrors.outdoorPrice"
            hint="Kuryeye ödenecek dış paket birim tutarı"
            required
          />
        </div>

        <div class="pt-3 flex justify-end gap-2.5">
          <BaseButton
            variant="outline"
            size="sm"
            type="button"
            @click="isPriceModalOpen = false"
          >
            Vazgeç
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            type="submit"
          >
            {{ isEditingPrice ? 'Fiyatı Güncelle' : 'Fiyatı Kaydet' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- Fiyat Silme Onay Modal -->
    <BaseConfirmDialog
      v-model="isDeletePriceConfirmOpen"
      title="Özel Fiyatı Kaldır"
      :message="priceToDelete ? `&quot;${priceToDelete.venue?.name || 'Mekan'}&quot; mekanına ait kurye özel fiyatını kaldırmak istediğinize emin misiniz? Kaldırıldığında kurye için mekanın standart liste fiyatı geçerli olacaktır.` : 'Özel fiyatı kaldırmak istediğinize emin misiniz?'"
      confirm-text="Özel Fiyatı Kaldır"
      variant="danger"
      @confirm="handleConfirmDeletePrice"
    />
  </div>
</template>
