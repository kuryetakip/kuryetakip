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
  <div class="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-150">
    <div
      v-if="title || description || $slots.header || $slots.action"
      class="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4"
    >
      <div>
        <h3 v-if="title" class="text-sm font-semibold text-slate-900 tracking-tight">
          {{ title }}
        </h3>
        <p v-if="description" class="text-xs text-slate-500 mt-0.5">
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

    <div v-if="$slots.footer" class="px-5 py-3.5 bg-slate-50 border-t border-slate-100">
      <slot name="footer" />
    </div>
  </div>
</template>
