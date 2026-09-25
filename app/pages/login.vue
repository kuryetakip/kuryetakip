<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: 'Giriş Yap — KuryeTakip',
  meta: [
    { name: 'description', content: 'KuryeTakip yönetim paneline giriş yapın. Kurye operasyonlarınızı tek noktadan yönetin.' }
  ]
})

import { ref, onMounted } from 'vue'
import { Bike, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, Zap, BarChart3, MapPin, Sparkles } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const { login, loading } = useAuth()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const showPassword = ref(false)
const isMounted = ref(false)
const focusedField = ref<string | null>(null)

onMounted(() => {
  setTimeout(() => {
    isMounted.value = true
  }, 100)
})

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
  <div class="login-page">
    <!-- Theme Switcher -->
    <div class="login-theme-toggle">
      <ThemeSelector />
    </div>

    <!-- Global Toast -->
    <BaseToast />

    <!-- Animated Background -->
    <div class="login-bg">
      <div class="login-bg-gradient login-bg-gradient--1"></div>
      <div class="login-bg-gradient login-bg-gradient--2"></div>
      <div class="login-bg-gradient login-bg-gradient--3"></div>
      <div class="login-bg-gradient login-bg-gradient--4"></div>
      <div class="login-bg-grid"></div>
      <!-- Floating particles -->
      <div class="login-particle login-particle--1"></div>
      <div class="login-particle login-particle--2"></div>
      <div class="login-particle login-particle--3"></div>
      <div class="login-particle login-particle--4"></div>
      <div class="login-particle login-particle--5"></div>
      <div class="login-particle login-particle--6"></div>
    </div>

    <div class="login-container" :class="{ 'login-container--visible': isMounted }">
      <!-- Left: Branding panel (desktop) -->
      <div class="login-branding">
        <div class="login-branding__inner">
          <!-- Logo -->
          <div class="login-branding__header">
            <div class="login-logo">
              <div class="login-logo__icon">
                <Bike :size="26" />
              </div>
              <div class="login-logo__text">
                <span class="login-logo__name">KuryeTakip</span>
                <span class="login-logo__tag">Yönetim Platformu</span>
              </div>
            </div>
            <div class="login-status-badge">
              <span class="login-status-badge__dot"></span>
              <span>Çevrimiçi</span>
            </div>
          </div>

          <!-- Hero content -->
          <div class="login-hero">
            <div class="login-hero__badge">
              <Sparkles :size="14" />
              <span>Akıllı Kurye Operasyon Yönetimi</span>
            </div>
            <h1 class="login-hero__title">
              Teslimat Süreçlerinizi
              <span class="login-hero__title-gradient">Dijitalleştirin</span>
            </h1>
            <p class="login-hero__desc">
              Hakediş hesaplama, performans takibi ve mekan bazlı fiyatlandırmayı tek platformda yönetin.
            </p>

            <!-- Feature pills -->
            <div class="login-features">
              <div class="login-feature-pill">
                <div class="login-feature-pill__icon login-feature-pill__icon--emerald">
                  <BarChart3 :size="16" />
                </div>
                <div>
                  <div class="login-feature-pill__label">Anlık Raporlar</div>
                  <div class="login-feature-pill__sub">Performans metrikleri</div>
                </div>
              </div>
              <div class="login-feature-pill">
                <div class="login-feature-pill__icon login-feature-pill__icon--sky">
                  <MapPin :size="16" />
                </div>
                <div>
                  <div class="login-feature-pill__label">Mekan Yönetimi</div>
                  <div class="login-feature-pill__sub">Özel fiyatlandırma</div>
                </div>
              </div>
              <div class="login-feature-pill">
                <div class="login-feature-pill__icon login-feature-pill__icon--violet">
                  <Zap :size="16" />
                </div>
                <div>
                  <div class="login-feature-pill__label">Hızlı Hakediş</div>
                  <div class="login-feature-pill__sub">Otomatik hesaplama</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="login-branding__footer">
            <span>© {{ new Date().getFullYear() }} KuryeTakip</span>
            <div class="login-branding__footer-links">
              <span>Gizlilik</span>
              <span>•</span>
              <span>Destek</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Login Form -->
      <div class="login-form-section">
        <div class="login-form-wrapper">
          <!-- Mobile logo -->
          <div class="login-mobile-logo">
            <div class="login-logo__icon">
              <Bike :size="24" />
            </div>
            <div class="login-logo__text">
              <span class="login-logo__name">KuryeTakip</span>
              <span class="login-logo__tag">Yönetim Paneli</span>
            </div>
          </div>

          <!-- Header -->
          <div class="login-form-header">
            <h2 class="login-form-header__title">Hoş Geldiniz 👋</h2>
            <p class="login-form-header__sub">Panele erişmek için giriş bilgilerinizi girin</p>
          </div>

          <!-- Login card -->
          <div class="login-card">
            <form class="login-form" novalidate @submit.prevent="handleLogin">
              <!-- Error alert -->
              <Transition name="login-error">
                <div
                  v-if="errorMessage"
                  id="login-error"
                  class="login-alert"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle :size="18" class="login-alert__icon" />
                  <span>{{ errorMessage }}</span>
                </div>
              </Transition>

              <!-- Username -->
              <div class="login-field" :class="{ 'login-field--focused': focusedField === 'username', 'login-field--filled': username.length > 0 }">
                <label for="username" class="login-field__label">Kullanıcı Adı</label>
                <div class="login-field__input-wrap">
                  <div class="login-field__icon">
                    <User :size="18" />
                  </div>
                  <input
                    id="username"
                    v-model="username"
                    type="text"
                    autocomplete="username"
                    required
                    :aria-invalid="!!errorMessage"
                    :aria-describedby="errorMessage ? 'login-error' : undefined"
                    placeholder="Kullanıcı adınızı girin"
                    class="login-field__input"
                    @focus="focusedField = 'username'"
                    @blur="focusedField = null"
                  />
                </div>
              </div>

              <!-- Password -->
              <div class="login-field" :class="{ 'login-field--focused': focusedField === 'password', 'login-field--filled': password.length > 0 }">
                <label for="password" class="login-field__label">Şifre</label>
                <div class="login-field__input-wrap">
                  <div class="login-field__icon">
                    <Lock :size="18" />
                  </div>
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    required
                    :aria-invalid="!!errorMessage"
                    :aria-describedby="errorMessage ? 'login-error' : undefined"
                    placeholder="Şifrenizi girin"
                    class="login-field__input login-field__input--password"
                    @focus="focusedField = 'password'"
                    @blur="focusedField = null"
                  />
                  <button
                    type="button"
                    class="login-field__eye"
                    @click="showPassword = !showPassword"
                    :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
                  >
                    <Eye v-if="!showPassword" :size="18" />
                    <EyeOff v-else :size="18" />
                  </button>
                </div>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="loading"
                :aria-busy="loading"
                class="login-submit"
              >
                <span v-if="loading" class="login-submit__loading">
                  <svg class="login-submit__spinner" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75" />
                  </svg>
                  <span>Giriş yapılıyor...</span>
                </span>
                <template v-else>
                  <span>Giriş Yap</span>
                  <ArrowRight :size="18" class="login-submit__arrow" />
                </template>
              </button>
            </form>
          </div>

          <!-- Security footer -->
          <div class="login-security">
            <ShieldCheck :size="15" class="login-security__icon" />
            <span>256-Bit SSL şifrelemesi ile korunan güvenli bağlantı</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================
   LOGIN PAGE — MODERN PREMIUM SaaS
   ======================================== */

