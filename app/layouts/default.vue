<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Store,
  Users,
  Package,
  FileText,
  Settings,
  Menu,
  X,
  Bike,
  LogOut,
  User as UserIcon
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const isMobileMenuOpen = ref(false)
const { user, logout } = useAuth()

const navigationItems = [
  {
    name: 'Mekanlar',
    path: '/venues',
    icon: Store,
    description: 'İç / dış fiyat tanımları'
  },
  {
    name: 'Kuryeler',
    path: '/couriers',
    icon: Users,
    description: 'Kurye & özel mekan fiyatları'
  },
  {
    name: 'Paket Kayıtları',
    path: '/deliveries',
    icon: Package,
    description: 'Günlük paket girişleri'
  },
  {
    name: 'Raporlar',
    path: '/reports',
    icon: FileText,
    description: 'Hakediş & dökümler'
  },
  {
    name: 'Ayarlar',
    path: '/settings',
    icon: Settings,
    description: 'Uygulama ayarları'
  }
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <!-- Base Toast Container -->
    <BaseToast />

    <!-- Top Header (Mobile & Desktop) -->
    <header class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 h-14 flex items-center justify-between transition-colors duration-200">
      <div class="flex items-center gap-3">
        <!-- Mobile menu toggle -->
        <button
          type="button"
          class="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Menüyü aç"
          @click="isMobileMenuOpen = true"
        >
          <Menu class="w-5 h-5" />
        </button>

        <!-- Brand Logo -->
        <NuxtLink to="/deliveries" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-slate-800 dark:group-hover:bg-emerald-500 transition-colors">
            <Bike class="w-4 h-4 text-emerald-400 dark:text-white" />
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
              KuryeTakip
            </span>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-0.5">
              Hakediş & Operasyon
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Header Right Meta, Theme Switcher & User Menu -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        <!-- Theme Selector in Header -->
        <ThemeSelector />

        <span class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Operasyon Aktif
        </span>

        <div v-if="user" class="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div class="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-800 text-white dark:text-emerald-400 border border-transparent dark:border-slate-700 flex items-center justify-center font-bold text-xs uppercase">
            {{ user.name ? user.name[0] : 'A' }}
          </div>
          <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden md:inline">
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
      <aside class="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 shrink-0 justify-between transition-colors duration-200">
        <nav class="space-y-1">
          <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Ana Menü
          </div>

          <NuxtLink
            v-for="item in navigationItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 group',
              isActive(item.path)
                ? 'bg-slate-900 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
            ]"
          >
            <component
              :is="item.icon"
              :class="[
                'w-4 h-4 shrink-0 transition-colors',
                isActive(item.path)
                  ? 'text-white'
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
              ]"
            />
            <div class="flex flex-col min-w-0">
              <span class="truncate leading-tight">{{ item.name }}</span>
            </div>
          </NuxtLink>
        </nav>

        <!-- Sidebar Footer Status & User -->
        <div class="space-y-2">
          <div v-if="user" class="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {{ user.name ? user.name[0] : 'A' }}
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{{ user.name || user.username }}</div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 truncate">{{ user.email }}</div>
              </div>
            </div>
            <button
              type="button"
              title="Çıkış Yap"
              class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              @click="handleLogout"
            >
              <LogOut class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] flex items-center justify-between">
            <span class="font-medium text-slate-700 dark:text-slate-300">KuryeTakip</span>
            <span class="text-slate-400 dark:text-slate-500">v1.0.0</span>
          </div>
        </div>
      </aside>

      <!-- Mobile Navigation Drawer -->
      <BaseDrawer
        v-model="isMobileMenuOpen"
        title="Menü"
        position="left"
        width="sm"
      >
        <div class="flex flex-col h-full justify-between">
          <nav class="space-y-1">
            <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Ana Menü
            </div>

            <NuxtLink
              v-for="item in navigationItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
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
          </nav>

          <div v-if="user" class="pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 space-y-3">
            <div class="flex items-center gap-3 px-2">
              <div class="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase">
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
              class="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-900/60 dark:hover:bg-rose-950/40"
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

    <!-- Mobile Bottom Navigation Bar (Mobile-first responsive design) -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-around shadow-lg transition-colors duration-200">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all min-w-[56px] min-h-[50px]',
          isActive(item.path)
            ? 'text-slate-900 dark:text-emerald-400 font-bold bg-slate-100/90 dark:bg-slate-800/90 shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
        ]"
      >
        <component
          :is="item.icon"
          :class="[
            'w-5 h-5 mb-0.5 transition-colors',
            isActive(item.path) ? 'text-slate-900 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'
          ]"
        />
        <span class="truncate max-w-[68px] leading-tight">{{ item.name === 'Paket Kayıtları' ? 'Paketler' : item.name }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
