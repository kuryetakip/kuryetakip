<script setup lang="ts">
// Ana route (/) mekanlar (/venues) sayfasına yönlendirilirss
await navigateTo('/venues', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <BaseLoading message="Mekanlar ekranına yönlendiriliyorsunuz..." />
  </div>
</template>
