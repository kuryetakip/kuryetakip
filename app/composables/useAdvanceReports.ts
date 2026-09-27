export interface AdvanceRecordItem {
  id: string
  courierId: string
  courierName: string
  courierPhone?: string | null
  amount: number
  formattedAmount: string
  date: string
  dateFormatted: string
  time: string
  week?: string
  periodId?: string | null
  description?: string
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
  closedAt?: string | null
  createdAt: string
}

export interface CourierAdvanceSummary {
  courierId: string
  courierName: string
  phone: string | null
  totalAmount: number
  count: number
  lastDate: string
}

export interface DailyAdvanceSummary {
  date: string
  dateFormatted: string
  dayName: string
  totalAmount: number
  count: number
}

export interface AdvanceReportResponse {
  period: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalAmount: number
  totalCount: number
  averageAmount: number
  courierBreakdown: CourierAdvanceSummary[]
  dailyBreakdown: DailyAdvanceSummary[]
  records: AdvanceRecordItem[]
}

export interface SettlementPeriodItem {
  id: string
  type: string
  week?: string
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalPackages: number
  totalEarnings: number
  totalAdvance: number
  remainingBalance: number
  closedAtFormatted: string
  note?: string
  advancesCount: number
  courier?: { id: string; name: string } | null
}

export const useAdvanceReports = () => {
  const loading = ref(false)
  const settlementLoading = ref(false)
  const reportData = ref<AdvanceReportResponse | null>(null)
  const settlementPeriods = ref<SettlementPeriodItem[]>([])
  const period = ref<'today' | 'week' | 'lastWeek' | 'month' | 'custom'>('week')
  const startDate = ref('')
  const endDate = ref('')
  const selectedCourierId = ref('all')
  const statusFilter = ref<'all' | 'ACTIVE' | 'CLOSED'>('all')
  const minAmount = ref<number | ''>('')
  const maxAmount = ref<number | ''>('')

  const toast = useToast()

  const fetchAdvanceReports = async () => {
    loading.value = true
    try {
      const queryParams: Record<string, any> = {
        period: period.value
      }

      if (period.value === 'custom') {
        if (startDate.value) queryParams.startDate = startDate.value
        if (endDate.value) queryParams.endDate = endDate.value
      }

      if (selectedCourierId.value && selectedCourierId.value !== 'all') {
        queryParams.courierId = selectedCourierId.value
      }

      if (statusFilter.value && statusFilter.value !== 'all') {
        queryParams.status = statusFilter.value
      }

      if (minAmount.value !== '') {
        queryParams.minAmount = minAmount.value
      }

      if (maxAmount.value !== '') {
        queryParams.maxAmount = maxAmount.value
      }

      const res = await $fetch<{ success: boolean; data: AdvanceReportResponse }>('/api/reports/advances', {
        query: queryParams
      })

      if (res.success) {
        reportData.value = res.data
      }
    } catch (err: any) {
      console.error('Fetch advance reports error:', err)
      const msg = err?.data?.statusMessage || 'Avans raporları yüklenirken bir hata oluştu.'
      toast.error(msg, 'Hata')
    } finally {
      loading.value = false
    }
  }

  const fetchSettlementPeriods = async () => {
    settlementLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: SettlementPeriodItem[] }>('/api/reports/settlement')
      if (res.success) {
        settlementPeriods.value = res.data
      }
    } catch (err: any) {
      console.error('Fetch settlement periods error:', err)
      toast.error('Kapatılan dönem geçmişi yüklenemedi.', 'Hata')
    } finally {
      settlementLoading.value = false
    }
  }

  const closeWeek = async (payload: {
    week?: string
    startDate?: string
    endDate?: string
    courierId?: string | null
    note?: string
  }) => {
    settlementLoading.value = true
    try {
      const res = await $fetch<{
        success: boolean
        message: string
        data: any
      }>('/api/reports/settlement/close-week', {
        method: 'POST',
        body: payload
      })

      if (res.success) {
        toast.success(res.message || 'Hafta kapatıldı ve arşivlendi.', 'Başarılı')
        await fetchAdvanceReports()
        await fetchSettlementPeriods()
        return res.data
      }
      return null
    } catch (err: any) {
      console.error('Close week error:', err)
      const msg = err?.data?.statusMessage || 'Hafta kapatılırken bir hata oluştu.'
      toast.error(msg, 'Hata')
      return null
    } finally {
      settlementLoading.value = false
    }
  }

  const setQuickFilter = (type: 'today' | 'week' | 'lastWeek' | 'month') => {
    period.value = type
    fetchAdvanceReports()
  }

  return {
    loading: readonly(loading),
    settlementLoading: readonly(settlementLoading),
    reportData: readonly(reportData),
    settlementPeriods: readonly(settlementPeriods),
    period,
    startDate,
    endDate,
    selectedCourierId,
    statusFilter,
    minAmount,
    maxAmount,
    fetchAdvanceReports,
    fetchSettlementPeriods,
    closeWeek,
    setQuickFilter
  }
}
