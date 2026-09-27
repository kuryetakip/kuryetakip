<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Activity,
  Package,
  Users,
  Store,
  FileText,
  Plus,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Sparkles,
  Phone,
  Bike,
  ExternalLink
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

useHead({
  title: 'Operasyon Merkezi — KuryeTakip'
})

const { user } = useAuth()
const loading = ref(true)
const selectedPeriod = ref<'today' | 'week' | 'month'>('today')

// Real Data State
const reportSummary = ref({
  totalCount: 0,
  totalAmount: 0,
  indoorCount: 0,
  indoorAmount: 0,
  outdoorCount: 0,
  outdoorAmount: 0,
  courierCount: 0,
  venueCount: 0
})

const courierBreakdown = ref<any[]>([])
const venueBreakdown = ref<any[]>([])
const recentDeliveries = ref<any[]>([])
const activeCouriersList = ref<any[]>([])
const totalVenuesCount = ref(0)
const totalCouriersCount = ref(0)

// Greeting based on time of day
const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Günaydın'
  if (hour >= 12 && hour < 18) return 'Tünaydın'
  return 'İyi Akşamlar'
})

const periodLabels = {
  today: 'Bugün',
  week: 'Bu Hafta',
  month: 'Bu Ay'
}

// Fetch live operations data from real endpoints
const fetchDashboardData = async () => {
  loading.value = true
  try {
    const [reportRes, deliveriesRes, couriersRes, venuesRes] = await Promise.all([
      $fetch<{ success: boolean; data: any }>(`/api/reports?period=${selectedPeriod.value}`).catch(() => ({ success: false, data: null })),
      $fetch<{ success: boolean; data: any[] }>('/api/deliveries').catch(() => ({ success: false, data: [] })),
      $fetch<{ success: boolean; data: any[] }>('/api/couriers').catch(() => ({ success: false, data: [] })),
      $fetch<{ success: boolean; data: any[] }>('/api/venues').catch(() => ({ success: false, data: [] }))
    ])

    if (reportRes?.success && reportRes.data) {
      reportSummary.value = reportRes.data.summary || {
        totalCount: 0,
        totalAmount: 0,
        indoorCount: 0,
        indoorAmount: 0,
        outdoorCount: 0,
        outdoorAmount: 0,
        courierCount: 0,
        venueCount: 0
      }
      courierBreakdown.value = reportRes.data.courierBreakdown || []
      venueBreakdown.value = reportRes.data.venueBreakdown || []
    }

    if (deliveriesRes?.success && Array.isArray(deliveriesRes.data)) {
      recentDeliveries.value = deliveriesRes.data.slice(0, 7)
    }

    if (couriersRes?.success && Array.isArray(couriersRes.data)) {
      totalCouriersCount.value = couriersRes.data.length
      activeCouriersList.value = couriersRes.data.filter(c => c.isActive).slice(0, 6)
    }

    if (venuesRes?.success && Array.isArray(venuesRes.data)) {
      totalVenuesCount.value = venuesRes.data.length
    }
  } catch (err) {
    console.error('Dashboard data load error:', err)
  } finally {
    loading.value = false
  }
}

const handlePeriodChange = (period: 'today' | 'week' | 'month') => {
  selectedPeriod.value = period
  fetchDashboardData()
}

// Percentages for indoor vs outdoor
const indoorRatio = computed(() => {
  const total = reportSummary.value.totalCount
  if (!total) return 50
  return Math.round((reportSummary.value.indoorCount / total) * 100)
})

const outdoorRatio = computed(() => {
  const total = reportSummary.value.totalCount
  if (!total) return 50
  return 100 - indoorRatio.value
})

const averagePackageAmount = computed(() => {
  const count = reportSummary.value.totalCount
  const amount = reportSummary.value.totalAmount
  if (!count) return 0
  return Number((amount / count).toFixed(2))
})

