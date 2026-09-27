<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  LayoutDashboard,
  Users,
  Store,
  Package,
  FileText,
  TrendingUp,
  Settings,
  Plus,
  ArrowRight,
  X
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()
const searchInput = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

const items = [
  {
    category: 'Sayfalar',
    title: 'Operasyon Merkezi',
    description: 'Canlı operasyon durumu, KPI metrikleri ve son teslimatlar',
    icon: LayoutDashboard,
    action: () => router.push('/')
  },
  {
    category: 'Sayfalar',
    title: 'Paket Kayıtları',
    description: 'Günlük teslimat kayıtları, arama ve filtreleme',
    icon: Package,
    action: () => router.push('/deliveries')
  },
  {
    category: 'Sayfalar',
    title: 'Kurye Yönetimi',
    description: 'Kurye listesi, hakediş hesapları ve avans takibi',
    icon: Users,
    action: () => router.push('/couriers')
  },
  {
    category: 'Sayfalar',
    title: 'Mekan Yönetimi',
    description: 'Restoran ve işletme fiyatlandırma, haftalık sıfırlanan döküm',
    icon: Store,
    action: () => router.push('/venues')
  },
  {
    category: 'Sayfalar',
    title: 'Hakediş & Raporlar',
    description: 'Dönemsel hakediş, WhatsApp ve PDF dökümleri',
    icon: FileText,
    action: () => router.push('/reports')
  },
  {
    category: 'Sayfalar',
    title: 'Para Girişleri & Kazançlar',
    description: 'Tahsilat ve finansal gelir dökümü',
    icon: TrendingUp,
    action: () => router.push('/kazanclar')
  },
  {
    category: 'Sayfalar',
    title: 'Sistem Ayarları',
    description: 'Kullanıcı profili, güvenlik ve sistem yapılandırması',
    icon: Settings,
    action: () => router.push('/settings')
  },
  {
    category: 'Hızlı İşlemler',
    title: 'Hızlı Paket Kaydı Ekle',
    description: 'Yeni teslimat girişi ekranına git',
    icon: Plus,
    action: () => router.push('/deliveries')
  },
  {
    category: 'Hızlı İşlemler',
    title: 'Yeni Kurye Tanımla',
    description: 'Kurye ekleme sayfasına git',
    icon: Users,
    action: () => router.push('/couriers')
  },
  {
    category: 'Hızlı İşlemler',
    title: 'Yeni Mekan Ekle',
    description: 'Mekan ekleme ve fiyatlandırma ekranına git',
    icon: Store,
    action: () => router.push('/venues')
  }
]

const filteredItems = computed(() => {
  if (!searchInput.value.trim()) return items
  const query = searchInput.value.toLowerCase().trim()
  return items.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  )
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    searchInput.value = ''
    selectedIndex.value = 0
    setTimeout(() => {
      searchInputRef.value?.focus()
    }, 50)
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const selectItem = (index: number) => {
  const item = filteredItems.value[index]
  if (item) {
    item.action()
    close()
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  if (!props.modelValue) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    selectItem(selectedIndex.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeyDown)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24"
      @click="close"
    >
      <div
        class="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200"
        @click.stop
      >
        <!-- Search Input -->
        <div class="relative flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search class="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref="searchInputRef"
            v-model="searchInput"
            type="text"
            placeholder="Sayfa veya işlem ara... (Örn: Kuryeler, Raporlar)"
            class="w-full pl-3 pr-8 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
            @click="close"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Search Results List -->
        <div class="max-h-80 overflow-y-auto p-2 space-y-1">
          <div
            v-for="(item, idx) in filteredItems"
            :key="`${item.category}-${item.title}`"
            :class="[
              'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-100 text-xs sm:text-sm',
              idx === selectedIndex
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
            ]"
            @click="selectItem(idx)"
            @mouseenter="selectedIndex = idx"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  idx === selectedIndex
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                ]"
              >
                <component :is="item.icon" class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <div class="font-semibold leading-tight flex items-center gap-2">
                  <span>{{ item.title }}</span>
                  <span
                    :class="[
                      'text-[10px] px-1.5 py-0.2 rounded font-normal',
                      idx === selectedIndex
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    ]"
                  >
                    {{ item.category }}
                  </span>
                </div>
                <div
                  :class="[
                    'text-[11px] truncate mt-0.5',
                    idx === selectedIndex ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                  ]"
                >
                  {{ item.description }}
                </div>
              </div>
            </div>

            <ArrowRight
              :class="[
                'w-4 h-4 shrink-0 transition-transform',
                idx === selectedIndex ? 'translate-x-0.5 opacity-100' : 'opacity-0'
              ]"
            />
          </div>

          <div v-if="filteredItems.length === 0" class="py-10 text-center text-xs text-slate-400">
            Aramanıza uygun sonuç bulunamadı.
          </div>
        </div>

        <!-- Footer Shortcuts -->
        <div class="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div class="flex items-center gap-3">
            <span><kbd class="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑↓</kbd> Gezin</span>
            <span><kbd class="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Enter</kbd> Seç</span>
            <span><kbd class="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Esc</kbd> Kapat</span>
          </div>
          <span class="font-mono text-[10px] text-slate-500">KuryeTakip v2.4</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
