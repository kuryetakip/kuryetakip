<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Settings,
  User,
  Save,
  Database,
  Shield,
  FileText,
  MessageSquare,
  Server,
  RefreshCw,
  CheckCircle2,
  Bike,
  Store,
  Package,
  Layers
} from 'lucide-vue-next'
import { useSettings } from '~/composables/useSettings'
import { useToast } from '~/composables/useToast'

useHead({
  title: 'Ayarlar — KuryeTakip'
})

const toast = useToast()
const { settings, loading, saving, fetchSettings, saveProfile } = useSettings()

const userForm = ref({
  name: '',
  email: ''
})

const prefForm = ref({
  pdfReportTitle: 'KURYE HAKEDİŞ RAPORU',
  whatsappDefaultNote: 'Hakediş raporu PDF olarak hazırlanmıştır.',
  defaultPeriod: 'month'
})

onMounted(async () => {
  await fetchSettings()
  userForm.value.name = settings.value.user.name
  userForm.value.email = settings.value.user.email
  prefForm.value.pdfReportTitle = settings.value.preferences.pdfReportTitle
  prefForm.value.whatsappDefaultNote = settings.value.preferences.whatsappDefaultNote
  prefForm.value.defaultPeriod = settings.value.preferences.defaultPeriod
})

const handleSaveProfile = async () => {
  if (!userForm.value.email.trim()) {
    toast.error('E-posta adresi zorunludur.')
    return
  }
  await saveProfile(userForm.value)
}

