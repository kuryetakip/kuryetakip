<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: 'İşlemi Onaylayın',
  message: 'Bu işlemi gerçekleştirmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
  confirmText: 'Onayla',
  cancelText: 'Vazgeç',
  variant: 'danger',
  loading: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const onConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    max-width="sm"
    @update:model-value="(val) => emit('update:modelValue', val)"
    @close="close"
  >
    <div class="flex items-start gap-3.5">
      <div
        :class="[
          'p-2 rounded-full shrink-0',
          variant === 'danger' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        ]"
      >
        <AlertTriangle class="w-5 h-5" />
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {{ title }}
        </h4>
        <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          {{ message }}
        </p>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="outline" size="sm" :disabled="loading" @click="close">
        {{ cancelText }}
      </BaseButton>
      <BaseButton
        :variant="variant"
        size="sm"
        :loading="loading"
        @click="onConfirm"
      >
        {{ confirmText }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
