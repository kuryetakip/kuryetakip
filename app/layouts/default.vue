<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  FileText,
  TrendingUp,
  Settings,
  Menu,
  Bike,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Command
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const isMobileMenuOpen = ref(false)
const isCommandPaletteOpen = ref(false)
const isCollapsed = ref(false)
const { user, logout } = useAuth()

// Load sidebar collapse preference
onMounted(() => {
  if (import.meta.client) {
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved !== null) {
      isCollapsed.value = saved === 'true'
    }

    // Global keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
    window.addEventListener('keydown', handleGlobalKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleGlobalKeydown)
  }
})

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  if (import.meta.client) {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
  }
}

// Grouped navigation matching existing routes exactly
const navigationGroups = [
  {
    title: 'OPERASYON',
    items: [
      {
        name: 'Operasyon Merkezi',
        path: '/',
        icon: LayoutDashboard,
        badge: 'Canlı',
        description: 'Genel operasyon ve KPI paneli'
      },
      {
        name: 'Paket Kayıtları',
        path: '/deliveries',
        icon: Package,
        description: 'Tüm teslimat ve paket hareketleri'
      }
    ]
  },
  {
    title: 'YÖNETİM',
    items: [
      {
        name: 'Kuryeler',
        path: '/couriers',
        icon: Users,
        description: 'Kurye profilleri ve avans takibi'
      },
      {
        name: 'Mekanlar',
        path: '/venues',
        icon: Store,
        description: 'İç / dış fiyatlar ve paketler'
      }
    ]
  },
  {
    title: 'FİNANS & RAPOR',
    items: [
      {
        name: 'Hakediş & Raporlar',
        path: '/reports',
        icon: FileText,
        description: 'Dönemsel hakediş ve mutabakat'
      },
      {
        name: 'Para Girişleri',
        path: '/kazanclar',
        icon: TrendingUp,
        description: 'Tahsilat ve gelir akışı'
      }
    ]
  },
  {
    title: 'SİSTEM',
    items: [
      {
        name: 'Ayarlar',
        path: '/settings',
        icon: Settings,
        description: 'Kullanıcı ve sistem yapılandırması'
      }
    ]
  }
]

