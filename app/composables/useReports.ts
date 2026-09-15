export interface CourierReportRecord {
  id: string
  date: string
  dateFormatted: string
  venueName: string
  deliveryType: 'INDOOR' | 'OUTDOOR'
  deliveryTypeLabel: string
  packageCount: number
  unitPriceSnapshot: number
  totalAmount: number
}

export interface CourierReportData {
  courier: {
    id: string
    name: string
    phone: string | null
    isActive: boolean
  }
  startDate: string
  endDate: string
  startDateFormatted: string
  endDateFormatted: string
  totalPackageCount: number
  indoorPackages: number
  outdoorPackages: number
  indoorAmount: number
  outdoorAmount: number
  totalAmount: number
  records: CourierReportRecord[]
}

export const useReports = () => {
  const loading = ref(false)
  const reportData = ref<CourierReportData | null>(null)
  const errorMessage = ref<string | null>(null)

  // Default dates: start of current month to today
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  const defaultStartDate = `${year}-${month}-01`
  const defaultEndDate = `${year}-${month}-${day}`

  const selectedCourierId = ref<string>('')
  const startDate = ref<string>(defaultStartDate)
  const endDate = ref<string>(defaultEndDate)

  const toast = useToast()

  const fetchCourierReport = async () => {
    errorMessage.value = null

    if (!selectedCourierId.value) {
      reportData.value = null
      return
    }

    if (!startDate.value || !endDate.value) {
      errorMessage.value = 'Lütfen başlangıç ve bitiş tarihlerini seçiniz.'
      toast.error(errorMessage.value)
      return
    }

    if (startDate.value > endDate.value) {
      errorMessage.value = 'Başlangıç tarihi bitiş tarihinden sonra olamaz.'
      toast.error(errorMessage.value)
      return
    }

    loading.value = true
    try {
      const response = await $fetch<{
        success: boolean
        data: CourierReportData
      }>('/api/reports/courier', {
        query: {
          courierId: selectedCourierId.value,
          startDate: startDate.value,
          endDate: endDate.value
        }
      })

      if (response.success) {
        reportData.value = response.data
      }
    } catch (err: any) {
      console.error('Fetch courier report error:', err)
      const msg = err?.data?.message || err?.data?.statusMessage || 'Kurye hakediş raporu alınırken bir hata oluştu.'
      errorMessage.value = msg
      toast.error(msg, 'Hata')
      reportData.value = null
    } finally {
      loading.value = false
    }
  }

  const setQuickDateRange = (type: 'this_month' | 'last_month' | 'today' | 'last_7_days') => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    if (type === 'today') {
      const dStr = today.toISOString().substring(0, 10)
      startDate.value = dStr
      endDate.value = dStr
    } else if (type === 'last_7_days') {
      const past = new Date()
      past.setDate(today.getDate() - 6)
      startDate.value = past.toISOString().substring(0, 10)
      endDate.value = today.toISOString().substring(0, 10)
    } else if (type === 'this_month') {
      const mStr = String(currentMonth + 1).padStart(2, '0')
      const dStr = String(today.getDate()).padStart(2, '0')
      startDate.value = `${currentYear}-${mStr}-01`
      endDate.value = `${currentYear}-${mStr}-${dStr}`
    } else if (type === 'last_month') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
      const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0)
      const prevYear = lastMonthDate.getFullYear()
      const prevMonthStr = String(lastMonthDate.getMonth() + 1).padStart(2, '0')
      const lastDayStr = String(lastDayOfPrevMonth.getDate()).padStart(2, '0')
      startDate.value = `${prevYear}-${prevMonthStr}-01`
      endDate.value = `${prevYear}-${prevMonthStr}-${lastDayStr}`
    }

    if (selectedCourierId.value) {
      fetchCourierReport()
    }
  }

  return {
    reportData,
    loading,
    errorMessage,
    selectedCourierId,
    startDate,
    endDate,
    fetchCourierReport,
    setQuickDateRange
  }
}
