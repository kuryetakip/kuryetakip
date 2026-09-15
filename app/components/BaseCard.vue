<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  noPadding?: boolean
}

withDefaults(defineProps<Props>(), {
  noPadding: false
})
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-150">
    <div
      v-if="title || description || $slots.header || $slots.action"
      class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
    >
      <div>
        <h3 v-if="title" class="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          {{ title }}
        </h3>
        <p v-if="description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {{ description }}
        </p>
        <slot name="header" />
      </div>
      <div v-if="$slots.action" class="shrink-0">
        <slot name="action" />
      </div>
    </div>

    <div :class="noPadding ? '' : 'p-5'">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
      <slot name="footer" />
    </div>
  </div>
</template>
