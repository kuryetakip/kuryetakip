<script setup lang="ts">
// Ana route (/) operasyon ekranı olan Paket Kayıtları (/deliveries) sayfasına yönlendirilir
await navigateTo('/deliveries', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <BaseLoading message="Operasyon ekranına yönlendiriliyorsunuz..." />
  </div>
</template>
