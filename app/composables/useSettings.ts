import { ref } from 'vue'
import { useToast } from './useToast'

export interface SettingsData {
  user: {
    id: string
    name: string
    email: string
  }
  app: {
    name: string
    version: string
    description: string
    environment: string
  }
  preferences: {
    currency: string
    currencySymbol: string
    defaultPeriod: string
    pdfReportTitle: string
    whatsappDefaultNote: string
  }
  systemStats: {
    activeCouriers: number
    activeVenues: number
    totalDeliveries: number
    databaseStatus: string
    databaseEngine: string
  }
}

export function useSettings() {
  const toast = useToast()
  const loading = ref(false)
  const saving = ref(false)

  const settings = ref<SettingsData>({
    user: {
      id: '',
      name: 'Operasyon Yöneticisi',
      email: 'admin@kuryetakip.com'
    },
    app: {
      name: 'KuryeTakip',
      version: '1.0.0',
      description: 'Kurye & Mekan Hakediş Takip Sistemi',
      environment: 'development'
    },
    preferences: {
      currency: 'TRY',
      currencySymbol: '₺',
      defaultPeriod: 'month',
      pdfReportTitle: 'KURYE HAKEDİŞ RAPORU',
      whatsappDefaultNote: 'Hakediş raporu PDF olarak hazırlanmıştır.'
    },
    systemStats: {
      activeCouriers: 0,
      activeVenues: 0,
      totalDeliveries: 0,
      databaseStatus: 'connected',
      databaseEngine: 'Supabase PostgreSQL (Prisma ORM)'
    }
  })

  const fetchSettings = async () => {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: SettingsData }>('/api/settings')
      if (res.success && res.data) {
        settings.value = res.data
      }
    } catch (err: any) {
      console.error('Fetch settings error:', err)
      toast.error('Ayarlar yüklenirken bir hata oluştu.')
    } finally {
      loading.value = false
    }
  }

  const saveProfile = async (profileData: { name: string; email: string }) => {
    saving.value = true
    try {
      const res = await $fetch<{ success: boolean; data: any; message: string }>('/api/settings', {
        method: 'PUT',
        body: profileData
      })
      if (res.success) {
        settings.value.user.name = profileData.name
        settings.value.user.email = profileData.email
        toast.success(res.message || 'Profil başarıyla güncellendi.')
        return true
      }
      return false
    } catch (err: any) {
      console.error('Save profile error:', err)
      toast.error(err.data?.statusMessage || 'Profil kaydedilirken hata oluştu.')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    settings,
    loading,
    saving,
    fetchSettings,
    saveProfile
  }
}
