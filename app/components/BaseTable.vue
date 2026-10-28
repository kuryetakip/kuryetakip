<script setup lang="ts">
interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface Props {
  columns?: Column[]
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
  columns: () => [],
  loading: false,
  empty: false,
  emptyMessage: 'Kayıt bulunamadı.'
})
</script>

<template>
  <div class="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden transition-all duration-200">
    <div class="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 opacity-80" />
    <div class="overflow-x-auto relative scrollbar-thin">
      <table class="w-full text-left border-collapse text-xs sm:text-sm">
        <thead class="bg-slate-50/95 dark:bg-slate-850/95 border-b border-slate-200/90 dark:border-slate-800 backdrop-blur-md">
          <tr>
            <th
              v-for="(col, idx) in columns"
              :key="col.key"
              :class="[
                'px-3.5 sm:px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 select-none whitespace-nowrap text-[11px] uppercase tracking-wider',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                idx === 0 ? 'sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-850/95 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]' : ''
              ]"
              :style="col.width ? { width: col.width } : {}"
            >
              {{ col.label }}
            </th>
            <th v-if="$slots.actions" class="px-3.5 sm:px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-right text-[11px] uppercase tracking-wider whitespace-nowrap">
              <slot name="actions">İşlemler</slot>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-900 dark:text-slate-100">
          <tr v-if="loading" v-for="i in 5" :key="`skeleton-${i}`" class="animate-pulse">
            <td
              v-for="(col, idx) in columns"
              :key="`skel-col-${idx}`"
              :class="[
                'px-3.5 sm:px-4 py-4',
                idx === 0 ? 'sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]' : ''
              ]"
            >
              <div
                class="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded"
                :class="idx === 0 ? 'w-3/4' : idx === columns.length - 1 ? 'w-1/2 ml-auto' : 'w-2/3 ml-auto'"
              />
            </td>
            <td v-if="$slots.actions" class="px-3.5 sm:px-4 py-4 text-right">
              <div class="h-4 w-16 bg-slate-200/80 dark:bg-slate-800/80 rounded ml-auto" />
            </td>
          </tr>
          <tr v-else-if="empty">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-16 text-center text-slate-500 dark:text-slate-400">
              <slot name="empty">
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ emptyMessage }}</p>
              </slot>
            </td>
          </tr>
          <slot v-else />
        </tbody>
      </table>
    </div>

    <div v-if="$slots.footer" class="px-4 py-3 bg-slate-50/80 dark:bg-slate-850/80 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300">
      <slot name="footer" />
    </div>
  </div>
</template>
