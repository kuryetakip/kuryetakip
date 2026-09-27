<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X,
  Wallet,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileText,
  RotateCcw
} from 'lucide-vue-next'
import type { CourierItem } from '~/composables/useCouriers'
import { useCouriers } from '~/composables/useCouriers'

const props = defineProps<{
  isOpen: boolean
  courier: CourierItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'settled'): void
}>()

const { settleCourier, loading } = useCouriers()

const payoutInput = ref<string | number>('')
const note = ref('')
const isSubmitting = ref(false)

// Current cycle metrics
const totalPackages = computed(() => {
  if (!props.courier) return 0
  return props.courier.cumulativeTotalPackages || 0
})

const totalEarnings = computed(() => {
  if (!props.courier) return 0
  return props.courier.cumulativeTotalAmount ?? props.courier.totalEarnings ?? 0
})

const carriedBalance = computed(() => {
  if (!props.courier) return 0
  return Number(props.courier.carriedBalance || 0)
})

const totalAdvance = computed(() => {
  if (!props.courier) return 0
  return Number(props.courier.paidAmount || 0)
})

const netDue = computed(() => {
  return Number((totalEarnings.value - totalAdvance.value).toFixed(2))
})

// Numeric payout amount from input
const numericPayout = computed(() => {
  if (payoutInput.value === '' || payoutInput.value === null || payoutInput.value === undefined) {
    return 0
  }
  const clean = String(payoutInput.value).trim().replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : Math.max(0, num)
})

// Live remaining balance to be carried over to next period
const remainingBalance = computed(() => {
  return Number((netDue.value - numericPayout.value).toFixed(2))
})

// Quick setters
const setFullAmount = () => {
  payoutInput.value = netDue.value > 0 ? netDue.value : 0
}

const setRoundedAmount = () => {
  if (netDue.value <= 0) return
  const rounded = Math.floor(netDue.value / 100) * 100
  payoutInput.value = rounded > 0 ? rounded : netDue.value
}

// Watch modal open
watch(() => props.isOpen, (open) => {
  if (open && props.courier) {
    setFullAmount()
    note.value = ''
  }
})