/* -- Base Layout -- */
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #0a0e1a;
}

/* -- Theme Toggle -- */
.login-theme-toggle {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 100;
}

/* ======== ANIMATED BACKGROUND ======== */
.login-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.login-bg-gradient {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0;
  animation: loginGradientIn 1.5s ease-out forwards;
}

.login-bg-gradient--1 {
  width: 600px;
  height: 600px;
  top: -15%;
  left: -10%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.25), transparent 70%);
  animation-delay: 0s;
}

.login-bg-gradient--2 {
  width: 500px;
  height: 500px;
  top: 40%;
  right: -5%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%);
  animation-delay: 0.3s;
}

.login-bg-gradient--3 {
  width: 400px;
  height: 400px;
  bottom: -10%;
  left: 30%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%);
  animation-delay: 0.6s;
}

.login-bg-gradient--4 {
  width: 300px;
  height: 300px;
  top: 20%;
  left: 50%;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.15), transparent 70%);
  animation-delay: 0.9s;
}

.login-bg-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* Floating particles */
.login-particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.4);
  animation: loginFloat linear infinite;
}

.login-particle--1 { width: 4px; height: 4px; top: 15%; left: 20%; animation-duration: 18s; }
.login-particle--2 { width: 3px; height: 3px; top: 50%; left: 70%; animation-duration: 22s; animation-delay: -5s; background: rgba(59, 130, 246, 0.4); }
.login-particle--3 { width: 5px; height: 5px; top: 80%; left: 40%; animation-duration: 15s; animation-delay: -8s; background: rgba(139, 92, 246, 0.35); }
.login-particle--4 { width: 3px; height: 3px; top: 30%; left: 85%; animation-duration: 20s; animation-delay: -3s; }
.login-particle--5 { width: 4px; height: 4px; top: 65%; left: 15%; animation-duration: 25s; animation-delay: -12s; background: rgba(20, 184, 166, 0.4); }
.login-particle--6 { width: 3px; height: 3px; top: 10%; left: 55%; animation-duration: 17s; animation-delay: -7s; background: rgba(251, 191, 36, 0.3); }

