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
    <Transition
      enter-active-class="transition-opacity duration-250 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 overflow-hidden">
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
          @click="close"
        />

        <div
          class="fixed inset-y-0 flex max-w-full"
          :class="position === 'right' ? 'right-0 pl-10' : 'left-0 pr-10'"
        >
          <Transition
            enter-active-class="transition duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
            :enter-from-class="position === 'right' ? 'translate-x-full' : '-translate-x-full'"
            enter-to-class="translate-x-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="translate-x-0"
            :leave-to-class="position === 'right' ? 'translate-x-full' : '-translate-x-full'"
          >
            <div
              v-if="modelValue"
              class="w-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 border-slate-200/80 dark:border-slate-800/80"
              :class="[
                widthClasses,
                position === 'right' ? 'border-l' : 'border-r'
              ]"
            >
              <!-- Header -->
              <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70">
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {{ title }}
                </h3>
                <button
                  type="button"
                  aria-label="Menüyü Kapat"
                  class="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              <div v-if="$slots.footer" class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
