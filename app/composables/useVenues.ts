import { ref, readonly, type Ref } from 'vue'

export interface VenueDailyStat {
  date: string
  indoorCount: number
  indoorAmount: number
  outdoorCount: number
  outdoorAmount: number
  totalCount: number
  totalAmount: number
  isSettled?: boolean
  settledAmount?: number
  pendingAmount?: number
}

export interface VenueItem {
  id: string
  name: string
  indoorPrice: number
  outdoorPrice: number
  isActive: boolean
  carriedBalance?: number
  hasRecords?: boolean
  recordCount?: number
  filteredRecordCount?: number
  pendingPackageCount?: number
  pendingIndoorCount?: number
  pendingOutdoorCount?: number
  pendingAmount?: number
  pendingDeliveriesAmount?: number
  pendingIndoorAmount?: number
  pendingOutdoorAmount?: number
  totalCollectedAmount?: number
  lastSettledAt?: string | null
  lastSettledAmount?: number | null
  lastPaymentMethod?: string | null
  lastCashAmount?: number | null
  lastTransferAmount?: number | null
  totalCashAmount?: number
  totalTransferAmount?: number
  totalPackageCount?: number
  indoorPackageCount?: number
  outdoorPackageCount?: number
  totalAmount?: number
  indoorAmount?: number
  outdoorAmount?: number
  allTimePackageCount?: number
  allTimeTotalAmount?: number
  dailyBreakdown?: VenueDailyStat[]
  allDailyBreakdown?: VenueDailyStat[]
  createdAt?: string
  updatedAt?: string
}

export interface VenueFormData {
  name: string
  indoorPrice: number | string
  outdoorPrice: number | string
  isActive: boolean
  date?: string
  indoorCount?: number | string
  outdoorCount?: number | string
  courierId?: string
  courierIndoorPrice?: number | string
  courierOutdoorPrice?: number | string
}

export const getThisWeekRange = () => {
  const mondayStr = getBusinessThisWeekMonday()
  const [y, m, d] = mondayStr.split('-').map(Number)
  const monday = new Date(Date.UTC(y, m - 1, d))
  const sunday = new Date(monday.getTime() + 6 * 86400000)

  const toDateStr = (dt: Date) => {
    const yStr = dt.getUTCFullYear()
    const mStr = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const dayStr = String(dt.getUTCDate()).padStart(2, '0')
    return `${yStr}-${mStr}-${dayStr}`
  }

  return {
    start: mondayStr,
    end: toDateStr(sunday)
  }
}

export const useVenues = () => {
  const venues = useState<VenueItem[]>('venues-list', () => [])
  const loading = ref(false)
  const searchQuery = ref('')
  const filterDate = ref('')
  const filterStartDate = ref('')
  const filterEndDate = ref('')
  const filterScope = ref<'pending' | 'all' | 'custom'>('pending')
  const toast = useToast()

  const fetchVenues = async (search?: string) => {
    loading.value = true
    try {
      const queryParams: Record<string, string> = {}
      if (search !== undefined ? search : searchQuery.value) {
        queryParams.search = (search !== undefined ? search : searchQuery.value).trim()
      }
      if (filterDate.value) {
        queryParams.date = filterDate.value
      }
      if (filterStartDate.value) {
        queryParams.startDate = filterStartDate.value
      }
      if (filterEndDate.value) {
        queryParams.endDate = filterEndDate.value
      }
      if (filterScope.value && !filterDate.value && !filterStartDate.value && !filterEndDate.value) {
        queryParams.scope = filterScope.value
      }

      const response = await $fetch<{ success: boolean; data: VenueItem[] }>('/api/venues', {
        query: queryParams
      })

      if (response.success) {
        venues.value = response.data
      }
    } catch (err: any) {
      console.error('Fetch venues error:', err)
      toast.error(err?.data?.statusMessage || 'Mekanlar yüklenirken bir hata oluştu.', 'Hata')
    } finally {
      loading.value = false
    }
  }

  const createVenue = async (payload: VenueFormData) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: VenueItem; message: string }>('/api/venues', {
        method: 'POST',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Mekan başarıyla eklendi.', 'Başarılı')
        await fetchVenues()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Create venue error:', err)
      toast.error(err?.data?.statusMessage || 'Mekan eklenirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const updateVenue = async (id: string, payload: Partial<VenueFormData>) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: VenueItem; message: string }>(`/api/venues/${id}`, {
        method: 'PUT',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Mekan başarıyla güncellendi.', 'Başarılı')
        await fetchVenues()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Update venue error:', err)
      toast.error(err?.data?.statusMessage || 'Mekan güncellenirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const toggleVenueStatus = async (venue: VenueItem) => {
    const newStatus = !venue.isActive
    const success = await updateVenue(venue.id, { isActive: newStatus })
    if (success) {
      toast.info(`"${venue.name}" ${newStatus ? 'aktif' : 'pasif'} duruma getirildi.`, 'Durum Güncellendi')
    }
  }

  const settleVenue = async (
    venueId: string,
    options?: {
      action?: 'undo' | 'settle' | 'clear-carried'
      notes?: string
      collectedAmount?: number
      remainingBalance?: number
      paymentMethod?: 'CASH' | 'TRANSFER' | 'SPLIT'
      cashAmount?: number
      transferAmount?: number
    }
  ) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string; data: any }>(`/api/venues/${venueId}/settle`, {
        method: 'POST',
        body: options || {}
      })

      if (response.success) {
        toast.success(response.message || 'Tahsilat işlemi kaydedildi.', 'Tahsilat İşlemi')
        await fetchVenues()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Settle venue error:', err)
      toast.error(err?.data?.statusMessage || err?.data?.message || 'Tahsilat işlemi gerçekleştirilemedi.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const clearCarriedBalance = async (venueId: string) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string; data: any }>(`/api/venues/${venueId}/settle`, {
        method: 'POST',
        body: { action: 'clear-carried' }
      })

      if (response.success) {
        toast.success(response.message || 'Kalan borç sıfırlandı.', 'Kalan Borç Silindi')
        await fetchVenues()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Clear carried balance error:', err)
      toast.error(err?.data?.statusMessage || err?.data?.message || 'Kalan borç silinemedi.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteVenue = async (id: string) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/venues/${id}`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast.success(response.message || 'Mekan kalıcı olarak silindi.', 'Silindi')
        await fetchVenues()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Delete venue error:', err)
      toast.error(err?.data?.message || err?.data?.statusMessage || 'Mekan silinirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    venues: readonly(venues) as unknown as Ref<VenueItem[]>,
    loading: readonly(loading),
    searchQuery,
    filterDate,
    filterStartDate,
    filterEndDate,
    filterScope,
    fetchVenues,
    createVenue,
    updateVenue,
    toggleVenueStatus,
    settleVenue,
    clearCarriedBalance,
    deleteVenue
  }
}