/* ======== CONTAINER ======== */
.login-container {
  position: relative;
  z-index: 10;
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-container--visible {
  opacity: 1;
  transform: translateY(0);
}

/* ======== LEFT BRANDING PANEL ======== */
.login-branding {
  display: none;
  width: 52%;
  position: relative;
  padding: 2.5rem;
}

.login-branding__inner {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  position: relative;
  z-index: 10;
}

/* Logo */
.login-logo {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.login-logo__icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #10b981, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
  flex-shrink: 0;
}

.login-logo__text {
  display: flex;
  flex-direction: column;
}

.login-logo__name {
  font-size: 1.375rem;
  font-weight: 800;
  color: white;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.login-logo__tag {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #34d399;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Status badge */
.login-status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(71, 85, 105, 0.4);
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 500;
  backdrop-filter: blur(12px);
}

.login-status-badge__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
  animation: loginPulse 2s ease-in-out infinite;
}

.login-branding__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Hero */
.login-hero {
  margin: auto 0;
  padding: 3rem 0;
  max-width: 520px;
}

.login-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #34d399;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1.75rem;
  backdrop-filter: blur(8px);
}

.login-hero__title {
  font-size: clamp(2rem, 3.5vw, 3.25rem);
  font-weight: 900;
  color: white;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin-bottom: 1.25rem;
}

.login-hero__title-gradient {
  display: block;
  background: linear-gradient(135deg, #34d399, #22d3ee, #818cf8);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: loginGradientShift 6s ease-in-out infinite;
}

.login-hero__desc {
  font-size: 1.0625rem;
  line-height: 1.7;
  color: #94a3b8;
  max-width: 440px;
  margin-bottom: 2.5rem;
}

/* Feature pills */
.login-features {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-feature-pill {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.3);
  backdrop-filter: blur(16px);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
}

.login-feature-pill:hover {
  transform: translateX(6px);
  border-color: rgba(71, 85, 105, 0.5);
}

.login-feature-pill__icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.login-feature-pill__icon--emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.login-feature-pill__icon--sky { background: rgba(14, 165, 233, 0.15); color: #38bdf8; }
.login-feature-pill__icon--violet { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }

.login-feature-pill__label {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}

.login-feature-pill__sub {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
}

/* Branding footer */
.login-branding__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #475569;
  font-size: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(51, 65, 85, 0.4);
}

.login-branding__footer-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-branding__footer-links span {
  cursor: pointer;
  transition: color 0.2s;
}

.login-branding__footer-links span:hover {
  color: #cbd5e1;
}

/* ======== RIGHT FORM SECTION ======== */
.login-form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  position: relative;
}

