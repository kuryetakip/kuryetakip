export interface PdfReportData {
  title: string
  courierName?: string
  venueName?: string
  dateRange: string
  generatedAt: string
  rows: Array<{
    venueName?: string
    courierName?: string
    deliveryType: string
    packageCount: number
    unitPrice: number
    totalAmount: number
  }>
  totalPackages: number
  totalIndoor: number
  totalOutdoor: number
  totalAmount: number
}

export const usePdfExport = () => {
  const isGenerating = ref(false)
  const previewData = ref<PdfReportData | null>(null)
  const isPreviewOpen = ref(false)
  const toast = useToast()

  const openPdfPreview = (data: PdfReportData) => {
    previewData.value = data
    isPreviewOpen.value = true
  }

  const printCurrentPdf = () => {
    if (!import.meta.client) return
    window.print()
  }

  const exportDirectToPrint = (data: PdfReportData) => {
    isGenerating.value = true
    try {
      openPdfPreview(data)
      // Small timeout to allow DOM to render before opening print dialog
      setTimeout(() => {
        if (import.meta.client) {
          window.print()
        }
        isGenerating.value = false
      }, 300)
    } catch (err) {
      console.error('PDF Export Error:', err)
      toast.error('PDF oluşturulurken bir hata meydana geldi.', 'Hata')
      isGenerating.value = false
    }
  }

  return {
    isGenerating: readonly(isGenerating),
    previewData: readonly(previewData),
    isPreviewOpen,
    openPdfPreview,
    printCurrentPdf,
    exportDirectToPrint
  }
}
