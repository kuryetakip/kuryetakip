export interface DeliveryRecordItem {
  id: string
  date: string
  courierId: string | null
  venueId: string | null
  deliveryType: 'INDOOR' | 'OUTDOOR'
  packageCount: number
  venuePriceSnapshot?: number
  venueTotalAmount?: number
  courierPriceSnapshot?: number
  courierTotalAmount?: number
  profitAmount?: number
  unitPriceSnapshot: number
  totalAmount: number
  createdAt?: string
  updatedAt?: string
  courier: {
    id: string
    name: string
    phone: string | null
    isActive: boolean
  } | null
  venue: {
    id: string
    name: string
    indoorPrice: number
    outdoorPrice: number
    isActive: boolean
  } | null
}

export interface DeliverySummary {
  totalRecords: number
  totalPackages: number
  indoorPackages: number
  outdoorPackages: number
  totalCourierAmount?: number
  totalVenueAmount?: number
  netProfitAmount?: number
  indoorSettlementAmount: number
  outdoorSettlementAmount: number
  totalSettlementAmount: number
}

export interface DeliveryFormData {
  date: string
  courierId: string
  venueId?: string
  deliveryType?: 'INDOOR' | 'OUTDOOR'
  unitPrice?: number | string
  venueUnitPrice?: number | string
  courierUnitPrice?: number | string
  packageCount?: number | string
  indoorPrice?: number | string
  indoorCount?: number | string
  outdoorPrice?: number | string
  outdoorCount?: number | string
  venueIndoorPrice?: number | string
  venueOutdoorPrice?: number | string
  courierIndoorPrice?: number | string
  courierOutdoorPrice?: number | string
}

export interface RatePreviewData {
  venueIndoorPrice: number
  venueOutdoorPrice: number
  courierIndoorPrice: number
  courierOutdoorPrice: number
  venueSelectedPrice: number
  courierSelectedPrice: number
  indoorPrice: number
  outdoorPrice: number
  selectedUnitPrice: number
  isCustomRate: boolean
  courierName: string
  venueName: string
}

export const useDeliveries = () => {
  const deliveries = useState<DeliveryRecordItem[]>('deliveries-list', () => [])
  const summary = useState<DeliverySummary>('deliveries-summary', () => ({
    totalRecords: 0,
    totalPackages: 0,
    indoorPackages: 0,
    outdoorPackages: 0,
    indoorSettlementAmount: 0,
    outdoorSettlementAmount: 0,
    totalSettlementAmount: 0
  }))
  const loading = ref(false)
  const rateLoading = ref(false)
  const ratePreview = ref<RatePreviewData | null>(null)
  const toast = useToast()

  // Filter state
  const filterDate = ref(new Date().toISOString().substring(0, 10))
  const filterCourierId = ref('all')
  const filterVenueId = ref('all')
  const filterDeliveryType = ref('all')

  const fetchDeliveries = async () => {
    loading.value = true
    try {
      const queryParams: Record<string, string> = {}
      if (filterDate.value) queryParams.date = filterDate.value
      if (filterCourierId.value && filterCourierId.value !== 'all') queryParams.courierId = filterCourierId.value
      if (filterVenueId.value && filterVenueId.value !== 'all') queryParams.venueId = filterVenueId.value
      if (filterDeliveryType.value && filterDeliveryType.value !== 'all') queryParams.deliveryType = filterDeliveryType.value

      const response = await $fetch<{ success: boolean; data: DeliveryRecordItem[]; summary: DeliverySummary }>('/api/deliveries', {
        query: queryParams
      })

      if (response.success) {
        deliveries.value = response.data
        summary.value = response.summary
      }
    } catch (err: any) {
      console.error('Fetch deliveries error:', err)
      toast.error(err?.data?.statusMessage || 'Paket kayıtları yüklenirken bir hata oluştu.', 'Hata')
    } finally {
      loading.value = false
    }
  }

  const createDelivery = async (payload: DeliveryFormData): Promise<boolean> => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string }>('/api/deliveries', {
        method: 'POST',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Paket kaydı başarıyla oluşturuldu.')
        await fetchDeliveries()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Create delivery error:', err)
      toast.error(err?.data?.message || err?.data?.statusMessage || 'Paket kaydı oluşturulurken hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const updateDelivery = async (id: string, payload: DeliveryFormData): Promise<boolean> => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/deliveries/${id}`, {
        method: 'PUT',
        body: payload
      })

      if (response.success) {
        toast.success(response.message || 'Paket kaydı başarıyla güncellendi.')
        await fetchDeliveries()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Update delivery error:', err)
      toast.error(err?.data?.message || err?.data?.statusMessage || 'Paket kaydı güncellenirken hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteDelivery = async (id: string): Promise<boolean> => {
    loading.value = true
    try {
      const response = await $fetch<{ success: boolean; message: string }>(`/api/deliveries/${id}`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast.success(response.message || 'Paket kaydı kalıcı olarak silindi.')
        await fetchDeliveries()
        return true
      }
      return false
    } catch (err: any) {
      console.error('Delete delivery error:', err)
      toast.error(err?.data?.message || err?.data?.statusMessage || 'Paket kaydı silinirken hata oluştu.', 'Hata')
      return false
    } finally {
      loading.value = false
    }
  }

  const fetchRates = async (courierId: string, venueId: string, deliveryType: 'INDOOR' | 'OUTDOOR') => {
    if (!courierId || !venueId) {
      ratePreview.value = null
      return
    }

    rateLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; data: RatePreviewData }>('/api/deliveries/rates', {
        query: { courierId, venueId, deliveryType }
      })

      if (response.success) {
        ratePreview.value = response.data
      }
    } catch (err: any) {
      console.error('Fetch rates error:', err)
      ratePreview.value = null
    } finally {
      rateLoading.value = false
    }
  }

  return {
    deliveries: readonly(deliveries),
    summary: readonly(summary),
    loading: readonly(loading),
    rateLoading: readonly(rateLoading),
    ratePreview: readonly(ratePreview),
    filterDate,
    filterCourierId,
    filterVenueId,
    filterDeliveryType,
    fetchDeliveries,
    createDelivery,
    updateDelivery,
    deleteDelivery,
    fetchRates
  }
}