.login-form-wrapper {
  width: 100%;
  max-width: 420px;
}

/* Mobile logo */
.login-mobile-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
}

/* Form header */
.login-form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-form-header__title {
  font-size: 1.75rem;
  font-weight: 800;
  color: white;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
}

.login-form-header__sub {
  font-size: 0.9375rem;
  color: #64748b;
}

/* ======== LOGIN CARD ======== */
.login-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 1.5rem;
  padding: 2rem;
  backdrop-filter: blur(24px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 20px 50px -12px rgba(0, 0, 0, 0.4);
  transition: border-color 0.4s ease;
}

.login-card:hover {
  border-color: rgba(71, 85, 105, 0.6);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ======== FORM FIELDS ======== */
.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-field__label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #cbd5e1;
  letter-spacing: 0.01em;
}

.login-field__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.login-field__icon {
  position: absolute;
  left: 1rem;
  display: flex;
  align-items: center;
  color: #475569;
  transition: color 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.login-field--focused .login-field__icon {
  color: #10b981;
}

.login-field--filled .login-field__icon {
  color: #34d399;
}

.login-field__input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.875rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1.5px solid rgba(51, 65, 85, 0.6);
  border-radius: 0.875rem;
  color: white;
  font-size: 0.9375rem;
  font-weight: 500;
  font-family: inherit;
  outline: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-field__input::placeholder {
  color: #374151;
  font-weight: 400;
}

.login-field__input:hover {
  border-color: rgba(71, 85, 105, 0.8);
}

.login-field__input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15), 0 0 20px rgba(16, 185, 129, 0.08);
  background: rgba(15, 23, 42, 1);
}

.login-field__input--password {
  padding-right: 3.25rem;
}

/* Eye toggle */
.login-field__eye {
  position: absolute;
  right: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  color: #475569;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: color 0.2s, background 0.2s;
  z-index: 2;
}

.login-field__eye:hover {
  color: #cbd5e1;
  background: rgba(51, 65, 85, 0.4);
}

/* ======== ERROR ALERT ======== */
.login-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-radius: 0.875rem;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.25);
  color: #fda4af;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.5;
}

.login-alert__icon {
  color: #fb7185;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Error transition */
.login-error-enter-active {
  animation: loginSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-error-leave-active {
  animation: loginSlideDown 0.25s cubic-bezier(0.7, 0, 0.3, 1) reverse;
}

/* ======== SUBMIT BUTTON ======== */
.login-submit {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.9375rem 1.5rem;
  border: none;
  border-radius: 0.875rem;
  font-size: 0.9375rem;
  font-weight: 700;
  font-family: inherit;
  color: white;
  background: linear-gradient(135deg, #059669, #10b981);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow:
    0 4px 16px rgba(16, 185, 129, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.2);
}

.login-submit::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #10b981, #14b8a6);
  opacity: 0;
  transition: opacity 0.3s;
}

.login-submit:hover:not(:disabled)::before {
  opacity: 1;
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(16, 185, 129, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.2);
}

.login-submit:active:not(:disabled) {
  transform: translateY(0);
}

.login-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-submit > * {
  position: relative;
  z-index: 2;
}

.login-submit__arrow {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-submit:hover:not(:disabled) .login-submit__arrow {
  transform: translateX(4px);
}

.login-submit__loading {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.login-submit__spinner {
  width: 1.25rem;
  height: 1.25rem;
  animation: loginSpin 0.8s linear infinite;
}

/* ======== SECURITY FOOTER ======== */
.login-security {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.75rem;
  font-size: 0.75rem;
  color: #475569;
  font-weight: 500;
}

.login-security__icon {
  color: #10b981;
}

/* ======== KEYFRAMES ======== */
@keyframes loginGradientIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes loginFloat {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  25% { transform: translate(30px, -50px) scale(1.2); opacity: 0.7; }
  50% { transform: translate(-20px, -80px) scale(0.8); opacity: 0.5; }
  75% { transform: translate(40px, -30px) scale(1.1); opacity: 0.6; }
}

@keyframes loginPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

@keyframes loginGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes loginSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes loginSlideDown {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ======== LIGHT MODE OVERRIDES ======== */
:root:not(.dark) .login-page,
.light .login-page {
  background: #f8fafc;
}

:root:not(.dark) .login-bg-gradient--1,
.light .login-bg-gradient--1 {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12), transparent 70%);
}

:root:not(.dark) .login-bg-gradient--2,
.light .login-bg-gradient--2 {
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%);
}

:root:not(.dark) .login-bg-gradient--3,
.light .login-bg-gradient--3 {
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%);
}

:root:not(.dark) .login-bg-gradient--4,
.light .login-bg-gradient--4 {
  background: radial-gradient(circle, rgba(20, 184, 166, 0.08), transparent 70%);
}

:root:not(.dark) .login-bg-grid,
.light .login-bg-grid {
  background-image: radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px);
}