const formatCurrency = (val: number) => {
  return (val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header: Greeting + Period Switcher + Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/90 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200/80 dark:border-emerald-800/60 font-mono">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OPERASYON MERKEZİ
          </span>
          <span class="text-xs text-slate-400 font-medium hidden sm:inline">
            7/24 Canlı İzleme
          </span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-1.5">
          {{ greetingText }}<span v-if="user?.name">, {{ user.name.split(' ')[0] }}</span> 👋
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kurye filosu, paket akışı ve güncel hakedişlerin anlık operasyonel durumu.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Period Switcher Pill -->
        <div class="inline-flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs font-medium">
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg transition-all',
              selectedPeriod === 'today'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="handlePeriodChange('today')"
          >
            Bugün
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg transition-all',
              selectedPeriod === 'week'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="handlePeriodChange('week')"
          >
            Bu Hafta
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg transition-all',
              selectedPeriod === 'month'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="handlePeriodChange('month')"
          >
            Bu Ay
          </button>
        </div>

        <!-- Refresh Button -->
        <BaseButton
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="fetchDashboardData"
        >
          <template #leading>
            <RefreshCw :class="['w-3.5 h-3.5', loading ? 'animate-spin' : '']" />
          </template>
          Yenile
        </BaseButton>

        <!-- New Delivery Shortcut CTA -->
        <NuxtLink to="/deliveries">
          <BaseButton variant="primary" size="sm">
            <template #leading>
              <Plus class="w-3.5 h-3.5" />
            </template>
            Paket Gir
          </BaseButton>
        </NuxtLink>
      </div>
    </div>

    <!-- 4 PRIMARY KPI CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Toplam Teslimat (Paket Hacmi) -->
      <BaseCard no-padding class="p-5 flex flex-col justify-between border-l-4 border-l-emerald-500 relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {{ periodLabels[selectedPeriod] }} Teslimat
          </span>
          <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Package class="w-5 h-5" />
          </div>
        </div>

        <div class="mt-3">
          <div v-if="loading" class="space-y-2">
            <BaseSkeleton height="2rem" width="60%" />
            <BaseSkeleton height="0.875rem" width="80%" />
          </div>
          <div v-else>
            <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {{ reportSummary.totalCount }}
              <span class="text-sm font-semibold text-slate-400 font-sans">Paket</span>
            </div>
            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span class="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{{ reportSummary.indoorCount }} İç</span>
              <span>·</span>
              <span class="text-sky-600 dark:text-sky-400 font-bold font-mono">{{ reportSummary.outdoorCount }} Dış</span>
              <span>·</span>
              <span class="text-slate-400">Ort: {{ averagePackageAmount.toFixed(0) }} ₺</span>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- 2. Aktif Kurye Sayısı & Filo -->
      <BaseCard no-padding class="p-5 flex flex-col justify-between border-l-4 border-l-sky-500 relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Aktif Kuryeler
          </span>
          <div class="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Bike class="w-5 h-5" />
          </div>
        </div>

        <div class="mt-3">
          <div v-if="loading" class="space-y-2">
            <BaseSkeleton height="2rem" width="60%" />
            <BaseSkeleton height="0.875rem" width="80%" />
          </div>
          <div v-else>
            <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {{ activeCouriersList.length }}
              <span class="text-sm font-semibold text-slate-400 font-sans">/ {{ totalCouriersCount }} Kurye</span>
            </div>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {{ activeCouriersList.length }} Sahada Aktif
              </span>
              <NuxtLink to="/couriers" class="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5">
                Yönet <ChevronRight class="w-3 h-3" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- 3. Toplam Hakediş / Ciro -->
      <BaseCard no-padding class="p-5 flex flex-col justify-between border-l-4 border-l-emerald-600 bg-slate-900 dark:bg-slate-900 text-white relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            {{ periodLabels[selectedPeriod] }} Hakediş
          </span>
          <div class="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp class="w-5 h-5" />
          </div>
        </div>

        <div class="mt-3">
          <div v-if="loading" class="space-y-2">
            <BaseSkeleton height="2rem" width="80%" />
            <BaseSkeleton height="0.875rem" width="60%" />
          </div>
          <div v-else>
            <div class="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {{ formatCurrency(reportSummary.totalAmount) }}
            </div>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
              <span>Mekan Hakediş Toplamı</span>
              <NuxtLink to="/reports" class="text-emerald-400 hover:underline flex items-center gap-0.5">
                Raporlar <ChevronRight class="w-3 h-3" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- 4. Aktif Mekanlar -->
      <BaseCard no-padding class="p-5 flex flex-col justify-between border-l-4 border-l-amber-500 relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Kayıtlı Mekanlar
          </span>
          <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Store class="w-5 h-5" />
          </div>
        </div>

        <div class="mt-3">
          <div v-if="loading" class="space-y-2">
            <BaseSkeleton height="2rem" width="60%" />
            <BaseSkeleton height="0.875rem" width="80%" />
          </div>
          <div v-else>
            <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {{ totalVenuesCount }}
              <span class="text-sm font-semibold text-slate-400 font-sans">İşletme</span>
            </div>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span class="text-amber-600 dark:text-amber-400 font-semibold">
                {{ reportSummary.venueCount }} Mekandan Teslimat
              </span>
              <NuxtLink to="/venues" class="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5">
                Mekanlar <ChevronRight class="w-3 h-3" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- OPERATIONS OVERVIEW: RATIO & FLOW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left 2 Cols: Teslimat Dağılımı & Hacim Özeti -->
      <BaseCard class="lg:col-span-2 space-y-5" title="Operasyon Dağılım Özeti">
        <template #action>
          <span class="text-xs font-semibold text-slate-400">
            Dönem: {{ periodLabels[selectedPeriod] }}
          </span>
        </template>

        <!-- Ratio Visual Bar -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              İç Mekan Teslimat (%{{ indoorRatio }})
            </span>
            <span class="text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Dış Mekan Teslimat (%{{ outdoorRatio }})
            </span>
          </div>

          <!-- Dual Progress Bar -->
          <div class="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              class="h-full bg-emerald-500 transition-all duration-500"
              :style="{ width: `${indoorRatio}%` }"
              :title="`İç Mekan: ${reportSummary.indoorCount} Paket`"
            />
            <div
              class="h-full bg-sky-500 transition-all duration-500"
              :style="{ width: `${outdoorRatio}%` }"
              :title="`Dış Mekan: ${reportSummary.outdoorCount} Paket`"
            />
          </div>
        </div>

        <!-- 3 Financial & Logistics Metrics Boxes -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">İç Teslimat Tutarı</div>
            <div class="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              {{ formatCurrency(reportSummary.indoorAmount) }}
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">{{ reportSummary.indoorCount }} Paket Atıldı</div>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dış Teslimat Tutarı</div>
            <div class="text-lg font-bold font-mono text-sky-700 dark:text-sky-400 mt-1">
              {{ formatCurrency(reportSummary.outdoorAmount) }}
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">{{ reportSummary.outdoorCount }} Paket Atıldı</div>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ortalama Paket Başı</div>
            <div class="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {{ averagePackageAmount.toFixed(2) }} ₺
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">Birim hakediş ortalaması</div>
          </div>
        </div>

        <!-- Top Venues Breakdown mini list -->
        <div v-if="venueBreakdown.length > 0" class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>En Çok Paket Atan Mekanlar</span>
            <NuxtLink to="/venues" class="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]">Tüm Mekanlar →</NuxtLink>
          </div>

          <div class="space-y-2">
            <div
              v-for="v in venueBreakdown.slice(0, 4)"
              :key="v.venueId"
              class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div class="flex items-center gap-2.5">
                <div class="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                  <Store class="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span class="font-semibold text-slate-900 dark:text-slate-100">{{ v.venueName }}</span>
              </div>
              <div class="flex items-center gap-3 font-mono">
                <span class="font-bold text-slate-700 dark:text-slate-300">{{ v.totalCount }} Paket</span>
                <span class="font-extrabold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(v.totalAmount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Right 1 Col: Aktif Kurye Durumu -->
      <BaseCard title="Kurye Filosu Durumu" class="space-y-4">
        <template #action>
          <NuxtLink to="/couriers" class="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
            Tüm Filo →
          </NuxtLink>
        </template>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 4" :key="`skel-c-${i}`" class="flex items-center gap-3">
            <BaseSkeleton height="2.25rem" width="2.25rem" rounded="full" />
            <div class="space-y-1 flex-1">
              <BaseSkeleton height="0.875rem" width="70%" />
              <BaseSkeleton height="0.75rem" width="40%" />
            </div>
          </div>
        </div>

        <div v-else-if="activeCouriersList.length > 0" class="space-y-2.5">
          <div
            v-for="c in activeCouriersList"
            :key="c.id"
            class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-100 dark:border-slate-800 text-xs hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {{ c.name ? c.name[0] : 'K' }}
              </div>
              <div class="min-w-0">
                <div class="font-bold text-slate-900 dark:text-slate-100 truncate">{{ c.name }}</div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span class="truncate">{{ c.phone || 'Telefon yok' }}</span>
                </div>
              </div>
            </div>

            <div class="text-right font-mono shrink-0">
              <div class="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                {{ formatCurrency(c.currentBalance || 0) }}
              </div>
              <div class="text-[10px] text-slate-400 font-sans">Kalan Hakediş</div>
            </div>
          </div>
        </div>

        <div v-else class="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-xl">
          Henüz aktif kurye kaydı bulunmuyor.
        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span class="text-slate-400">Filo Yönetimi</span>
          <NuxtLink to="/couriers">
            <BaseButton variant="outline" size="sm" class="!text-xs !py-1">
              Kurye İşlemleri
            </BaseButton>
          </NuxtLink>
        </div>
      </BaseCard>
    </div>

    <!-- RECENT DELIVERIES LOG STREAM -->
    <BaseCard title="Son Paket Teslimatları">
      <template #action>
        <NuxtLink to="/deliveries" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
          <span>Tüm Teslimatları İncele</span>
          <ExternalLink class="w-3.5 h-3.5" />
        </NuxtLink>
      </template>

      <div v-if="loading" class="space-y-2">
        <BaseSkeleton v-for="i in 5" :key="`skel-del-${i}`" height="3rem" rounded="lg" />
      </div>

      <div v-else-if="recentDeliveries.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th class="px-3 py-2.5">Tarih</th>
              <th class="px-3 py-2.5">Kurye</th>
              <th class="px-3 py-2.5">Mekan</th>
              <th class="px-3 py-2.5 text-center">Teslimat Türü</th>
              <th class="px-3 py-2.5 text-right">Paket Sayısı</th>
              <th class="px-3 py-2.5 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="rec in recentDeliveries"
              :key="rec.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors font-mono"
            >
              <td class="px-3 py-3 font-sans text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {{ formatDate(rec.date) }}
              </td>
              <td class="px-3 py-3 font-sans font-semibold text-slate-900 dark:text-slate-100">
                {{ rec.courier?.name || 'Genel Teslimat' }}
              </td>
              <td class="px-3 py-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                {{ rec.venue?.name || 'Mekan Belirtilmemiş' }}
              </td>
              <td class="px-3 py-3 text-center">
                <BaseBadge
                  :variant="rec.deliveryType === 'INDOOR' ? 'success' : 'brand'"
                  size="sm"
                >
                  {{ rec.deliveryType === 'INDOOR' ? 'İç Mekan' : 'Dış Mekan' }}
                </BaseBadge>
              </td>
              <td class="px-3 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                {{ rec.packageCount }} Adet
              </td>
              <td class="px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatCurrency(rec.totalAmount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="py-10 text-center text-xs text-slate-400">
        Henüz sisteme girilmiş teslimat kaydı bulunmuyor.
      </div>
    </BaseCard>
  </div>
</template>
