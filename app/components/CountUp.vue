<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { animate } from 'motion-v'

const props = withDefaults(
  defineProps<{
    value: number
    duration?: number
    formatCurrency?: boolean
    decimals?: number
  }>(),
  {
    duration: 0.8,
    formatCurrency: false,
    decimals: 0
  }
)

const displayValue = ref(0)

const formatNumber = (val: number) => {
  if (props.formatCurrency) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: props.decimals,
      minimumFractionDigits: props.decimals
    }).format(val)
  }
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: props.decimals,
    minimumFractionDigits: props.decimals
  }).format(val)
}

const runAnimation = (fromVal: number, toVal: number) => {
  if (import.meta.client) {
    animate(fromVal, toVal, {
      duration: props.duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        displayValue.value = latest
      }
    })
  } else {
    displayValue.value = toVal
  }
}

onMounted(() => {
  runAnimation(0, props.value)
})

watch(
  () => props.value,
  (newVal, oldVal) => {
    runAnimation(oldVal ?? 0, newVal)
  }
)
</script>

<template>
  <span class="font-mono tabular-nums tracking-tight">
    {{ formatNumber(displayValue) }}
  </span>
</template>
