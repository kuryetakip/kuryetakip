<script setup lang="ts">
interface Props {
  modelValue?: string | number | null
  label?: string
  id?: string
  name?: string
  type?: string
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  min?: string | number
  max?: string | number
  step?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  readonly: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

const inputId = props.id || `input-${Math.random().toString(36).substring(2, 9)}`

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const val = props.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label
      v-if="label"
      :for="inputId"
      class="text-xs font-semibold text-slate-700 flex items-center justify-between"
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
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
      >
        <slot name="leading" />
      </div>

      <input
        :id="inputId"
        :name="name"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        :class="[
          'block w-full rounded-lg border text-xs sm:text-sm transition-colors duration-150',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
          $slots.leading ? 'pl-9' : 'pl-3.5',
          $slots.trailing ? 'pr-9' : 'pr-3.5',
          'py-2',
          error
            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
            : 'border-slate-300 text-slate-900 bg-white hover:border-slate-400 focus:border-slate-800 focus:ring-slate-100',
          disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-75' : ''
        ]"
        @input="onInput"
        @blur="(e) => emit('blur', e)"
        @focus="(e) => emit('focus', e)"
      />

      <div
        v-if="$slots.trailing"
        class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400"
      >
        <slot name="trailing" />
      </div>
    </div>

    <p v-if="error" class="text-[11px] font-medium text-rose-600 mt-0.5">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-[11px] text-slate-500 mt-0.5">
      {{ hint }}
    </p>
  </div>
</template>
