<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  title?: string
  position?: 'left' | 'right'
  width?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  position: 'left',
  width: 'md'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

watch(() => props.modelValue, (isOpen) => {
  if (import.meta.client) {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeyDown)
    document.body.style.overflow = ''
  }
})

const widthClasses = computed(() => {
  switch (props.width) {
    case 'sm':
      return 'max-w-xs'
    case 'lg':
      return 'max-w-md'
    case 'md':
    default:
      return 'max-w-sm'
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 overflow-hidden">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        @click="close"
      />

      <div
        class="fixed inset-y-0 flex max-w-full"
        :class="position === 'right' ? 'right-0 pl-10' : 'left-0 pr-10'"
      >
        <div
          class="w-screen bg-white dark:bg-slate-900 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800"
          :class="widthClasses"
        >
          <!-- Header -->
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ title }}
            </h3>
            <button
              type="button"
              aria-label="Menüyü Kapat"
              class="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="relative flex-1 overflow-y-auto p-5">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
