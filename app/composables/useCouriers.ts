export interface CourierItem {
  id: string
  name: string
  phone: string | null
  isActive: boolean
  hasRecords?: boolean
  deliveryCount?: number
  customPriceCount?: number
  targetDate?: string
  todayIndoorPackages?: number
  todayOutdoorPackages?: number
  todayTotalPackages?: number
  todayIndoorAmount?: number
  todayOutdoorAmount?: number
  todayTotalAmount?: number
  createdAt?: string
  updatedAt?: string
}

export interface CourierVenuePriceItem {
  id: string
  courierId: string
  venueId: string
  indoorPrice: number
  outdoorPrice: number
  createdAt?: string
  updatedAt?: string
  venue: {
    id: string
    name: string
    indoorPrice: number
    outdoorPrice: number
    isActive: boolean
  }
}

export interface CourierFormData {
  name: string
  phone: string
  isActive: boolean
}

export interface CourierPriceFormData {
  venueId: string
  indoorPrice: number | string
  outdoorPrice: number | string
}

export const useCouriers = () => {
  const couriers = useState<CourierItem[]>('couriers-list', () => [])
  const currentCourier = useState<any | null>('current-courier-detail', () => null)
  const courierPrices = useState<CourierVenuePriceItem[]>('current-courier-prices', () => [])
  const loading = ref(false)
  const searchQuery = ref('')
  const filterDate = ref(new Date().toISOString().substring(0, 10))
  const toast = useToast()

  const fetchCouriers = async (search?: string, dateOverride?: string) => {
    loading.value = true
    try {
      const queryParams: Record<string, string> = {}
      if (search !== undefined ? search : searchQuery.value) {
        queryParams.search = (search !== undefined ? search : searchQuery.value).trim()
      }
      const targetD = dateOverride !== undefined ? dateOverride : filterDate.value
      if (targetD) {
        queryParams.date = targetD
      }

      const response = await $fetch<{ success: boolean; data: CourierItem[] }>('/api/couriers', {
        query: queryParams
      })

      if (response.success) {
        couriers.value = response.data
      }
    } catch (err: any) {
      console.error('Fetch couriers error:', err)
      toast.error(err?.data?.statusMessage || 'Kuryeler yüklenirken bir hata oluştu.', 'Hata')
    } finally {
      loading.value = false
    }
  }

  const fetchCourierById = async (id: string) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: any }>(`/api/couriers/${id}`)
      if (response.success) {
        currentCourier.value = response.data
        return response.data
      }
      return null
    } catch (err: any) {
      console.error('Fetch courier by id error:', err)
      toast.error(err?.data?.statusMessage || 'Kurye detayları getirilemedi.', 'Hata')
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchCourierPrices = async (courierId: string) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: CourierVenuePriceItem[] }>(`/api/couriers/${courierId}/prices`)
      if (response.success) {
        courierPrices.value = response.data
        return response.data
      }
      return []
    } catch (err: any) {
      console.error('Fetch courier prices error:', err)
      toast.error(err?.data?.statusMessage || 'Özel fiyatlar yüklenemedi.', 'Hata')
      return []
    } finally {
      loading.value = false
    }
  }

  const addCourierPrice = async (courierId: string, payload: CourierPriceFormData) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: CourierVenuePriceItem; message: string }>(`/api/couriers/${courierId}/prices`, {
        method: 'POST',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Özel fiyat başarıyla tanımlandı.', 'Başarılı')
        await fetchCourierPrices(courierId)
        await fetchCourierById(courierId)
        return true
      }
      return false
    } catch (err: any) {
      console.error('Add courier price error:', err)
      toast.error(err?.data?.statusMessage || 'Özel fiyat kaydedilirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const updateCourierPrice = async (courierId: string, priceId: string, payload: Partial<CourierPriceFormData>) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: CourierVenuePriceItem; message: string }>(`/api/couriers/${courierId}/prices/${priceId}`, {
        method: 'PUT',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Özel fiyat başarıyla güncellendi.', 'Başarılı')
        await fetchCourierPrices(courierId)
        return true
      }
      return false
    } catch (err: any) {
      console.error('Update courier price error:', err)
      toast.error(err?.data?.statusMessage || 'Özel fiyat güncellenirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteCourierPrice = async (courierId: string, priceId: string) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/couriers/${courierId}/prices/${priceId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast.success(response.message || 'Özel fiyat kaydı silindi.', 'Başarılı')
        await fetchCourierPrices(courierId)
        await fetchCourierById(courierId)
        return true
      }
      return false
    } catch (err: any) {
      console.error('Delete courier price error:', err)
      toast.error(err?.data?.statusMessage || 'Özel fiyat silinirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const createCourier = async (payload: CourierFormData) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: CourierItem; message: string }>('/api/couriers', {
        method: 'POST',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Kurye başarıyla eklendi.', 'Başarılı')
        await fetchCouriers()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Create courier error:', err)
      toast.error(err?.data?.statusMessage || 'Kurye eklenirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const updateCourier = async (id: string, payload: Partial<CourierFormData>) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: CourierItem; message: string }>(`/api/couriers/${id}`, {
        method: 'PUT',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Kurye başarıyla güncellendi.', 'Başarılı')
        await fetchCouriers()
        if (currentCourier.value && currentCourier.value.id === id) {
          await fetchCourierById(id)
        }
        return true
      }
      return false
    } catch (err: any) {
      console.error('Update courier error:', err)
      toast.error(err?.data?.statusMessage || 'Kurye güncellenirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const toggleCourierStatus = async (courier: CourierItem) => {
    const newStatus = !courier.isActive
    const success = await updateCourier(courier.id, { isActive: newStatus })
    if (success) {
      toast.info(`"${courier.name}" ${newStatus ? 'aktif' : 'pasif'} duruma getirildi.`, 'Durum Güncellendi')
    }
  }

  const deleteCourier = async (id: string) => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/couriers/${id}`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast.success(response.message || 'Kurye kalıcı olarak silindi.', 'Silindi')
        await fetchCouriers()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Delete courier error:', err)
      toast.error(err?.data?.message || err?.data?.statusMessage || 'Kurye silinirken bir hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    couriers: readonly(couriers),
    currentCourier: readonly(currentCourier),
    courierPrices: readonly(courierPrices),
    loading: readonly(loading),
    searchQuery,
    filterDate,
    fetchCouriers,
    fetchCourierById,
    fetchCourierPrices,
    addCourierPrice,
    updateCourierPrice,
    deleteCourierPrice,
    createCourier,
    updateCourier,
    toggleCourierStatus,
    deleteCourier
  }
}