:root:not(.dark) .login-particle,
.light .login-particle {
  background: rgba(16, 185, 129, 0.2);
}

:root:not(.dark) .login-form-header__title,
.light .login-form-header__title {
  color: #0f172a;
}

:root:not(.dark) .login-form-header__sub,
.light .login-form-header__sub {
  color: #64748b;
}

:root:not(.dark) .login-card,
.light .login-card {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(226, 232, 240, 0.8);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 20px 50px -12px rgba(0, 0, 0, 0.08);
}

:root:not(.dark) .login-field__label,
.light .login-field__label {
  color: #334155;
}

:root:not(.dark) .login-field__input,
.light .login-field__input {
  background: rgba(248, 250, 252, 0.9);
  border-color: #e2e8f0;
  color: #0f172a;
}

:root:not(.dark) .login-field__input::placeholder,
.light .login-field__input::placeholder {
  color: #94a3b8;
}

:root:not(.dark) .login-field__input:hover,
.light .login-field__input:hover {
  border-color: #cbd5e1;
}

:root:not(.dark) .login-field__input:focus,
.light .login-field__input:focus {
  border-color: #10b981;
  background: white;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 0 20px rgba(16, 185, 129, 0.05);
}

:root:not(.dark) .login-field__icon,
.light .login-field__icon {
  color: #94a3b8;
}

:root:not(.dark) .login-field__eye,
.light .login-field__eye {
  color: #94a3b8;
}

:root:not(.dark) .login-field__eye:hover,
.light .login-field__eye:hover {
  color: #334155;
  background: rgba(226, 232, 240, 0.6);
}

:root:not(.dark) .login-alert,
.light .login-alert {
  background: rgba(244, 63, 94, 0.06);
  border-color: rgba(244, 63, 94, 0.2);
  color: #be123c;
}

:root:not(.dark) .login-alert__icon,
.light .login-alert__icon {
  color: #f43f5e;
}

:root:not(.dark) .login-logo__name,
.light .login-mobile-logo .login-logo__name {
  color: #0f172a;
}

:root:not(.dark) .login-logo__tag,
.light .login-mobile-logo .login-logo__tag {
  color: #059669;
}

:root:not(.dark) .login-security,
.light .login-security {
  color: #94a3b8;
}

/* ======== RESPONSIVE ======== */
@media (min-width: 768px) {
  .login-branding {
    display: flex;
  }

  .login-mobile-logo {
    display: none;
  }

  .login-form-header {
    text-align: left;
  }

  .login-form-section {
    padding: 3rem 4rem;
  }
}

@media (min-width: 1024px) {
  .login-branding {
    width: 55%;
    padding: 3rem;
  }

  .login-form-section {
    padding: 3rem 5rem;
  }
}

@media (min-width: 1280px) {
  .login-branding {
    padding: 3.5rem 4rem;
  }
}
</style>
