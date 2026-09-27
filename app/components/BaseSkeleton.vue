<script setup lang="ts">
interface Props {
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1rem',
  rounded: 'md',
  className: ''
})

const roundedClasses = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full'
}
</script>

<template>
  <div
    :class="[
      'animate-shimmer shrink-0',
      roundedClasses[props.rounded],
      props.className
    ]"
    :style="{ width: props.width, height: props.height }"
    aria-hidden="true"
  />
</template>
