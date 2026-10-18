<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  MessageSquare,
  Copy,
  Check,
  Phone,
  Store,
  Calendar,
  Package,
  Wallet,
  ArrowRight
} from 'lucide-vue-next'
import type { VenueItem, VenueDailyStat } from '~/composables/useVenues'
import {
  getBusinessDateStr,
  getBusinessThisWeekMonday,
  getBusinessLastWeekMonday,
  formatToDisplayDate
} from '~/utils/date'
import { useToast } from '~/composables/useToast'

interface Props {
  modelValue: boolean
  venue: VenueItem | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const toast = useToast()
const isCopied = ref(false)
const localPhone = ref('')
const selectedScope = ref<'weekly' | 'lastWeek' | 'pending' | 'daily'>('weekly')

// Load phone from venue record (database) or localStorage when modal opens
watch(
  () => props.venue,
  (v) => {
    if (v) {
      const savedPhone = (typeof window !== 'undefined' ? localStorage.getItem(`venue_phone_${v.id}`) : '') || ''
      localPhone.value = v.phone || savedPhone || ''
    }
    selectedScope.value = 'weekly'
  },
  { immediate: true }
)

const savePhoneToSystem = async () => {
  if (props.venue && localPhone.value.trim()) {
    const trimmed = localPhone.value.trim()
    if (typeof window !== 'undefined') {
      localStorage.setItem(`venue_phone_${props.venue.id}`, trimmed)
    }
    try {
      await $fetch(`/api/venues/${props.venue.id}`, {
        method: 'PUT',
        body: { phone: trimmed }
      })
      props.venue.phone = trimmed
    } catch {
      // Non-blocking background sync
    }
  }
}

const onPhoneInput = () => {
  savePhoneToSystem()
}

// Turkish day name helper
const formatDayName = (dateStr: string) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'UTC' }).format(dt)
}

// Date Range calculations
const dateRange = computed(() => {
  if (selectedScope.value === 'weekly') {
    const mondayStr = getBusinessThisWeekMonday()
    const [y, m, d] = mondayStr.split('-').map(Number)
    const monday = new Date(Date.UTC(y, m - 1, d))
    const sunday = new Date(monday.getTime() + 6 * 86400000)
    const sundayStr = sunday.toISOString().substring(0, 10)
    return {
      start: mondayStr,
      end: sundayStr,
      label: `Bu Hafta (${formatToDisplayDate(mondayStr)} - ${formatToDisplayDate(sundayStr)})`
    }
  } else if (selectedScope.value === 'lastWeek') {
    const mondayStr = getBusinessLastWeekMonday()
    const [y, m, d] = mondayStr.split('-').map(Number)
    const monday = new Date(Date.UTC(y, m - 1, d))
    const sunday = new Date(monday.getTime() + 6 * 86400000)
    const sundayStr = sunday.toISOString().substring(0, 10)
    return {
      start: mondayStr,
      end: sundayStr,
      label: `Geçen Hafta (${formatToDisplayDate(mondayStr)} - ${formatToDisplayDate(sundayStr)})`
    }
  } else if (selectedScope.value === 'daily') {
    const today = getBusinessDateStr()
    return {
      start: today,
      end: today,
      label: `Bugün (${formatToDisplayDate(today)})`
    }
  } else {
    return {
      start: '',
      end: '',
      label: 'Bekleyen Tahsilat (Aktif Hesap)'
    }
  }
})

// Filtered daily breakdown according to selected scope
const filteredDays = computed<VenueDailyStat[]>(() => {
  if (!props.venue) return []
  const allDays = (props.venue.allDailyBreakdown && props.venue.allDailyBreakdown.length > 0)
    ? props.venue.allDailyBreakdown
    : (props.venue.dailyBreakdown || [])

  if (selectedScope.value === 'weekly' || selectedScope.value === 'lastWeek') {
    const { start, end } = dateRange.value
    return allDays
      .filter(d => d.date >= start && d.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date))
  } else if (selectedScope.value === 'daily') {
    const { start } = dateRange.value
    return allDays.filter(d => d.date === start)
  } else {
    // Pending
    return allDays.filter(d => !d.isSettled && (d.totalCount > 0 || (d.pendingAmount || 0) > 0))
  }
})

