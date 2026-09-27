<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X,
  Plus,
  Clock,
  Calendar,
  Wallet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Archive
} from 'lucide-vue-next'
import { useCouriers, type CourierItem } from '~/composables/useCouriers'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  isOpen: boolean
  courier: CourierItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void
}>()

const { fetchCourierAdvances, createCourierAdvance, deleteCourierAdvance } = useCouriers()
const toast = useToast()

const loading = ref(false)
const submitting = ref(false)
const deletingId = ref<string | null>(null)
const advanceData = ref<{
  courier: any
  totalAmount: number
  activeAmount: number
  closedAmount: number
  count: number
  advances: any[]
} | null>(null)

// New advance form state
const formAmount = ref('')
const formDate = ref(new Date().toISOString().substring(0, 10))
const formTime = ref('')
const formDescription = ref('')
const formError = ref('')
const recentlyAddedBadge = ref<string | null>(null)

// Status filter for history tab
const filterStatus = ref<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL')

const filteredAdvances = computed(() => {
  if (!advanceData.value?.advances) return []
  if (filterStatus.value === 'ALL') return advanceData.value.advances
  return advanceData.value.advances.filter(a => a.status === filterStatus.value)
})

const quickAmounts = [100, 250, 500, 1000, 2000]

const setQuickAmount = (val: number) => {
  formAmount.value = String(val)
}

const loadHistory = async () => {
  if (!props.courier) return
  loading.value = true
  try {
    const data = await fetchCourierAdvances(props.courier.id)
    if (data) {
      advanceData.value = data
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.courier) {
    // Set default current time
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    formTime.value = `${hh}:${mm}`
    formDate.value = now.toISOString().substring(0, 10)
    formAmount.value = ''
    formDescription.value = ''
    formError.value = ''
    recentlyAddedBadge.value = null
    loadHistory()
  }
})

