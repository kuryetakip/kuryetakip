<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const { toasts, remove } = useToast()

const getIcon = (type?: string) => {
  switch (type) {
    case 'success':
      return CheckCircle2
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    default:
      return Info
  }
}

const getTypeClasses = (type?: string) => {
  switch (type) {
    case 'success':
      return 'border-emerald-200 bg-white text-slate-800'
    case 'error':
      return 'border-red-200 bg-white text-slate-800'
    case 'warning':
      return 'border-amber-200 bg-white text-slate-800'
    default:
      return 'border-slate-200 bg-white text-slate-800'
  }
}

const getIconClasses = (type?: string) => {
  switch (type) {
    case 'success':
      return 'text-emerald-600 bg-emerald-50'
    case 'error':
      return 'text-red-600 bg-red-50'
    case 'warning':
      return 'text-amber-600 bg-amber-50'
    default:
      return 'text-slate-600 bg-slate-100'
  }
}
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="transform translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform opacity-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-sm',
          getTypeClasses(toast.type)
        ]"
      >
        <div :class="['p-1 rounded-md shrink-0 mt-0.5', getIconClasses(toast.type)]">
          <component :is="getIcon(toast.type)" class="w-4 h-4" />
        </div>

        <div class="flex-1 min-w-0">
          <h4 v-if="toast.title" class="text-xs font-semibold text-slate-900 mb-0.5">
            {{ toast.title }}
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed break-words">
            {{ toast.message }}
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
          @click="remove(toast.id)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
