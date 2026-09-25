<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  TrendingUp,
  Calendar,
  Search,
  Filter,
  DollarSign
} from 'lucide-vue-next'

useHead({
  title: 'Kazanç ve Para Girişleri Raporu — KuryeTakip'
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
      transactions.value = res.data.transactions
      totalAmount.value = res.data.totalAmount
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(() => {
  fetchCouriers()
  fetchReport()
})

const columns = [
  { key: 'date', label: 'Tarih' },
  { key: 'courier.name', label: 'Kurye' },
  { key: 'amount', label: 'Tutar (₺)', align: 'right' as const },
  { key: 'description', label: 'Açıklama' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <TrendingUp class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>Para Girişleri ve Kazançlar</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kuryelerden alınan tahsilat ve kazanç kayıtlarını gün, hafta veya ay bazında raporlayın.
        </p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <BaseCard no-padding class="p-5 flex flex-col justify-center items-center bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50">
        <DollarSign class="w-8 h-8 text-blue-500 mb-2" />
        <div class="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">
          Toplam Para Girişi
        </div>
        <div class="text-3xl font-bold text-blue-700 dark:text-blue-400 font-mono">
          {{ totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
        </div>
      </BaseCard>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Rapor Periyodu
          </label>
          <select
            v-model="filterType"
            @change="fetchReport"
            class="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
          >
            <option value="daily">Bugün</option>
            <option value="weekly">Bu Hafta</option>
            <option value="monthly">Bu Ay</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Kurye Filtresi
          </label>
          <select
            v-model="courierId"
            @change="fetchReport"
            class="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
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
      >
        <template #default>
          <tr v-if="transactions.length === 0" class="hover:bg-transparent">
            <td colspan="4" class="px-4 py-8 text-center text-slate-500 text-sm">
              Bu kriterlere uygun para girişi bulunamadı.
            </td>
          </tr>
          <tr v-for="t in transactions" :key="t.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
            <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
              {{ formatDate(t.date) }}
            </td>
            <td class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ t.courier?.name }}
            </td>
            <td class="px-4 py-3 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {{ Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
            </td>
            <td class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              {{ t.description || '-' }}
            </td>
          </tr>
        </template>
      </BaseTable>
    </div>
  </div>
</template>