// Flat list for mobile bottom navigation
const mobileNavItems = [
  { name: 'Operasyon', path: '/', icon: LayoutDashboard },
  { name: 'Paketler', path: '/deliveries', icon: Package },
  { name: 'Kuryeler', path: '/couriers', icon: Users },
  { name: 'Mekanlar', path: '/venues', icon: Store },
  { name: 'Raporlar', path: '/reports', icon: FileText }
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const currentBreadcrumb = computed(() => {
  const p = route.path
  if (p === '/') return 'Operasyon Merkezi'
  if (p.startsWith('/deliveries')) return 'Paket Kayıtları'
  if (p.startsWith('/couriers')) return 'Kurye Yönetimi'
  if (p.startsWith('/venues')) return 'Mekan Yönetimi'
  if (p.startsWith('/reports')) return 'Hakediş & Raporlar'
  if (p.startsWith('/kazanclar')) return 'Para Girişleri & Kazançlar'
  if (p.startsWith('/settings')) return 'Sistem Ayarları'
  return 'Genel Bakış'
})

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased text-slate-900 dark:text-slate-100 transition-colors duration-150">
    <!-- Global Toast Container -->
    <BaseToast />

    <!-- Global Command Palette Modal (Ctrl+K) -->
    <CommandPaletteModal v-model="isCommandPaletteOpen" />

    <!-- Topbar Header -->
    <header class="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 h-14 flex items-center justify-between transition-colors duration-150">
      <div class="flex items-center gap-3">
        <!-- Mobile Drawer Toggle -->
        <button
          type="button"
          class="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Menüyü Aç"
          @click="isMobileMenuOpen = true"
        >
          <Menu class="w-5 h-5" />
        </button>

        <!-- Brand Logo (Visible on mobile or when collapsed) -->
        <NuxtLink to="/" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-slate-800 dark:group-hover:bg-emerald-500 transition-colors shrink-0">
            <Bike class="w-4 h-4 text-emerald-400 dark:text-white" />
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
              KuryeTakip
            </span>
            <span class="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:inline">
              Operasyon Yönetim Sistemi
            </span>
          </div>
        </NuxtLink>

        <!-- Breadcrumb (Desktop) -->
        <div class="hidden md:flex items-center gap-2 pl-4 ml-4 border-l border-slate-200 dark:border-slate-800 text-xs">
          <span class="text-slate-400 dark:text-slate-500 font-medium">Panel</span>
          <span class="text-slate-300 dark:text-slate-700">/</span>
          <span class="text-slate-800 dark:text-slate-200 font-semibold">{{ currentBreadcrumb }}</span>
        </div>
      </div>

      <!-- Header Center/Right Actions -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Global Search / Command Bar Trigger -->
        <button
          type="button"
          class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 text-xs transition-colors border border-slate-200/60 dark:border-slate-700/60"
          title="Hızlı Arama ve Komut Paleti (Ctrl+K)"
          @click="isCommandPaletteOpen = true"
        >
          <Search class="w-3.5 h-3.5 text-slate-400" />
          <span class="text-slate-600 dark:text-slate-300">Ara veya komut yaz...</span>
          <kbd class="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-400">Ctrl K</kbd>
        </button>

        <!-- Live Operations Status Pill -->
        <div class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Canlı Sistem</span>
        </div>

        <!-- Theme Selector -->
        <ThemeSelector />

        <!-- User Profile Pill -->
        <div v-if="user" class="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div class="w-7 h-7 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {{ user.name ? user.name[0] : 'A' }}
          </div>
          <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline truncate max-w-[120px]">
            {{ user.name || user.username }}
          </span>
          <button
            type="button"
            title="Oturumu Kapat"
            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <div class="flex-1 flex">
      <!-- Desktop Sidebar -->
      <aside
        :class="[
          'hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-3 shrink-0 justify-between transition-all duration-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto',
          isCollapsed ? 'w-20' : 'w-64'
        ]"
      >
        <!-- Nav Sections -->
        <div class="space-y-5">
          <div
            v-for="group in navigationGroups"
            :key="group.title"
            class="space-y-1"
          >
            <div
              v-if="!isCollapsed"
              class="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {{ group.title }}
            </div>
            <div v-else class="h-1 border-b border-slate-100 dark:border-slate-800 my-1" />

            <NuxtLink
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              :title="isCollapsed ? item.name : undefined"
              :class="[
                'flex items-center rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 group relative',
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
                isActive(item.path)
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              ]"
            >
              <component
                :is="item.icon"
                :class="[
                  'shrink-0 transition-colors',
                  isCollapsed ? 'w-5 h-5' : 'w-4 h-4',
                  isActive(item.path)
                    ? 'text-white'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                ]"
              />

              <div v-if="!isCollapsed" class="flex items-center justify-between flex-1 min-w-0">
                <span class="truncate">{{ item.name }}</span>
                <span
                  v-if="item.badge"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                >
                  {{ item.badge }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Sidebar Bottom: Collapse Toggle & User Box -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <!-- Collapse Toggle Button -->
          <button
            type="button"
            class="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
            :title="isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'"
            @click="toggleSidebar"
          >
            <ChevronRight v-if="isCollapsed" class="w-4 h-4" />
            <div v-else class="flex items-center justify-between w-full px-1">
              <span class="text-xs text-slate-500 font-medium">Menüyü Daralt</span>
              <ChevronLeft class="w-4 h-4" />
            </div>
          </button>

          <!-- User Card (when expanded) -->
          <div
            v-if="!isCollapsed && user"
            class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-full bg-slate-800 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {{ user.name ? user.name[0] : 'A' }}
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{{ user.name || user.username }}</div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Çevrimiçi</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              title="Çıkış Yap"
              class="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              @click="handleLogout"
            >
              <LogOut class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Mobile Navigation Drawer -->
      <BaseDrawer
        v-model="isMobileMenuOpen"
        title="Operasyon Menüsü"
        position="left"
        width="sm"
      >
        <div class="flex flex-col h-full justify-between">
          <div class="space-y-4">
            <div
              v-for="group in navigationGroups"
              :key="`mob-${group.title}`"
              class="space-y-1"
            >
              <div class="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {{ group.title }}
              </div>

              <NuxtLink
                v-for="item in group.items"
                :key="`mob-${item.path}`"
                :to="item.path"
                :class="[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                ]"
                @click="isMobileMenuOpen = false"
              >
                <component
                  :is="item.icon"
                  :class="[
                    'w-4 h-4 shrink-0',
                    isActive(item.path) ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                  ]"
                />
                <span>{{ item.name }}</span>
              </NuxtLink>
            </div>
          </div>

          <div v-if="user" class="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 space-y-3">
            <div class="flex items-center gap-3 px-2">
              <div class="w-8 h-8 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                {{ user.name ? user.name[0] : 'A' }}
              </div>
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100">{{ user.name || user.username }}</div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400">{{ user.email }}</div>
              </div>
            </div>

            <BaseButton
              variant="outline"
              size="sm"
              class="w-full text-rose-600 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-900/60"
              @click="handleLogout"
            >
              <template #leading>
                <LogOut class="w-3.5 h-3.5" />
              </template>
              Çıkış Yap
            </BaseButton>
          </div>
        </div>
      </BaseDrawer>

      <!-- Main Page Content Area -->
      <main class="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar (Thumb friendly) -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-2 py-1 flex items-center justify-around shadow-lg transition-colors duration-150">
      <NuxtLink
        v-for="item in mobileNavItems"
        :key="`bottom-${item.path}`"
        :to="item.path"
        :class="[
          'flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-all min-w-[56px] min-h-[48px]',
          isActive(item.path)
            ? 'text-slate-900 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-slate-800'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <component
          :is="item.icon"
          :class="[
            'w-4 h-4 mb-0.5 transition-colors',
            isActive(item.path) ? 'text-slate-900 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
          ]"
        />
        <span class="truncate max-w-[64px] leading-tight">{{ item.name }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
