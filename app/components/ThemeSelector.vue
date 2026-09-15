<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Sun, Moon, Laptop, ChevronDown, Check } from 'lucide-vue-next'
import { useTheme, type ThemeMode } from '~/composables/useTheme'

interface Props {
  compact?: boolean
}

defineProps<Props>()

const { themePreference, isDark, setTheme } = useTheme()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const options: { mode: ThemeMode; label: string; icon: any }[] = [
  { mode: 'light', label: 'Açık Tema', icon: Sun },
  { mode: 'dark', label: 'Koyu Tema', icon: Moon },
  { mode: 'system', label: 'Sistem', icon: Laptop }
]

const handleSelect = (mode: ThemeMode) => {
  setTheme(mode)
  isOpen.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div ref="dropdownRef" class="relative inline-block text-left">
    <!-- Trigger Button -->
    <button
      type="button"
      :class="[
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border',
        'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs',
        'dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700',
        isOpen ? 'ring-2 ring-emerald-500/20 dark:ring-emerald-500/30' : ''
      ]"
      :title="`Tema: ${themePreference === 'dark' ? 'Koyu' : themePreference === 'light' ? 'Açık' : 'Sistem'}`"
      aria-label="Tema Seçimi"
      @click="isOpen = !isOpen"
    >
      <span class="flex items-center justify-center w-4 h-4 text-emerald-600 dark:text-emerald-400">
        <Sun v-if="themePreference === 'light'" class="w-3.5 h-3.5 animate-spin-slow" />
        <Moon v-else-if="themePreference === 'dark'" class="w-3.5 h-3.5" />
        <Laptop v-else class="w-3.5 h-3.5" />
      </span>

      <span v-if="!compact" class="text-xs font-medium hidden md:inline">
        {{ themePreference === 'dark' ? 'Koyu' : themePreference === 'light' ? 'Açık' : 'Sistem' }}
      </span>

      <ChevronDown :class="['w-3 h-3 text-slate-400 transition-transform duration-150', isOpen ? 'rotate-180' : '']" />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-1.5 w-36 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-lg py-1 z-50 overflow-hidden text-xs"
      >
        <button
          v-for="opt in options"
          :key="opt.mode"
          type="button"
          :class="[
            'w-full flex items-center justify-between px-3 py-2 text-left transition-colors font-medium',
            themePreference === opt.mode
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          ]"
          @click="handleSelect(opt.mode)"
        >
          <div class="flex items-center gap-2">
            <component
              :is="opt.icon"
              :class="[
                'w-3.5 h-3.5',
                themePreference === opt.mode ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
              ]"
            />
            <span>{{ opt.label }}</span>
          </div>

          <Check v-if="themePreference === opt.mode" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </button>
      </div>
    </Transition>
  </div>
</template>