const handleSettle = async () => {
  if (!props.courier) return
  isSubmitting.value = true
  try {
    const result = await settleCourier(props.courier.id, {
      payoutAmount: numericPayout.value,
      note: note.value
    })
    if (result) {
      emit('settled')
      emit('close')
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleUndo = async () => {
  if (!props.courier) return
  if (!confirm(`${props.courier.name} için son yapılan hakediş ödemesini geri alıp önceki durumu yüklemek istediğinize emin misiniz?`)) {
    return
  }
  isSubmitting.value = true
  try {
    const result = await settleCourier(props.courier.id, {
      action: 'undo'
    })
    if (result) {
      emit('settled')
      emit('close')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    title="Kurye Hakediş Ödemesi / Tahsilat"
    size="md"
    @close="emit('close')"
  >
    <div v-if="courier" class="space-y-4">
      <!-- Kurye Kimlik Başlığı -->
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
        <div>
          <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
            {{ courier.name }}
          </h4>
          <span class="text-xs text-slate-500 font-mono">
            {{ courier.phone || 'Telefon kaydı yok' }}
          </span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Dönem Durumu</span>
          <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 class="w-3.5 h-3.5" />
            Aktif Çalışma
          </span>
        </div>
      </div>

      <!-- Hakediş Özeti Kartları (4 Kolon) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <!-- Toplam Paket -->
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <span class="text-[10px] uppercase font-semibold text-slate-500 block">Dönem Paketi</span>
          <div class="font-mono font-extrabold text-base text-slate-900 dark:text-slate-100 mt-0.5">
            {{ totalPackages }}
          </div>
          <span class="text-[10px] text-slate-400">Adet</span>
        </div>

        <!-- Toplam Hakediş -->
        <div class="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/70">
          <span class="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-300 block">Toplam Hakediş</span>
          <div class="font-mono font-extrabold text-sm sm:text-base text-emerald-900 dark:text-emerald-100 mt-0.5">
            {{ totalEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
          </div>
          <span v-if="carriedBalance > 0" class="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
            +{{ carriedBalance.toFixed(0) }} ₺ Devir
          </span>
          <span v-else class="text-[10px] text-emerald-600 dark:text-emerald-400">Hakediş Tutarı</span>
        </div>

        <!-- Düşülen Avans -->
        <div class="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/70">
          <span class="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-300 block">Verilen Avans</span>
          <div class="font-mono font-extrabold text-sm sm:text-base text-amber-900 dark:text-amber-100 mt-0.5">
            -{{ totalAdvance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
          </div>
          <span class="text-[10px] text-amber-600 dark:text-amber-400">Düşülecek</span>
        </div>

        <!-- Net Kalan Hakediş -->
        <div class="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70">
          <span class="text-[10px] uppercase font-semibold text-indigo-700 dark:text-indigo-300 block">Net Ödenecek</span>
          <div class="font-mono font-extrabold text-sm sm:text-base text-indigo-900 dark:text-indigo-100 mt-0.5">
            {{ netDue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
          </div>
          <span class="text-[10px] text-indigo-600 dark:text-indigo-400">Kalan Bakiye</span>
        </div>
      </div>

      <!-- Ödeme Giriş Formu -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-3">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Kuryeye Fiilen Ödenen / Tahsil Edilen Tutar (₺)
          </label>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              @click="setFullAmount"
            >
              Tamamı ({{ netDue > 0 ? netDue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00' }} ₺)
            </button>
            <button
              v-if="netDue >= 100"
              type="button"
              class="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              @click="setRoundedAmount"
            >
              Yuvarla
            </button>
          </div>
        </div>

        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₺</span>
          <input
            v-model="payoutInput"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full pl-8 pr-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Devreden Bakiye Canlı Durum Kartı (Kullanıcının İstediği Kalan Tutar Mantığı) -->
        <div
          v-if="remainingBalance > 0"
          class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
        >
          <Clock class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p class="font-bold">Kalan Tutar Sonraki Döneme Devredecek:</p>
            <p class="mt-0.5 text-amber-800 dark:text-amber-300">
              Net alacaktan kalan <strong class="font-mono text-sm underline">{{ remainingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong>, kuryenin sonraki hafta / gün hesaplamasında <strong>devreden hakediş</strong> olarak saklanacaktır.
            </p>
          </div>
        </div>

        <div
          v-else-if="remainingBalance === 0"
          class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
        >
          <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p class="font-bold">Hakediş Tamamen Sıfırlanıyor:</p>
            <p class="mt-0.5 text-emerald-800 dark:text-emerald-300">
              Kuryenin tüm hakedişi kapatılacak, kalan bakiye 0,00 ₺ olacak ve yeni döneme sıfırdan başlanacaktır.
            </p>
          </div>
        </div>

        <div
          v-else
          class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2"
        >
          <AlertTriangle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p class="font-bold">Fazla Ödeme (Kurye Borçlu):</p>
            <p class="mt-0.5 text-rose-800 dark:text-rose-300">
              Kuryeye hak ettiğinden fazla ödeme yapılıyor. Kalan <strong class="font-mono">{{ Math.abs(remainingBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</strong> eksi bakiye olarak devredecektir.
            </p>
          </div>
        </div>

        <!-- Opsiyonel Not Alanı -->
        <div>
          <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Ödeme Notu / Açıklama (İsteğe Bağlı)
          </label>
          <input
            v-model="note"
            type="text"
            maxlength="200"
            placeholder="Örn: Nakit elden teslim edildi veya Garanti Bankası havalesi"
            class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Geçmiş Ödemeyi Geri Al (Undo) Butonu (Eğer varsa) -->
      <div v-if="courier.lastSettledAt" class="flex items-center justify-between text-xs pt-1 text-slate-500 dark:text-slate-400">
        <span class="flex items-center gap-1">
          <Clock class="w-3.5 h-3.5 text-slate-400" />
          Son ödeme: {{ new Date(courier.lastSettledAt).toLocaleDateString('tr-TR') }} ({{ (courier.lastSettledAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺)
        </span>
        <button
          type="button"
          :disabled="isSubmitting"
          class="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
          @click="handleUndo"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Son Ödemeyi Geri Al</span>
        </button>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="pt-2 flex justify-end gap-2.5">
        <BaseButton
          variant="outline"
          size="sm"
          type="button"
          :disabled="isSubmitting"
          @click="emit('close')"
        >
          Vazgeç
        </BaseButton>

        <BaseButton
          variant="primary"
          size="sm"
          type="button"
          :loading="isSubmitting"
          class="!bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold inline-flex items-center gap-1.5"
          @click="handleSettle"
        >
          <Wallet class="w-4 h-4" />
          <span>Ödemeyi Kaydet ve Dönemi Kapat</span>
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
