<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X,
  Calendar,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Wallet,
  ShieldCheck,
  FileText
} from 'lucide-vue-next'
import { useAdvanceReports } from '~/composables/useAdvanceReports'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'closed'): void
}>()

const { closeWeek, settlementLoading } = useAdvanceReports()
const toast = useToast()

const selectedWeekOption = ref<'thisWeek' | 'lastWeek'>('thisWeek')
const previewLoading = ref(false)
const note = ref('')

const weekInfo = ref<{
  week: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalPackages: number
  totalEarnings: number
  totalAdvance: number
  remainingBalance: number
} | null>(null)

// Calculate Monday-Sunday date range for current or last week
const computeDates = (type: 'thisWeek' | 'lastWeek') => {
  const now = new Date()
  if (type === 'lastWeek') {
    now.setDate(now.getDate() - 7)
  }

  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const sStr = monday.toISOString().substring(0, 10)
  const eStr = sunday.toISOString().substring(0, 10)

  // ISO Week
  const target = new Date(monday.getTime())
  const dayNr = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  const weekCode = `${monday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`

  const [sy, sm, sd] = sStr.split('-')
  const [ey, em, ed] = eStr.split('-')

  return {
    week: weekCode,
    startDate: sStr,
    endDate: eStr,
    startDateFormatted: `${sd}.${sm}.${sy}`,
    endDateFormatted: `${ed}.${em}.${ey}`
  }
}

const fetchPreview = async () => {
  previewLoading.value = true
  const dates = computeDates(selectedWeekOption.value)
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/reports/advances', {
      query: {
        period: 'custom',
        startDate: dates.startDate,
        endDate: dates.endDate
      }
    })

    // Also fetch deliveries total from reports
    const repRes = await $fetch<{ success: boolean; data: any }>('/api/reports', {
      query: {
        period: 'custom',
        startDate: dates.startDate,
        endDate: dates.endDate
      }
    })

    const totalPackages = repRes?.data?.totalPackageCount || 0
    const totalEarnings = repRes?.data?.totalCourierAmount || repRes?.data?.totalAmount || 0
    const totalAdvance = res?.data?.totalAmount || 0
    const remainingBalance = Number((totalEarnings - totalAdvance).toFixed(2))

    weekInfo.value = {
      ...dates,
      totalPackages,
      totalEarnings,
      totalAdvance,
      remainingBalance
    }
  } catch (err) {
    console.error('Fetch week preview error:', err)
  } finally {
    previewLoading.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    note.value = ''
    selectedWeekOption.value = 'thisWeek'
    fetchPreview()
  }
})

watch(selectedWeekOption, () => {
  fetchPreview()
})

const handleCloseWeekSubmit = async () => {
  if (!weekInfo.value) return
  if (!confirm(`${weekInfo.value.week} (${weekInfo.value.startDateFormatted} - ${weekInfo.value.endDateFormatted}) haftasını kapatıp arşivlemek istediğinize emin misiniz?`)) {
    return
  }

  const result = await closeWeek({
    week: weekInfo.value.week,
    startDate: weekInfo.value.startDate,
    endDate: weekInfo.value.endDate,
    note: note.value.trim() || undefined
  })

  if (result) {
    emit('closed')
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Lock class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Haftayı Kapat & Dönem Arşivle
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Haftalık hesapları kesinleştirme ve arşivleme işlemi
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="$emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-5 space-y-4">
        <!-- Week Selection -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Kapatılacak Haftayı Seçiniz:
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="p-3 rounded-xl border text-left transition-all"
              :class="selectedWeekOption === 'thisWeek' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'"
              @click="selectedWeekOption = 'thisWeek'"
            >
              <div class="text-xs font-bold">Bu Hafta</div>
              <div class="text-[11px] text-slate-500 mt-0.5 font-mono">Pazartesi - Pazar</div>
            </button>

            <button
              type="button"
              class="p-3 rounded-xl border text-left transition-all"
              :class="selectedWeekOption === 'lastWeek' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'"
              @click="selectedWeekOption = 'lastWeek'"
            >
              <div class="text-xs font-bold">Geçen Hafta</div>
              <div class="text-[11px] text-slate-500 mt-0.5 font-mono">Önceki Hafta</div>
            </button>
          </div>
        </div>

        <!-- Calculated Summary Box -->
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
              HAFTA DÖNEMİ: {{ weekInfo?.week || '—' }}
            </span>
            <span class="text-xs font-mono text-slate-500">
              {{ weekInfo?.startDateFormatted }} - {{ weekInfo?.endDateFormatted }}
            </span>
          </div>

          <div v-if="previewLoading" class="py-4 text-center">
            <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
            <p class="text-[11px] text-slate-400">Hesaplanıyor...</p>
          </div>

          <div v-else class="space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400">Toplam Paket:</span>
              <span class="font-mono font-bold text-slate-900 dark:text-slate-100">
                {{ weekInfo?.totalPackages || 0 }} adet
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400">Toplam Hakediş:</span>
              <span class="font-mono font-bold text-slate-900 dark:text-slate-100">
                {{ (weekInfo?.totalEarnings || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>

            <div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span class="font-medium">Toplam Avans:</span>
              <span class="font-mono font-extrabold">
                {{ (weekInfo?.totalAdvance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800 text-sm font-bold">
              <span class="text-slate-900 dark:text-slate-100">Kalan Hakediş:</span>
              <span class="font-mono text-emerald-600 dark:text-emerald-400">
                {{ (weekInfo?.remainingBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
              </span>
            </div>
          </div>
        </div>

        <!-- Note input -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Kapatma Notu / Açıklama (Opsiyonel)
          </label>
          <input
            v-model="note"
            type="text"
            placeholder="Örn: 2026-W39 dönemi banka havaleleri tamamlandı."
            maxlength="250"
            class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <!-- Notice -->
        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p class="leading-relaxed text-[11px]">
            <strong>Önemli Bilgi:</strong> Hafta kapatıldığında bu haftaya ait avanslar arşivlenir ve aktif hesap havuzundan çıkarılır. Geçmiş raporlardan hiçbir zaman <u>silinmez</u>, daima görüntülenebilir.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          @click="$emit('close')"
        >
          İptal
        </button>

        <button
          type="button"
          :disabled="settlementLoading || previewLoading"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-all shadow-xs active:scale-95"
          @click="handleCloseWeekSubmit"
        >
          <Lock v-if="!settlementLoading" class="w-4 h-4" />
          <span v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ settlementLoading ? 'İşleniyor...' : 'Haftayı Kapat ve Arşivle' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