const handleSavePreferences = () => {
  settings.value.preferences.pdfReportTitle = prefForm.value.pdfReportTitle
  settings.value.preferences.whatsappDefaultNote = prefForm.value.whatsappDefaultNote
  settings.value.preferences.defaultPeriod = prefForm.value.defaultPeriod
  toast.success('Rapor ve paylaşım tercihleri yerel olarak güncellendi.')
}
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">
          Uygulama Ayarları
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Kullanıcı profiliniz, operasyonel hakediş tercihleri ve sistem durumu.
        </p>
      </div>

      <BaseButton
        variant="outline"
        size="md"
        :disabled="loading"
        @click="fetchSettings"
      >
        <template #leading>
          <RefreshCw :class="['w-4 h-4', loading ? 'animate-spin' : '']" />
        </template>
        Yenile
      </BaseButton>
    </div>

    <!-- Quick Stats Telemetry Row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <BaseCard no-padding class="p-3.5 bg-white border-slate-200">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Bike class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-400">Aktif Kurye</div>
            <div class="text-lg font-bold text-slate-900 font-mono">
              {{ settings.systemStats.activeCouriers }}
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard no-padding class="p-3.5 bg-white border-slate-200">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Store class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-400">Aktif Mekan</div>
            <div class="text-lg font-bold text-slate-900 font-mono">
              {{ settings.systemStats.activeVenues }}
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard no-padding class="p-3.5 bg-white border-slate-200">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-400">Toplam Kayıt</div>
            <div class="text-lg font-bold text-slate-900 font-mono">
              {{ settings.systemStats.totalDeliveries }}
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard no-padding class="p-3.5 bg-slate-900 text-white border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center">
            <Database class="w-4 h-4" />
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-400">Veritabanı</div>
            <div class="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              Bağlı (Supabase)
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- LEFT COLUMN: Profile & Preferences Forms (2 cols) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 1. User Profile Account Card -->
        <BaseCard title="Kullanıcı Hesabı & Profil" description="Operasyon yöneticisi hesap bilgileri.">
          <form class="space-y-4" @submit.prevent="handleSaveProfile">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BaseInput
                v-model="userForm.name"
                label="Ad Soyad"
                placeholder="Operasyon Yöneticisi"
              />
              <BaseInput
                v-model="userForm.email"
                type="email"
                label="E-posta Adresi"
                placeholder="admin@kuryetakip.com"
                required
              />
            </div>

            <div class="pt-2 flex justify-end">
              <BaseButton
                variant="primary"
                size="sm"
                type="submit"
                :disabled="saving"
              >
                <template #leading>
                  <Save class="w-3.5 h-3.5" />
                </template>
                {{ saving ? 'Kaydediliyor...' : 'Profili Kaydet' }}
              </BaseButton>
            </div>
          </form>
        </BaseCard>

        <!-- 2. Operational Preferences Card -->
        <BaseCard title="Rapor ve Hakediş Tercihleri" description="PDF dökümleri ve WhatsApp paylaşımları için varsayılanlar.">
          <form class="space-y-4" @submit.prevent="handleSavePreferences">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Varsayılan Para Birimi
                </label>
                <input
                  type="text"
                  value="Türk Lirası — TRY (₺)"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs sm:text-sm font-mono cursor-not-allowed"
                >
                <p class="text-[10px] text-slate-400 mt-1">Sistem para birimi Türk Lirası olarak sabitlenmiştir.</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Varsayılan Rapor Dönemi
                </label>
                <select
                  v-model="prefForm.defaultPeriod"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  <option value="month">Bu Ay (Varsayılan)</option>
                  <option value="week">Bu Hafta</option>
                  <option value="today">Bugün</option>
                </select>
              </div>
            </div>

            <BaseInput
              v-model="prefForm.pdfReportTitle"
              label="PDF Rapor Başlığı"
              placeholder="KURYE HAKEDİŞ RAPORU"
            />

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Paylaşım Alt Notu
              </label>
              <textarea
                v-model="prefForm.whatsappDefaultNote"
                rows="2"
                placeholder="Hakediş raporu PDF olarak hazırlanmıştır."
                class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-shadow"
              ></textarea>
            </div>

            <div class="pt-2 flex justify-end">
              <BaseButton variant="outline" size="sm" type="submit">
                <template #leading>
                  <Save class="w-3.5 h-3.5" />
                </template>
                Tercihleri Güncelle
              </BaseButton>
            </div>
          </form>
        </BaseCard>
      </div>

      <!-- RIGHT COLUMN: System & Architecture Info (1 col) -->
      <div class="space-y-6">
        <!-- Application Info Card -->
        <BaseCard title="Uygulama Bilgileri">
          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span class="text-slate-500 font-medium">Uygulama:</span>
              <span class="font-bold text-slate-900 font-mono">{{ settings.app.name }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span class="text-slate-500 font-medium">Sürüm:</span>
              <span class="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                v{{ settings.app.version }}
              </span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span class="text-slate-500 font-medium">Framework:</span>
              <span class="font-semibold text-slate-800">Nuxt 4 / Vue 3</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span class="text-slate-500 font-medium">Veritabanı:</span>
              <span class="font-semibold text-emerald-700">Supabase PostgreSQL</span>
            </div>
            <div class="flex items-center justify-between py-1.5">
              <span class="text-slate-500 font-medium">ORM Katmanı:</span>
              <span class="font-semibold text-slate-800">Prisma ORM v6</span>
            </div>
          </div>
        </BaseCard>

        <!-- System Health & Architecture Summary -->
        <BaseCard title="Sistem Mimarisi">
          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between py-1 text-slate-700">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mekan & Fiyatlandırma</span>
              </div>
              <BaseBadge variant="success">Aktif</BaseBadge>
            </div>

            <div class="flex items-center justify-between py-1 text-slate-700">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kurye & Özel Tarife</span>
              </div>
              <BaseBadge variant="success">Aktif</BaseBadge>
            </div>

            <div class="flex items-center justify-between py-1 text-slate-700">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Paket Kayıt & Hakediş</span>
              </div>
              <BaseBadge variant="success">Aktif</BaseBadge>
            </div>

            <div class="flex items-center justify-between py-1 text-slate-700">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                <span>A4 PDF Döküm & WhatsApp</span>
              </div>
              <BaseBadge variant="success">Aktif</BaseBadge>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
