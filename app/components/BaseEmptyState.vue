<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

interface Props {
  title: string
  description?: string
  actionText?: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-xl border border-dashed border-slate-300">
    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3.5">
      <slot name="icon">
        <Inbox class="w-6 h-6 stroke-[1.5]" />
      </slot>
    </div>

    <h3 class="text-sm font-semibold text-slate-900 mb-1">
      {{ title }}
    </h3>

    <p v-if="description" class="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
      {{ description }}
    </p>

    <div v-if="actionText || $slots.action">
      <slot name="action">
        <BaseButton variant="primary" size="sm" @click="emit('action')">
          {{ actionText }}
        </BaseButton>
      </slot>
    </div>
  </div>
</template>