// Metrics summary computed for the active scope
const reportSummary = computed(() => {
  const v = props.venue
  if (!v) {
    return {
      indoorCount: 0,
      outdoorCount: 0,
      totalCount: 0,
      indoorAmount: 0,
      outdoorAmount: 0,
      totalAmount: 0,
      settledAmount: 0,
      remainingAmount: 0
    }
  }

  if (selectedScope.value === 'pending') {
    const indoorCount = v.pendingIndoorCount || 0
    const outdoorCount = v.pendingOutdoorCount || 0
    const totalCount = v.pendingPackageCount || (indoorCount + outdoorCount)
    const totalAmount = Number(v.totalAmount || v.pendingAmount || 0)
    const indoorPrice = Number(v.indoorPrice || 0)
    const outdoorPrice = Number(v.outdoorPrice || 0)
    const indoorAmount = v.pendingIndoorAmount || (indoorCount * indoorPrice)
    const outdoorAmount = v.pendingOutdoorAmount || (outdoorCount * outdoorPrice)
    const settledAmount = Number(v.totalCollectedAmount || 0)
    const remainingAmount = totalAmount

    return {
      indoorCount,
      outdoorCount,
      totalCount,
      indoorAmount,
      outdoorAmount,
      totalAmount,
      settledAmount,
      remainingAmount
    }
  }

  // Sum from filteredDays
  let indoorCount = 0
  let outdoorCount = 0
  let totalCount = 0
  let indoorAmount = 0
  let outdoorAmount = 0
  let totalAmount = 0
  let settledAmount = 0
  let remainingAmount = 0

  for (const day of filteredDays.value) {
    indoorCount += day.indoorCount || 0
    outdoorCount += day.outdoorCount || 0
    totalCount += day.totalCount || ((day.indoorCount || 0) + (day.outdoorCount || 0))
    indoorAmount += day.indoorAmount || 0
    outdoorAmount += day.outdoorAmount || 0
    totalAmount += day.totalAmount || 0
    settledAmount += day.settledAmount || 0
    remainingAmount += (day.pendingAmount !== undefined ? day.pendingAmount : (day.isSettled ? 0 : day.totalAmount))
  }

  return {
    indoorCount,
    outdoorCount,
    totalCount,
    indoorAmount,
    outdoorAmount,
    totalAmount,
    settledAmount,
    remainingAmount
  }
})

// Formatted WhatsApp Message
const formattedMessage = computed(() => {
  if (!props.venue) return ''
  const v = props.venue
  const s = reportSummary.value
  const { label } = dateRange.value

  const lines: string[] = []
  lines.push(`📋 *MEKAN HESAP VE TESLİMAT RAPORU*`)
  lines.push(`🏢 *Mekan:* ${v.name}`)
  lines.push(`📅 *Dönem:* ${label}`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`📦 *PAKET ÖZETİ*`)
  lines.push(`• İç Mekan: ${s.indoorCount} Paket (${Number(v.indoorPrice).toFixed(2)} ₺) = ${s.indoorAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`)
  lines.push(`• Dış Mekan: ${s.outdoorCount} Paket (${Number(v.outdoorPrice).toFixed(2)} ₺) = ${s.outdoorAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`)
  lines.push(`• *Toplam Paket:* ${s.totalCount} Paket`)
  lines.push(``)
  lines.push(`💰 *ALACAK / VERECEK HESAP DURUMU*`)
  lines.push(`• Toplam Hizmet Tutarı: ${s.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`)
  if (s.settledAmount > 0) {
    lines.push(`• Tahsil Edilen / Ödenen: ${s.settledAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`)
  }
  lines.push(`────────────────────`)
  lines.push(`🔥 *KALAN ÖDENECEK TUTAR: ${s.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺*`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━`)

  if (filteredDays.value.length > 0) {
    lines.push(`🗓️ *GÜNLÜK TESLİMAT DÖKÜMÜ*`)
    for (const d of filteredDays.value) {
      const dayName = formatDayName(d.date)
      const dateDisp = formatToDisplayDate(d.date)
      const dayTotal = d.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
      lines.push(`• ${dateDisp} (${dayName}): ${d.indoorCount} İç, ${d.outdoorCount} Dış [${d.totalCount} Pkt] - ${dayTotal} ₺`)
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
  }

  lines.push(`Bilgilerinize sunar, hayırlı işler dileriz.`)
  return lines.join('\n')
})

// Normalizes Turkish / international phone number for WhatsApp
const normalizedPhone = computed(() => {
  let raw = localPhone.value.trim().replace(/\D/g, '')
  if (!raw) return ''
  if (raw.startsWith('0')) {
    raw = '90' + raw.substring(1)
  } else if (raw.length === 10 && raw.startsWith('5')) {
    raw = '90' + raw
  }
  return raw
})

const shareUrl = computed(() => {
  const text = encodeURIComponent(formattedMessage.value)
  if (normalizedPhone.value) {
    return `https://api.whatsapp.com/send?phone=${normalizedPhone.value}&text=${text}`
  }
  return `https://api.whatsapp.com/send?text=${text}`
})

const handleCopy = async () => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(formattedMessage.value)
      isCopied.value = true
      toast.success('Rapor metni panoya kopyalandı!')
      setTimeout(() => {
        isCopied.value = false
      }, 2500)
    } catch {
      toast.error('Kopyalama başarısız.')
    }
  }
}

