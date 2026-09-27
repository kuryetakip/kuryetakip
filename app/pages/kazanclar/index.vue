<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  TrendingUp,
  Calendar,
  Search,
  Filter,
  DollarSign,
  Receipt,
  User,
  RefreshCw,
  Wallet
} from 'lucide-vue-next'

useHead({
  title: 'Para Girişleri & Tahsilat — KuryeTakip'
})

const loading = ref(false)
const transactions = ref<any[]>([])
const totalAmount = ref(0)
const filterType = ref<'daily' | 'weekly' | 'monthly'>('daily')
const courierId = ref('')
const couriers = ref<any[]>([])

const fetchCouriers = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: any[] }>('/api/couriers')
    if (res.success) {
      couriers.value = res.data
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchReport = async () => {
  loading.value = true
  try {
    const query: Record<string, string> = {
      type: filterType.value
    }
    if (courierId.value) {
      query.courierId = courierId.value
    }

    const res = await $fetch<{ success: boolean; data: any }>('/api/reports/earnings', { query })
    if (res.success) {
      transactions.value = res.data.transactions || []
      totalAmount.value = res.data.totalAmount || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const setPeriod = (p: 'daily' | 'weekly' | 'monthly') => {
  filterType.value = p
  fetchReport()
}

onMounted(() => {
  fetchCouriers()
  fetchReport()
})

const columns = [
  { key: 'date', label: 'Tarih' },
  { key: 'courier.name', label: 'Kurye' },
  { key: 'amount', label: 'Tutar (₺)', align: 'right' as const },
  { key: 'description', label: 'İşlem Notu' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/90 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200/80 dark:border-blue-800/60 font-mono">
            <Wallet class="w-3.5 h-3.5" />
            FİNANS & TAHSİLAT
          </span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2.5">
          <span>Para Girişleri ve Kazançlar</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Kuryelerden alınan para girişlerini ve kasa tahsilatlarını periyodik olarak takip edin.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <BaseButton
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="fetchReport"
        >
          <template #leading>
            <RefreshCw :class="['w-3.5 h-3.5', loading ? 'animate-spin' : '']" />
          </template>
          Yenile
        </BaseButton>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseCard no-padding class="p-5 flex flex-col justify-between border-l-4 border-l-blue-600 bg-slate-900 dark:bg-slate-900 text-white">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Toplam Para Girişi
          </div>
          <div class="w-8 h-8 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center">
            <DollarSign class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold text-blue-400 font-mono mt-3">
          {{ totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span>Seçili Dönem Toplamı</span>
          <span class="font-mono text-blue-300 font-semibold">{{ transactions.length }} Hareket</span>
        </div>
      </BaseCard>

      <BaseCard no-padding class="p-5 flex flex-col justify-between border-l-4 border-l-emerald-500">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Kayıt Sayısı
          </div>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Receipt class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-3">
          {{ transactions.length }}
          <span class="text-sm font-semibold text-slate-400 font-sans">İşlem</span>
        </div>
        <div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Kasa Hareketleri</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">Tahsilat Kayıtları</span>
        </div>
      </BaseCard>
    </div>

    <!-- Filters Bar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Rapor Periyodu
          </label>
          <div class="inline-flex w-full items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
            <button
              type="button"
              :class="[
                'flex-1 py-1.5 rounded-lg transition-all text-center',
                filterType === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              ]"
              @click="setPeriod('daily')"
            >
              Bugün
            </button>
            <button
              type="button"
              :class="[
                'flex-1 py-1.5 rounded-lg transition-all text-center',
                filterType === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              ]"
              @click="setPeriod('weekly')"
            >
              Bu Hafta
            </button>
            <button
              type="button"
              :class="[
                'flex-1 py-1.5 rounded-lg transition-all text-center',
                filterType === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              ]"
              @click="setPeriod('monthly')"
            >
              Bu Ay
            </button>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Kurye Filtresi
          </label>
          <select
            v-model="courierId"
            class="w-full text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            @change="fetchReport"
          >
            <option value="">Tüm Kuryeler</option>
            <option v-for="c in couriers" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div>
      <BaseTable
        :columns="columns"
        :loading="loading"
        :empty="transactions.length === 0"
        empty-message="Bu kriterlere uygun para girişi veya tahsilat kaydı bulunamadı."
      >
        <template #default>
          <tr
            v-for="t in transactions"
            :key="t.id"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors"
          >
            <td class="px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-mono">
              {{ formatDate(t.entryDate) }}
            </td>
            <td class="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ t.courier?.name || 'Genel Kasa' }}
            </td>
            <td
              class="px-4 py-3 text-xs sm:text-sm text-right font-extrabold font-mono"
              :class="Number(t.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </td>
            <td class="px-4 py-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <span>{{ t.notes || '-' }}</span>
              <span
                v-if="Number(t.amount) < 0"
                class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
              >
                Düzeltme İşlemi
              </span>
            </td>
          </tr>
        </template>
      </BaseTable>
    </div>
  </div>
</template>
