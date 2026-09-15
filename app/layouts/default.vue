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
  <div class="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
    <!-- Base Toast Container -->
    <BaseToast />

    <!-- Top Header (Mobile & Desktop) -->
    <header class="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-6 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Mobile menu toggle -->
        <button
          type="button"
          class="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
          aria-label="Menüyü aç"
          @click="isMobileMenuOpen = true"
        >
          <Menu class="w-5 h-5" />
        </button>

        <!-- Brand Logo -->
        <NuxtLink to="/deliveries" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-slate-800 transition-colors">
            <Bike class="w-4 h-4 text-emerald-400" />
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold tracking-tight text-slate-900 leading-none">
              KuryeTakip
            </span>
            <span class="text-[10px] text-slate-500 font-medium tracking-normal mt-0.5">
              Hakediş & Operasyon
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Header Right Meta & User Menu -->
      <div class="flex items-center gap-3">
        <span class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Operasyon Aktif
        </span>

        <div v-if="user" class="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div class="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
            {{ user.name ? user.name[0] : 'A' }}
          </div>
          <span class="text-xs font-semibold text-slate-800 hidden md:inline">
            {{ user.name || user.username }}
          </span>
          <button
            type="button"
            title="Oturumu Kapat"
            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <div class="flex-1 flex">
      <!-- Desktop Sidebar -->
      <aside class="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200/80 p-4 shrink-0 justify-between">
        <nav class="space-y-1">
          <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Ana Menü
          </div>

          <NuxtLink
            v-for="item in navigationItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 group',
              isActive(item.path)
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            ]"
          >
            <component
              :is="item.icon"
              :class="[
                'w-4 h-4 shrink-0 transition-colors',
                isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
              ]"
            />
            <div class="flex flex-col min-w-0">
              <span class="truncate leading-tight">{{ item.name }}</span>
            </div>
          </NuxtLink>
        </nav>

        <!-- Sidebar Footer Status & User -->
        <div class="space-y-2">
          <div v-if="user" class="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {{ user.name ? user.name[0] : 'A' }}
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 truncate">{{ user.name || user.username }}</div>
                <div class="text-[10px] text-slate-400 truncate">{{ user.email }}</div>
              </div>
            </div>
            <button
              type="button"
              title="Çıkış Yap"
              class="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              @click="handleLogout"
            >
              <LogOut class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-500 text-[10px] flex items-center justify-between">
            <span class="font-medium text-slate-700">KuryeTakip</span>
            <span class="text-slate-400">v1.0.0</span>
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
            <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Ana Menü
            </div>

            <NuxtLink
              v-for="item in navigationItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              ]"
              @click="isMobileMenuOpen = false"
            >
              <component
                :is="item.icon"
                :class="[
                  'w-4 h-4 shrink-0',
                  isActive(item.path) ? 'text-white' : 'text-slate-400'
                ]"
              />
              <span>{{ item.name }}</span>
            </NuxtLink>
          </nav>

          <div v-if="user" class="pt-4 border-t border-slate-200 mt-6 space-y-3">
            <div class="flex items-center gap-3 px-2">
              <div class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                {{ user.name ? user.name[0] : 'A' }}
              </div>
              <div>
                <div class="text-xs font-bold text-slate-900">{{ user.name || user.username }}</div>
                <div class="text-[10px] text-slate-500">{{ user.email }}</div>
              </div>
            </div>

            <BaseButton
              variant="outline"
              size="sm"
              class="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
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
      <main class="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <slot />
      </main>
    </div>
  </div>
</template>
