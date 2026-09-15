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
  <div class="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-150">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs sm:text-sm">
        <thead class="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 select-none whitespace-nowrap text-xs',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
              ]"
              :style="col.width ? { width: col.width } : {}"
            >
              {{ col.label }}
            </th>
            <th v-if="$slots.actions" class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right text-xs whitespace-nowrap">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
          <tr v-if="loading">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center">
              <BaseLoading message="Veriler yükleniyor..." />
            </td>
          </tr>
          <tr v-else-if="empty">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
              <slot name="empty">
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ emptyMessage }}</p>
              </slot>
            </td>
          </tr>
          <slot v-else />
        </tbody>
      </table>
    </div>

    <div v-if="$slots.footer" class="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300">
      <slot name="footer" />
    </div>
  </div>
</template>