const handleAddAdvance = async () => {
  formError.value = ''
  if (!props.courier) return

  const cleanStr = String(formAmount.value).trim().replace(',', '.')
  const num = parseFloat(cleanStr)

  if (isNaN(num) || num <= 0) {
    formError.value = 'Lütfen 0\'dan büyük geçerli bir tutar giriniz.'
    return
  }

  submitting.value = true
  try {
    const created = await createCourierAdvance(props.courier.id, {
      amount: num,
      date: formDate.value,
      time: formTime.value || undefined,
      description: formDescription.value.trim() || undefined
    })

    if (created) {
      recentlyAddedBadge.value = `+${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
      formAmount.value = ''
      formDescription.value = ''
      await loadHistory()
      emit('updated')

      setTimeout(() => {
        recentlyAddedBadge.value = null
      }, 4000)
    }
  } finally {
    submitting.value = false
  }
}

const handleDeleteAdvance = async (advance: any) => {
  if (!props.courier) return
  if (!confirm(`${advance.dateFormatted} tarihli ${advance.formattedAmount} ₺ avans kaydını silmek istediğinize emin misiniz?`)) {
    return
  }

  deletingId.value = advance.id
  try {
    const success = await deleteCourierAdvance(props.courier.id, advance.id)
    if (success) {
      await loadHistory()
      emit('updated')
    }
  } finally {
    deletingId.value = null
  }
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen && courier"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    @click.self="closeModal"
  >
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <Wallet class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {{ courier.name }}
              </h3>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="courier.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'">
                {{ courier.isActive ? 'Aktif' : 'Pasif' }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Avans İşlem Kaydı & Geçmiş Dökümü
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="closeModal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Financial KPI Cards -->
      <div class="grid grid-cols-3 gap-2 sm:gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-center">
        <div class="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 shadow-2xs">
          <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Toplam Hakediş</span>
          <span class="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ (courier.cumulativeTotalAmount ?? courier.totalEarnings ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
          <span class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block mb-1">Aktif Avans</span>
          <span class="font-mono text-xs sm:text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
            {{ (advanceData?.activeAmount ?? courier.paidAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 shadow-2xs">
          <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Kalan Hakediş</span>
          <span
            class="font-mono text-xs sm:text-sm font-extrabold"
            :class="(courier.remainingBalance ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'"
          >
            {{ (courier.remainingBalance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </span>
        </div>
      </div>

      <!-- Body Content -->
      <div class="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
        <!-- New Advance Entry Section -->
        <div class="bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-850 dark:to-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-750 shadow-xs relative">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Plus class="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-bold" />
              <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Yeni Avans Kaydı Ekle
              </h4>
            </div>

            <!-- Visual Feedback Badge -->
            <transition name="fade">
              <span
                v-if="recentlyAddedBadge"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs animate-bounce"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                {{ recentlyAddedBadge }} Avans Kaydedildi
              </span>
            </transition>
          </div>

          <form @submit.prevent="handleAddAdvance" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <!-- Tutar Input -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Avans Tutarı (₺) *
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
                    ₺
                  </span>
                  <input
                    v-model="formAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="500.00"
                    required
                    class="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <!-- Tarih Input -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  İşlem Tarihi
                </label>
                <input
                  v-model="formDate"
                  type="date"
                  required
                  class="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <!-- Saat Input -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  İşlem Saati
                </label>
                <input
                  v-model="formTime"
                  type="time"
                  class="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Quick Amount Chips -->
            <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1">Hızlı:</span>
              <button
                v-for="amt in quickAmounts"
                :key="amt"
                type="button"
                class="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                @click="setQuickAmount(amt)"
              >
                +{{ amt }} ₺
              </button>
            </div>

            <!-- Description / Note -->
            <div>
              <input
                v-model="formDescription"
                type="text"
                placeholder="Açıklama / Not (opsiyonel: elden nakit, IBAN vb.)"
                maxlength="250"
                class="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <!-- Error message -->
            <p v-if="formError" class="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {{ formError }}
            </p>

            <!-- Submit Button -->
            <div class="flex justify-end pt-1">
              <button
                type="submit"
                :disabled="submitting || !formAmount"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xs active:scale-95"
              >
                <Plus v-if="!submitting" class="w-4 h-4" />
                <span v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ submitting ? 'Kaydediliyor...' : 'Avansı Kaydet' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Advance History Table Header & Filters -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-slate-500" />
              <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Avans Geçmişi & İşlemler ({{ filteredAdvances.length }})
              </h4>
            </div>

            <!-- Filter tabs -->
            <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="filterStatus === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'"
                @click="filterStatus = 'ALL'"
              >
                Tümü
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="filterStatus === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'"
                @click="filterStatus = 'ACTIVE'"
              >
                Aktif
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="filterStatus === 'CLOSED' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'"
                @click="filterStatus = 'CLOSED'"
              >
                Kapatılmış
              </button>
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="py-8 text-center">
            <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-xs text-slate-400">Avans geçmişi yükleniyor...</p>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredAdvances.length === 0"
            class="py-8 text-center bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"
          >
            <Wallet class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p class="text-xs font-semibold text-slate-600 dark:text-slate-400">Henüz kayıtlı bir avans işlemi bulunmuyor.</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Yukarıdaki form üzerinden kuryeye ilk avansı kaydedebilirsiniz.</p>
          </div>

          <!-- Transaction List -->
          <div v-else class="space-y-2">
            <div
              v-for="adv in filteredAdvances"
              :key="adv.id"
              class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
            >
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUpRight class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {{ adv.dateFormatted }}
                    </span>
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {{ adv.time }}
                    </span>
                    <span
                      class="text-[10px] px-1.5 py-0.2 rounded font-medium"
                      :class="adv.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'"
                    >
                      {{ adv.status === 'ACTIVE' ? 'Aktif' : 'Dönem Kapatıldı' }}
                    </span>
                  </div>
                  <p v-if="adv.description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {{ adv.description }}
                  </p>
                  <p v-if="adv.week" class="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Dönem: {{ adv.week }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="font-mono text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 block">
                    {{ adv.formattedAmount }} ₺
                  </span>
                </div>

                <!-- Delete button (only active advances) -->
                <button
                  type="button"
                  :disabled="deletingId === adv.id"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Avans kaydını sil"
                  @click="handleDeleteAdvance(adv)"
                >
                  <span v-if="deletingId === adv.id" class="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block"></span>
                  <Trash2 v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
        <div>
          Toplam İşlem: <strong class="text-slate-800 dark:text-slate-200 font-mono">{{ advanceData?.count || 0 }}</strong> adet
        </div>
        <button
          type="button"
          class="px-4 py-2 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          @click="closeModal"
        >
          Kapat
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
