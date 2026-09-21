export interface VenueDailyStat {
  date: string
  indoorCount: number
  indoorAmount: number
  outdoorCount: number
  outdoorAmount: number
  totalCount: number
  totalAmount: number
}

export interface VenueItem {
  id: string
  name: string
  indoorPrice: number
  outdoorPrice: number
  isActive: boolean
  hasRecords?: boolean
  recordCount?: number
  filteredRecordCount?: number
  totalPackageCount?: number
  indoorPackageCount?: number
  outdoorPackageCount?: number
  totalAmount?: number
  indoorAmount?: number
  outdoorAmount?: number
  dailyBreakdown?: VenueDailyStat[]
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

export const useVenues = () => {
  const venues = useState<VenueItem[]>('venues-list', () => [])
  const loading = ref(false)
  const searchQuery = ref('')
  const filterDate = ref('')
  const filterStartDate = ref('')
  const filterEndDate = ref('')
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
    venues: readonly(venues),
    loading: readonly(loading),
    searchQuery,
    filterDate,
    filterStartDate,
    filterEndDate,
    fetchVenues,
    createVenue,
    updateVenue,
    toggleVenueStatus,
    deleteVenue
  }
}
