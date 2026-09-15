<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand'
  size?: 'sm' | 'md'
  dot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'md',
  dot: false
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-200/80'
    case 'danger':
      return 'bg-rose-50 text-rose-700 border-rose-200/80'
    case 'brand':
      return 'bg-sky-50 text-sky-700 border-sky-200/80'
    case 'neutral':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
})

const dotClasses = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-emerald-500'
    case 'warning':
      return 'bg-amber-500'
    case 'danger':
      return 'bg-rose-500'
    case 'brand':
      return 'bg-sky-500'
    case 'neutral':
    default:
      return 'bg-slate-400'
  }
})

const sizeClasses = computed(() => {
  return props.size === 'sm'
    ? 'px-2 py-0.5 text-[11px] font-medium gap-1'
    : 'px-2.5 py-1 text-xs font-medium gap-1.5'
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-md border tracking-tight',
      variantClasses,
      sizeClasses
    ]"
  >
    <span
      v-if="dot"
      :class="['w-1.5 h-1.5 rounded-full shrink-0', dotClasses]"
    />
    <slot />
  </span>
</template>
