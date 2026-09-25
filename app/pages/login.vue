<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: 'Giriş Yap — KuryeTakip SaaS'
})

import { ref } from 'vue'
import { Bike, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, LayoutDashboard, ShieldCheck, Zap, TrendingUp, Users } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

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
    errorMessage.value = 'Kullanıcı adı veya şifre hatalı.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans transition-colors duration-300 selection:bg-emerald-500 selection:text-slate-950">
    <!-- Top Right Theme Switcher -->
    <div class="absolute top-6 right-6 z-50">
      <ThemeSelector />
    </div>

    <!-- Global Toast Component -->
    <BaseToast />

    <!-- LEFT SECTION : BRANDING & AI/TECH HERO -->
    <div class="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-slate-900 flex-col justify-between p-12 lg:p-16">
      <!-- Ambient Background Gradients & Effects -->
      <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 -left-20 w-96 h-96 bg-emerald-500/25 rounded-full blur-[120px] animate-pulse"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600/15 rounded-full blur-[140px]"></div>
        <div class="absolute -bottom-40 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]"></div>
        <!-- Dot Grid Pattern Overlay -->
        <div class="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      </div>

      <!-- Top Brand Header -->
      <div class="relative z-10 flex items-center justify-between">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
            <Bike class="w-6 h-6 text-white" />
          </div>
          <div>
            <span class="text-2xl font-bold text-white tracking-tight">KuryeTakip</span>
            <span class="block text-xs font-medium text-emerald-400 tracking-wider uppercase">SaaS Yönetim Platformu</span>
          </div>
        </div>
        <div class="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium backdrop-blur-md">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Sistem Aktif & Güvenli</span>
        </div>
      </div>

      <!-- Center Hero Content -->
      <div class="relative z-10 max-w-xl my-auto py-12">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 backdrop-blur-md">
          <Zap class="w-3.5 h-3.5" />
          <span>Yeni Nesil Hakediş & Operasyon Yönetimi</span>
        </div>
        
        <h1 class="text-4xl lg:text-6xl font-black text-white leading-[1.15] mb-6 tracking-tight">
          Operasyonlarınızı <br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">Tek Noktadan</span> Yönetin
        </h1>
        
        <p class="text-slate-300 text-lg lg:text-xl font-normal leading-relaxed mb-10 max-w-lg">
          Kurye takibi, hakediş hesaplama, özel mekan fiyatlandırmaları ve anlık performans raporlarını güvenle ve hızla gerçekleştirin.
        </p>

        <!-- Floating Feature Cards Preview -->
        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-xl shadow-lg transition-transform hover:-translate-y-1">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <LayoutDashboard class="w-4 h-4" />
            </div>
            <div class="text-white font-bold text-base mb-0.5">Modüler</div>
            <div class="text-slate-400 text-xs">Esnek Kontrol</div>
          </div>
          <div class="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-xl shadow-lg transition-transform hover:-translate-y-1">
            <div class="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
              <TrendingUp class="w-4 h-4" />
            </div>
            <div class="text-white font-bold text-base mb-0.5">Hakediş</div>
            <div class="text-slate-400 text-xs">Otomatik Hesap</div>
          </div>
          <div class="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-xl shadow-lg transition-transform hover:-translate-y-1">
            <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <ShieldCheck class="w-4 h-4" />
            </div>
            <div class="text-white font-bold text-base mb-0.5">Güvenli</div>
            <div class="text-slate-400 text-xs">Şifreli Oturum</div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="relative z-10 flex items-center justify-between text-slate-400 text-xs pt-6 border-t border-slate-800">
        <span>© {{ new Date().getFullYear() }} KuryeTakip. Tüm hakları saklıdır.</span>
        <div class="flex items-center gap-4">
          <span class="hover:text-white transition-colors cursor-pointer">Gizlilik</span>
          <span>•</span>
          <span class="hover:text-white transition-colors cursor-pointer">Destek</span>
        </div>
      </div>
    </div>

    <!-- RIGHT SECTION : LOGIN CARD & FORM -->
    <div class="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-md">
        <!-- Mobile Logo Header -->
        <div class="flex md:hidden items-center justify-center gap-3 mb-8">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Bike class="w-6 h-6 text-white" />
          </div>
          <div>
            <span class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">KuryeTakip</span>
            <span class="block text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Yönetim Paneli</span>
          </div>
        </div>

        <div class="mb-8 text-center md:text-left">
          <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Hoş Geldiniz</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm">Yönetim paneline erişmek için lütfen giriş yapın.</p>
        </div>

        <!-- Modern Login Card -->
        <div class="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 backdrop-blur-xl transition-all duration-300">
          <form class="space-y-6" @submit.prevent="handleLogin">
            <!-- Error Banner -->
            <div
              v-if="errorMessage"
              class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"
              role="alert"
            >
              <AlertCircle class="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <span class="font-medium leading-relaxed">{{ errorMessage }}</span>
            </div>

            <!-- Username Field -->
            <div class="space-y-2">
              <label for="username" class="block text-sm font-bold text-slate-700 dark:text-slate-300">
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
                  class="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                />
              </div>
            </div>

            <!-- Password Field -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-bold text-slate-700 dark:text-slate-300">
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
                  class="block w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  @click="showPassword = !showPassword"
                  :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
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
              class="relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
            >
              <span v-if="loading" class="flex items-center gap-2.5">
                <svg class="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Giriş yapılıyor...</span>
              </span>
              <template v-else>
                <span>Giriş Yap</span>
                <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </template>
            </button>
          </form>
        </div>

        <!-- Security Badge Footer -->
        <div class="mt-8 text-center flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
          <ShieldCheck class="w-4 h-4 text-emerald-500" />
          <span>256-Bit SSL ile Güvenli ve Şifreli Oturum</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth custom animations */
@keyframes pulse-slow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.animate-pulse {
  animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
