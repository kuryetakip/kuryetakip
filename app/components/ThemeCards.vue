<script setup lang="ts">
import { Sun, Moon, Laptop, CheckCircle2 } from 'lucide-vue-next'
import { useTheme, type ThemeMode } from '~/composables/useTheme'

const { themePreference, isDark, setTheme } = useTheme()

const themes: {
  mode: ThemeMode
  title: string
  description: string
  icon: any
  badge: string
}[] = [
  {
    mode: 'light',
    title: 'Açık Tema (Light)',
    description: 'Aydınlık, ferah ve yüksek kontrastlı beyaz arayüz tasarımı.',
    icon: Sun,
    badge: 'Gündüz Modu'
  },
  {
    mode: 'dark',
    title: 'Koyu Tema (Dark)',
    description: 'Gözü yormayan derin koyu yüzeyler ve canlı vurgular.',
    icon: Moon,
    badge: 'Gece Modu'
  },
  {
    mode: 'system',
    title: 'Sistem Tercihi (Auto)',
    description: 'Cihazınızın işletim sistemi temasına otomatik uyum sağlar.',
    icon: Laptop,
    badge: 'Otomatik'
  }
]
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div
      v-for="item in themes"
      :key="item.mode"
      :class="[
        'relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between group',
        themePreference === item.mode
          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-sm'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      ]"
      @click="setTheme(item.mode)"
    >
      <div>
        <!-- Top Icon & Status -->
        <div class="flex items-center justify-between mb-3">
          <div
            :class="[
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              themePreference === item.mode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
          </div>

          <div
            v-if="themePreference === item.mode"
            class="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>Aktif</span>
          </div>
          <span
            v-else
            class="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
          >
            {{ item.badge }}
          </span>
        </div>

        <!-- Title & Description -->
        <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          {{ item.title }}
        </h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {{ item.description }}
        </p>
      </div>

      <!-- Preview Mockup Strip -->
      <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
        <div
          v-if="item.mode === 'light'"
          class="w-full h-4 rounded bg-slate-100 border border-slate-200 flex items-center px-1 gap-1"
        >
          <div class="w-2 h-2 rounded-full bg-slate-400" />
          <div class="w-8 h-1.5 rounded bg-slate-300" />
          <div class="w-4 h-1.5 rounded bg-emerald-500 ml-auto" />
        </div>
        <div
          v-else-if="item.mode === 'dark'"
          class="w-full h-4 rounded bg-slate-950 border border-slate-800 flex items-center px-1 gap-1"
        >
          <div class="w-2 h-2 rounded-full bg-emerald-400" />
          <div class="w-8 h-1.5 rounded bg-slate-700" />
          <div class="w-4 h-1.5 rounded bg-emerald-600 ml-auto" />
        </div>
        <div
          v-else
          class="w-full h-4 rounded bg-linear-to-r from-slate-100 to-slate-950 border border-slate-300 dark:border-slate-700 flex items-center px-1 justify-between text-[8px] font-mono text-slate-500 dark:text-slate-400"
        >
          <span>AUTO</span>
          <span>⚡</span>
        </div>
      </div>
    </div>
  </div>
</template>
