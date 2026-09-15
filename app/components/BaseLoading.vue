<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

interface Props {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  size: 'md'
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-4 h-4'
    case 'lg':
      return 'w-8 h-8'
    case 'md':
    default:
      return 'w-6 h-6'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2.5 py-6">
    <Loader2 :class="['animate-spin text-slate-800', sizeClasses]" />
    <p v-if="message" class="text-xs text-slate-500 font-medium">
      {{ message }}
    </p>
  </div>
</template>
