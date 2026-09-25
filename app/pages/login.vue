<script setup lang="ts">
import { ref } from 'vue'
import { Bike, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, LayoutDashboard, Database, ShieldCheck } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

useHead({
  title: 'Giriş Yap — KuryeTakip'
})

const { login, loading } = useAuth()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const showPassword = ref(false)

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
  <div class="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row font-sans transition-colors duration-300">
    <!-- Top Right Theme Switcher (Mobile/Desktop) -->
    <div class="absolute top-4 right-4 z-50">
      <ThemeSelector />
    </div>

    <!-- Toast Componssent -->
    <BaseToast />

    <!-- LEFT SECTION : BRANDING & VISUAL -->
    <div class="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-slate-900 flex-col justify-between p-12">
      <!-- Abstract Background Gradient / Shapes -->
      <div class="absolute inset-0 z-0">
        <div class="absolute -top-40 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div class="absolute -bottom-40 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>
        <!-- Grid Pattern overlay -->
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
      </div>

      <div class="relative z-10 flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Bike class="w-6 h-6 text-white" />
        </div>
        <span class="text-2xl font-bold text-white tracking-tight">KuryeTakip</span>
      </div>

      <div class="relative z-10 max-w-lg mt-auto mb-20">
        <h1 class="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
          Operasyonlarınızı <br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">Tek Noktadan</span> Yönetin
        </h1>
        <p class="text-slate-400 text-lg leading-relaxed mb-8">
          Kurye takibi, hakediş hesaplama ve performans analizlerini profesyonel, güvenli ve akıllı altyapımızla kolayca gerçekleştirin.
        </p>

        <div class="flex items-center gap-6 text-sm text-slate-300 font-medium">
          <div class="flex items-center gap-2">
            <LayoutDashboard class="w-5 h-5 text-emerald-400" />
            <span>Modern Arayüz</span>
          </div>
          <div class="flex items-center gap-2">
            <Database class="w-5 h-5 text-sky-400" />
            <span>Gerçek Zamanlı Veri</span>
          </div>
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-5 h-5 text-purple-400" />
            <span>Üstün Güvenlik</span>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-slate-500 text-sm">
        © {{ new Date().getFullYear() }} KuryeTakip. Tüm hakları saklıdır.
      </div>
    </div>

    <!-- RIGHT SECTION : LOGIN FORM -->
    <div class="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-md">
        <!-- Mobile Logo (Visible only on mobile) -->
        <div class="flex md:hidden items-center justify-center gap-3 mb-10">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bike class="w-6 h-6 text-white" />
          </div>
          <span class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">KuryeTakip</span>
        </div>

        <div class="mb-10 text-center md:text-left">
          <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Hoş Geldiniz</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm">Hesabınıza erişmek için lütfen giriş yapın.</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 transition-all duration-300">
          <form class="space-y-6" @submit.prevent="handleLogin">
            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
              <span class="font-medium">{{ errorMessage }}</span>
            </div>

            <!-- Username Input -->
            <div class="space-y-2">
              <label for="username" class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Kullanıcı Adı
              </label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <User class="w-5 h-5" />
                </div>
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  autocomplete="username"
                  required
                  placeholder="Kullanıcı adınızı girin"
                  class="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Şifre
                </label>
              </div>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <Lock class="w-5 h-5" />
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  placeholder="Şifrenizi girin"
                  class="block w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                  @click="showPassword = !showPassword"
                  title="Şifreyi Göster/Gizle"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="relative w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Giriş yapılıyor...
              </span>
              <template v-else>
                <span>Giriş Yap</span>
                <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </template>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Focus-within allows us to color the icons when the input is focused */
.group-focus-within\:text-emerald-500:focus-within {
  color: #10b981;
}
</style>
