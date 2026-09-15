<script setup lang="ts">
import { ref } from 'vue'
import { Bike, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

useHead({
  title: 'Giriş Yap — KuryeTakip'
})

const { login, loading } = useAuth()

const username = ref('adem')
const password = ref('1')
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Lütfen kullanıcı adı ve şifrenizi girin.'
    return
  }

  const success = await login(username.value, password.value)
  if (!success) {
    errorMessage.value = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden antialiased">
    <!-- Background Gradient Accents -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Toast Component for notifications -->
    <BaseToast />

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
      <!-- App Brand Logo -->
      <div class="flex justify-center">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 shadow-xl flex items-center justify-center">
          <Bike class="w-7 h-7 text-emerald-400" />
        </div>
      </div>

      <h2 class="mt-5 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
        KuryeTakip
      </h2>
      <p class="mt-1 text-center text-xs sm:text-sm text-slate-400">
        Kurye & Mekan Hakediş Yönetim Sistemi
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
      <div class="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
        <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2"
          >
            <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Username Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">
              Kullanıcı Adı / E-posta
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User class="w-4 h-4" />
              </div>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                required
                placeholder="adem"
                class="block w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">
              Şifre
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock class="w-4 h-4" />
              </div>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                placeholder="••••••"
                class="block w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <!-- Quick Access Credentials Helper -->
          <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div class="flex items-center gap-1.5">
              <ShieldCheck class="w-3.5 h-3.5 text-emerald-400" />
              <span>Giriş Bilgileri:</span>
            </div>
            <div class="font-mono text-slate-300 font-medium">
              kullanıcı: <strong class="text-emerald-400">adem</strong> / şifre: <strong class="text-emerald-400">1</strong>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-lg text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span v-if="loading">Giriş yapılıyor...</span>
            <template v-else>
              <span>Giriş Yap</span>
              <ArrowRight class="w-4 h-4" />
            </template>
          </button>
        </form>
      </div>

      <!-- Footer Note -->
      <div class="text-center mt-6 text-[11px] text-slate-600 font-medium">
        KuryeTakip v1.0 • Güvenli Operasyon Platformu
      </div>
    </div>
  </div>
</template>