const handleOpenWhatsApp = () => {
  savePhoneToSystem()
  if (typeof window !== 'undefined') {
    window.open(shareUrl.value, '_blank', 'noopener,noreferrer')
    toast.success('WhatsApp açılıyor...')
    emit('update:modelValue', false)
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="WhatsApp ile Mekan Raporu Paylaş"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="venue" class="space-y-4 text-slate-900 dark:text-slate-100">
      <!-- Mekan Bilgisi & Finansal Özet Başlığı -->
      <div class="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Store class="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div class="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Mekan / İşletme
              </div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">
                {{ venue.name }}
              </div>
            </div>
          </div>

          <div class="text-right">
            <span class="text-[11px] text-slate-400 dark:text-slate-500 block font-medium">Kalan Alacak / Bakiye</span>
            <span class="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-lg">
              {{ reportSummary.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </span>
          </div>
        </div>

        <!-- Rapor Kapsam Seçici Tab Butonları -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
          <button
            type="button"
            :class="[
              'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center border',
              selectedScope === 'weekly'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            ]"
            @click="selectedScope = 'weekly'"
          >
            Bu Hafta
          </button>
          <button
            type="button"
            :class="[
              'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center border',
              selectedScope === 'lastWeek'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            ]"
            @click="selectedScope = 'lastWeek'"
          >
            Geçen Hafta
          </button>
          <button
            type="button"
            :class="[
              'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center border',
              selectedScope === 'pending'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            ]"
            @click="selectedScope = 'pending'"
          >
            Bekleyen Hesap
          </button>
          <button
            type="button"
            :class="[
              'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center border',
              selectedScope === 'daily'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            ]"
            @click="selectedScope = 'daily'"
          >
            Bugün
          </button>
        </div>

        <!-- 3'lü Özet Kartı: Paketler, Toplam Tutar, Kalan Ödenecek -->
        <div class="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-800/60 font-mono text-center">
          <div class="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800">
            <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-sans font-medium">Toplam Paket</span>
            <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
              {{ reportSummary.totalCount }} Adet
            </span>
            <span class="text-[9px] text-slate-400 block font-sans">
              ({{ reportSummary.indoorCount }} İç / {{ reportSummary.outdoorCount }} Dış)
            </span>
          </div>

          <div class="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800">
            <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-sans font-medium">Hizmet Bedeli</span>
            <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
              {{ reportSummary.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }} ₺
            </span>
            <span v-if="reportSummary.settledAmount > 0" class="text-[9px] text-emerald-600 dark:text-emerald-400 block font-sans">
              Ödenen: {{ reportSummary.settledAmount.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }} ₺
            </span>
            <span v-else class="text-[9px] text-slate-400 block font-sans">
              Ödeme Yok
            </span>
          </div>

          <div class="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-800/80">
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 block font-sans font-medium">Kalan Alacak</span>
            <span class="font-bold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm">
              {{ reportSummary.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺
            </span>
            <span class="text-[9px] text-emerald-600/80 block font-sans">
              Net Tahsilat
            </span>
          </div>
        </div>
      </div>

      <!-- Telefon Numarası Girişi -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Mekan Yetkilisi Telefon Numarası
        </label>
        <div class="relative">
          <input
            v-model="localPhone"
            type="tel"
            placeholder="05XX XXX XX XX"
            class="w-full px-3 py-2 pl-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            @input="onPhoneInput"
          >
          <Phone class="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
          <span v-if="normalizedPhone" class="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
            WhatsApp Formatı: +{{ normalizedPhone }} (Otomatik Hatırlandı)
          </span>
          <span v-else class="text-slate-400 dark:text-slate-500">
            (Telefon girilmezse WhatsApp kişi seçim ekranı açılır)
          </span>
        </p>
      </div>

      <!-- Canlı Mesaj Taslağı & Kopyala -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Gönderilecek WhatsApp Mesaj Taslağı
          </label>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            @click="handleCopy"
          >
            <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" :class="isCopied ? 'text-emerald-600' : ''" />
            <span>{{ isCopied ? 'Kopyalandı' : 'Metni Kopyala' }}</span>
          </button>
        </div>

        <textarea
          :value="formattedMessage"
          readonly
          rows="8"
          class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-xs font-mono whitespace-pre focus:outline-none select-all resize-y"
        ></textarea>
      </div>

      <!-- Modal Alt Butonları -->
      <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <BaseButton
          variant="outline"
          size="sm"
          class="!text-xs"
          @click="emit('update:modelValue', false)"
        >
          Kapat
        </BaseButton>

        <div class="flex items-center gap-2">
          <BaseButton
            variant="outline"
            size="sm"
            class="!text-xs gap-1.5"
            @click="handleCopy"
          >
            <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" />
            <span>{{ isCopied ? 'Kopyalandı' : 'Kopyala' }}</span>
          </BaseButton>

          <BaseButton
            variant="primary"
            size="sm"
            class="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !text-white gap-2 font-bold shadow-xs active:scale-95 transition-all"
            @click="handleOpenWhatsApp"
          >
            <MessageSquare class="w-4 h-4 fill-white" />
            <span>WhatsApp ile Gönder</span>
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
