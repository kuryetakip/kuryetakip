<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string | number | null
  options?: Option[]
  label?: string
  id?: string
  name?: string
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
  placeholder: 'Seçiniz...',
  required: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', event: Event): void
}>()

const selectId = props.id || `select-${Math.random().toString(36).substring(2, 9)}`

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
  emit('change', event)
}
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label
      v-if="label"
      :for="selectId"
      class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
    >
      <span>
        {{ label }}
        <span v-if="required" class="text-rose-500 ml-0.5">*</span>
      </span>
      <slot name="label-trailing" />
    </label>

    <div class="relative rounded-lg shadow-sm">
      <div
        v-if="$slots.leading"
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"
      >
        <slot name="leading" />
      </div>

      <select
        :id="selectId"
        :name="name"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :class="[
          'block w-full appearance-none rounded-lg border text-xs sm:text-sm transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          $slots.leading ? 'pl-9' : 'pl-3.5',
          'pr-9 py-2 bg-white dark:bg-slate-900',
          error
            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20 dark:border-rose-800 dark:text-rose-200 dark:bg-rose-950/20 dark:focus:ring-rose-950'
            : 'border-slate-300 text-slate-900 hover:border-slate-400 focus:border-slate-800 focus:ring-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-emerald-500 dark:focus:ring-emerald-950',
          disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-75 dark:bg-slate-800 dark:text-slate-500' : ''
        ]"
        @change="onChange"
      >
        <option v-if="placeholder" value="" disabled :selected="!modelValue" class="dark:bg-slate-900 dark:text-slate-400">
          {{ placeholder }}
        </option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.disabled"
          class="dark:bg-slate-900 dark:text-slate-100"
        >
          {{ opt.label }}
        </option>
        <slot />
      </select>

      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
        <ChevronDown class="w-4 h-4" />
      </div>
    </div>

    <p v-if="error" class="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
      {{ hint }}
    </p>
  </div>
</template>
