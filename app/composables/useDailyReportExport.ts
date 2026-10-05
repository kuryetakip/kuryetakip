import type { DailyReportSummaryResponse } from '~/server/api/reports/daily-summary.get'
import { useToast } from '~/composables/useToast'

// Cache loaded TTF base64 strings in memory to avoid repeated network fetches
let cachedRobotoRegularBase64: string | null = null
let cachedRobotoBoldBase64: string | null = null

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

const getTimestampFileName = (ext: 'xlsx' | 'pdf', dateStr?: string): string => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const datePart = dateStr || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  return `Gun_Sonu_Raporu_${datePart}_${hours}-${minutes}.${ext}`
}

export const useDailyReportExport = () => {
  const isExporting = ref(false)
  const exportingType = ref<'excel' | 'pdf' | null>(null)
  const toast = useToast()

  /**
   * Fetches daily summary data from API
   */
  const fetchDailySummary = async (dateStr?: string): Promise<DailyReportSummaryResponse | null> => {
    try {
      const queryParams: Record<string, string> = {}
      if (dateStr) {
        queryParams.date = dateStr
      }
      const data = await $fetch<DailyReportSummaryResponse>('/api/reports/daily-summary', {
        query: queryParams
      })
      return data
    } catch (error: any) {
      console.error('Error fetching daily report summary:', error)
      toast.error(error.data?.statusMessage || error.message || 'Gün sonu rapor verisi alınamadı.', 'Hata')
      return null
    }
  }

  /**
   * Loads Roboto fonts for jsPDF to ensure 100% Turkish character support
   */
  const loadFontsForPdf = async (doc: any) => {
    try {
      if (!cachedRobotoRegularBase64) {
        const regRes = await fetch('/fonts/Roboto-Regular.ttf')
        if (regRes.ok) {
          const buf = await regRes.arrayBuffer()
          cachedRobotoRegularBase64 = arrayBufferToBase64(buf)
        }
      }

      if (!cachedRobotoBoldBase64) {
        const boldRes = await fetch('/fonts/Roboto-Bold.ttf')
        if (boldRes.ok) {
          const buf = await boldRes.arrayBuffer()
          cachedRobotoBoldBase64 = arrayBufferToBase64(buf)
        }
      }

      if (cachedRobotoRegularBase64) {
        doc.addFileToVFS('Roboto-Regular.ttf', cachedRobotoRegularBase64)
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
      }
      if (cachedRobotoBoldBase64) {
        doc.addFileToVFS('Roboto-Bold.ttf', cachedRobotoBoldBase64)
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
      }
      doc.setFont('Roboto', 'normal')
      return true
    } catch (e) {
      console.warn('Could not load custom TTF font for PDF, falling back to standard font:', e)
      return false
    }
  }

  /**
   * Triggers browser download of a Blob
   */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  /**
   * EXCEL EXPORT (.xlsx)
   * Creates 2 sheets:
   * 1. "Kurye Raporu": Kurye Adı/Soyadı, Teslim Edilen Paket Sayısı, İptal/İade Sayısı, Toplam Günlük Hakediş/Kazanç, Çalışma Durumu/Saatleri, Notlar
   * 2. "Mekan/Restoran Raporu": Mekan Adı, Çıkan Toplam Sipariş, Teslim Edilen Sipariş, Toplam Tutar/Ciro, Ortalama Hazırlanma/Teslimat Süresi
   * With bold headers, auto column width, colored backgrounds, and automatic bottom totals.
   */
  const exportToExcel = async (dateStr?: string, preloadedData?: DailyReportSummaryResponse) => {
    isExporting.value = true
    exportingType.value = 'excel'

    try {
      const data = preloadedData || await fetchDailySummary(dateStr)
      if (!data) {
        isExporting.value = false
        exportingType.value = null
        return false
      }

      // Check for empty data
      if (!data.hasData && data.summary.totalDeliveries === 0) {
        toast.warning(
          `Seçilen tarihe (${data.formattedDate}) ait herhangi bir teslimat veya paket kaydı bulunamadı. Rapor boş oluşturulamaz.`,
          'Kayıt Bulunamadı'
        )
        isExporting.value = false
        exportingType.value = null
        return false
      }

      // Dynamic import ExcelJS
      const ExcelJS = (await import('exceljs')).default || await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'KuryeTakip Sistemi'
      workbook.created = new Date()

      // ==========================================
      // SHEET 1: KURYE RAPORU
      // ==========================================
      const sheet1 = workbook.addWorksheet('Kurye Raporu', {
        views: [{ showGridLines: true }]
      })

      // Title header row
      sheet1.mergeCells('A1:F1')
      const titleCell1 = sheet1.getCell('A1')
      titleCell1.value = `GÜN SONU KURYE RAPORU — ${data.formattedDate}`
      titleCell1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate 900
      }
      titleCell1.alignment = { horizontal: 'center', vertical: 'middle' }
      sheet1.getRow(1).height = 36

      // Meta info row
      sheet1.mergeCells('A2:F2')
      const metaCell1 = sheet1.getCell('A2')
      metaCell1.value = `Rapor Oluşturulma: ${data.generatedAt} | Toplam Kurye: ${data.couriers.length} | Aktif Görevde: ${data.summary.activeCouriersCount} | Toplam Teslimat: ${data.summary.totalDeliveries} Paket`
      metaCell1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } }
      metaCell1.alignment = { horizontal: 'left', vertical: 'middle' }
      sheet1.getRow(2).height = 20

      // Empty separator row
      sheet1.getRow(3).height = 8

      // Column definitions
      const courierColumns = [
        { header: 'Kurye Adı/Soyadı', key: 'name', width: 26 },
        { header: 'Teslim Edilen Paket Sayısı', key: 'delivered', width: 24 },
        { header: 'İptal/İade Sayısı', key: 'cancelled', width: 18 },
        { header: 'Toplam Günlük Hakediş/Kazanç (₺)', key: 'earnings', width: 32 },
        { header: 'Çalışma Durumu/Saatleri', key: 'status', width: 24 },
        { header: 'Notlar', key: 'notes', width: 30 }
      ]

      // Header row (Row 4)
      const headerRow1 = sheet1.getRow(4)
      headerRow1.height = 28
      courierColumns.forEach((col, idx) => {
        const cell = headerRow1.getCell(idx + 1)
        cell.value = col.header
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' } // Slate 800
        }
        cell.alignment = {
          horizontal: idx === 0 || idx === 5 ? 'left' : (idx === 4 ? 'center' : 'right'),
          vertical: 'middle'
        }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0F172A' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } }
        }
      })

      // Add courier data rows
      let currentRowIdx = 5
      data.couriers.forEach((courier, idx) => {
        const row = sheet1.getRow(currentRowIdx)
        row.height = 22

        const isEven = idx % 2 === 1
        const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF'

        // Values
        row.getCell(1).value = courier.name
        row.getCell(2).value = courier.deliveredCount
        row.getCell(3).value = courier.cancelledCount
        row.getCell(4).value = courier.dailyEarnings
        row.getCell(5).value = courier.workStatus
        row.getCell(6).value = courier.notes

        // Formatting
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
        row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
        row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
        row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' }

        // Number formats
        row.getCell(2).numFmt = '#,##0'
        row.getCell(3).numFmt = '#,##0'
        row.getCell(4).numFmt = '#,##0.00 "₺"'

        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c)
          cell.font = { name: 'Calibri', size: 10 }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgArgb }
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          }
        }

        currentRowIdx++
      })

      // Bottom Summary / Total Row
      const totalRow1 = sheet1.getRow(currentRowIdx)
      totalRow1.height = 26
      totalRow1.getCell(1).value = 'GENEL TOPLAM'
      totalRow1.getCell(2).value = { formula: `SUM(B5:B${currentRowIdx - 1})`, result: data.summary.totalDeliveries }
      totalRow1.getCell(3).value = { formula: `SUM(C5:C${currentRowIdx - 1})`, result: 0 }
      totalRow1.getCell(4).value = { formula: `SUM(D5:D${currentRowIdx - 1})`, result: data.summary.totalCourierEarnings }
      totalRow1.getCell(5).value = `${data.summary.activeCouriersCount} Aktif Kurye`
      totalRow1.getCell(6).value = 'Otomatik Genel Toplam'

      totalRow1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      totalRow1.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      totalRow1.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      totalRow1.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      totalRow1.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
      totalRow1.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' }

      totalRow1.getCell(2).numFmt = '#,##0'
      totalRow1.getCell(3).numFmt = '#,##0'
      totalRow1.getCell(4).numFmt = '#,##0.00 "₺"'

      for (let c = 1; c <= 6; c++) {
        const cell = totalRow1.getCell(c)
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' } // Slate 200 highlight
        }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0F172A' } },
          bottom: { style: 'double', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        }
      }

      // Auto-fit column widths
      sheet1.columns.forEach((col, i) => {
        let maxLen = courierColumns[i].header.length
        data.couriers.forEach(c => {
          const val = i === 0 ? c.name : (i === 4 ? c.workStatus : (i === 5 ? c.notes : ''))
          if (val && val.length > maxLen) maxLen = val.length
        })
        col.width = Math.max(courierColumns[i].width, maxLen + 4)
      })

      // ==========================================
      // SHEET 2: MEKAN/RESTORAN RAPORU
      // ==========================================
      const sheet2 = workbook.addWorksheet('Mekan Raporu', {
        views: [{ showGridLines: true }]
      })

      // Title header row
      sheet2.mergeCells('A1:E1')
      const titleCell2 = sheet2.getCell('A1')
      titleCell2.value = `GÜN SONU MEKAN/RESTORAN RAPORU — ${data.formattedDate}`
      titleCell2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF064E3B' } // Emerald 900
      }
      titleCell2.alignment = { horizontal: 'center', vertical: 'middle' }
      sheet2.getRow(1).height = 36

      // Meta info row
      sheet2.mergeCells('A2:E2')
      const metaCell2 = sheet2.getCell('A2')
      metaCell2.value = `Rapor Oluşturulma: ${data.generatedAt} | Kayıtlı Mekan: ${data.venues.length} | Sipariş Veren Mekan: ${data.summary.activeVenuesWithOrders} | Toplam Ciro: ${data.summary.totalRevenue.toFixed(2)} ₺`
      metaCell2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF065F46' } }
      metaCell2.alignment = { horizontal: 'left', vertical: 'middle' }
      sheet2.getRow(2).height = 20

      // Empty separator row
      sheet2.getRow(3).height = 8

      // Column definitions
      const venueColumns = [
        { header: 'Mekan Adı', key: 'name', width: 28 },
        { header: 'Çıkan Toplam Sipariş', key: 'totalOrders', width: 22 },
        { header: 'Teslim Edilen Sipariş', key: 'deliveredOrders', width: 22 },
        { header: 'Toplam Tutar/Ciro (₺)', key: 'totalRevenue', width: 28 },
        { header: 'Ortalama Hazırlanma/Teslimat Süresi', key: 'avgTime', width: 36 }
      ]

      // Header row (Row 4)
      const headerRow2 = sheet2.getRow(4)
      headerRow2.height = 28
      venueColumns.forEach((col, idx) => {
        const cell = headerRow2.getCell(idx + 1)
        cell.value = col.header
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF047857' } // Emerald 700
        }
        cell.alignment = {
          horizontal: idx === 0 ? 'left' : (idx === 4 ? 'center' : 'right'),
          vertical: 'middle'
        }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF064E3B' } },
          bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
          left: { style: 'thin', color: { argb: 'FF059669' } },
          right: { style: 'thin', color: { argb: 'FF059669' } }
        }
      })

      // Add venue data rows
      let currentVenueRowIdx = 5
      data.venues.forEach((venue, idx) => {
        const row = sheet2.getRow(currentVenueRowIdx)
        row.height = 22

        const isEven = idx % 2 === 1
        const bgArgb = isEven ? 'FFF0FDF4' : 'FFFFFFFF'

        row.getCell(1).value = venue.name
        row.getCell(2).value = venue.totalOrders
        row.getCell(3).value = venue.deliveredOrders
        row.getCell(4).value = venue.totalRevenue
        row.getCell(5).value = venue.avgDeliveryTime

        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
        row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
        row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }

        row.getCell(2).numFmt = '#,##0'
        row.getCell(3).numFmt = '#,##0'
        row.getCell(4).numFmt = '#,##0.00 "₺"'

        for (let c = 1; c <= 5; c++) {
          const cell = row.getCell(c)
          cell.font = { name: 'Calibri', size: 10 }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgArgb }
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          }
        }

        currentVenueRowIdx++
      })

      // Bottom Summary / Total Row
      const totalRow2 = sheet2.getRow(currentVenueRowIdx)
      totalRow2.height = 26
      totalRow2.getCell(1).value = 'GENEL TOPLAM'
      totalRow2.getCell(2).value = { formula: `SUM(B5:B${currentVenueRowIdx - 1})`, result: data.summary.totalDeliveries }
      totalRow2.getCell(3).value = { formula: `SUM(C5:C${currentVenueRowIdx - 1})`, result: data.summary.totalDeliveries }
      totalRow2.getCell(4).value = { formula: `SUM(D5:D${currentVenueRowIdx - 1})`, result: data.summary.totalRevenue }
      totalRow2.getCell(5).value = `${data.summary.activeVenuesWithOrders} Sipariş Veren Mekan`

      totalRow2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      totalRow2.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      totalRow2.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      totalRow2.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      totalRow2.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }

      totalRow2.getCell(2).numFmt = '#,##0'
      totalRow2.getCell(3).numFmt = '#,##0'
      totalRow2.getCell(4).numFmt = '#,##0.00 "₺"'

      for (let c = 1; c <= 5; c++) {
        const cell = totalRow2.getCell(c)
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF064E3B' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' } // Emerald 100 highlight
        }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF064E3B' } },
          bottom: { style: 'double', color: { argb: 'FF064E3B' } },
          left: { style: 'thin', color: { argb: 'FF6EE7B7' } },
          right: { style: 'thin', color: { argb: 'FF6EE7B7' } }
        }
      }

      // Auto-fit column widths
      sheet2.columns.forEach((col, i) => {
        let maxLen = venueColumns[i].header.length
        data.venues.forEach(v => {
          const val = i === 0 ? v.name : (i === 4 ? v.avgDeliveryTime : '')
          if (val && val.length > maxLen) maxLen = val.length
        })
        col.width = Math.max(venueColumns[i].width, maxLen + 4)
      })

      // Generate buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileName = getTimestampFileName('xlsx', data.date)
      downloadBlob(blob, fileName)

      toast.success(
        `Gün sonu Excel raporu (${fileName}) başarıyla oluşturuldu ve indirildi.`,
        'Excel İndirildi'
      )
      return true
    } catch (err: any) {
      console.error('Error generating Excel report:', err)
      toast.error('Excel raporu oluşturulurken bir hata meydana geldi: ' + err.message, 'Hata')
      return false
    } finally {
      isExporting.value = false
      exportingType.value = null
    }
  }

  /**
   * PDF EXPORT (.pdf)
   * Client-side jsPDF + jspdf-autotable with:
   * - Full Turkish character encoding with Roboto font
   * - Header banner with System Title & Date
   * - 3 KPI Cards: Toplam Teslimat, Aktif Kurye Sayısı, Toplam Ciro/Kazanç
   * - Table 1: Kurye Günlük Dağılımı ve Hakedişleri
   * - Table 2: Mekan Sipariş Dağılımı ve Durumları
   * - Footer: Page numbers (Sayfa X / Y) & "Bu rapor gün sonu arşivleme amacıyla otomatik oluşturulmuştur."
   */
  const exportToPdf = async (dateStr?: string, preloadedData?: DailyReportSummaryResponse) => {
    isExporting.value = true
    exportingType.value = 'pdf'

    try {
      const data = preloadedData || await fetchDailySummary(dateStr)
      if (!data) {
        isExporting.value = false
        exportingType.value = null
        return false
      }

      // Check for empty data
      if (!data.hasData && data.summary.totalDeliveries === 0) {
        toast.warning(
          `Seçilen tarihe (${data.formattedDate}) ait herhangi bir teslimat veya paket kaydı bulunamadı. Rapor boş oluşturulamaz.`,
          'Kayıt Bulunamadı'
        )
        isExporting.value = false
        exportingType.value = null
        return false
      }

      // Dynamic import jsPDF & autotable
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Load Roboto fonts for Turkish characters
      const fontsLoaded = await loadFontsForPdf(doc)
      const fontName = fontsLoaded ? 'Roboto' : 'helvetica'

      const pageWidth = doc.internal.pageSize.getWidth() // 210mm
      const pageHeight = doc.internal.pageSize.getHeight() // 297mm
      const margin = 14

      // 1. TOP HEADER BANNER
      doc.setFillColor(15, 23, 42) // Slate 900
      doc.rect(margin, 12, pageWidth - (margin * 2), 24, 'F')

      // Left Accent Stripe
      doc.setFillColor(16, 185, 129) // Emerald 500
      doc.rect(margin, 12, 4, 24, 'F')

      // Brand Title
      doc.setTextColor(255, 255, 255)
      doc.setFont(fontName, 'bold')
      doc.setFontSize(14)
      doc.text('KuryeTakip — Gün Sonu Kurye & Mekan Özeti', margin + 8, 22)

      // Subtitle
      doc.setFont(fontName, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(148, 163, 184) // Slate 400
      doc.text('Operasyonel Gün Sonu Hakediş ve Sipariş Arşiv Raporu', margin + 8, 30)

      // Right Header Meta Box
      doc.setFont(fontName, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.text(`Tarih: ${data.formattedDate}`, pageWidth - margin - 6, 21, { align: 'right' })

      doc.setFont(fontName, 'normal')
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Oluşturuldu: ${data.generatedAt}`, pageWidth - margin - 6, 29, { align: 'right' })

      // 2. SUMMARY KPI CARDS (3 Cards horizontally)
      const cardY = 41
      const cardHeight = 20
      const availableWidth = pageWidth - (margin * 2)
      const cardGap = 4
      const cardWidth = (availableWidth - (cardGap * 2)) / 3

      // Helper function to draw KPI card
      const drawKpiCard = (x: number, title: string, mainVal: string, subVal: string, borderColor: number[], fillBg: number[]) => {
        doc.setFillColor(fillBg[0], fillBg[1], fillBg[2])
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F')

        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
        doc.setLineWidth(0.3)
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'S')

        doc.setFont(fontName, 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139) // Slate 500
        doc.text(title.toUpperCase(), x + 4, cardY + 5.5)

        doc.setFont(fontName, 'bold')
        doc.setFontSize(12)
        doc.setTextColor(15, 23, 42) // Slate 900
        doc.text(mainVal, x + 4, cardY + 12.5)

        doc.setFont(fontName, 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text(subVal, x + 4, cardY + 17.5)
      }

      // Card 1: Toplam Teslimat
      drawKpiCard(
        margin,
        'Toplam Teslimat',
        `${data.summary.totalDeliveries} Paket`,
        `İç: ${data.summary.totalIndoor} / Dış: ${data.summary.totalOutdoor}`,
        [203, 213, 225],
        [248, 250, 252]
      )

      // Card 2: Aktif Kurye Sayısı
      drawKpiCard(
        margin + cardWidth + cardGap,
        'Aktif Kurye',
        `${data.summary.activeCouriersCount} Kurye`,
        `Toplam Kayıtlı: ${data.summary.totalCouriersCount} Kurye`,
        [167, 243, 208],
        [240, 253, 244]
      )

      // Card 3: Toplam Ciro / Kazanç
      drawKpiCard(
        margin + (cardWidth * 2) + (cardGap * 2),
        'Toplam Ciro / Hakediş',
        `${data.summary.totalRevenue.toFixed(2)} ₺`,
        `Kurye Hakediş: ${data.summary.totalCourierEarnings.toFixed(2)} ₺`,
        [254, 215, 170],
        [255, 251, 235]
      )

      // 3. TABLE 1: KURYE GÜNLÜK DAĞILIMI VE HAKEDİŞLERİ
      const table1StartY = cardY + cardHeight + 8

      doc.setFont(fontName, 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(15, 23, 42)
      doc.text('1. Kurye Günlük Dağılımı ve Hakedişleri', margin, table1StartY)

      const courierTableHead = [
        ['#', 'Kurye Adı / Soyadı', 'Durum', 'İç Paket', 'Dış Paket', 'Toplam Paket', 'Günlük Hakediş']
      ]

      const courierTableBody = data.couriers.map((c, i) => [
        String(i + 1),
        c.name,
        c.workStatus,
        String(c.indoorCount),
        String(c.outdoorCount),
        String(c.deliveredCount),
        `${c.dailyEarnings.toFixed(2)} ₺`
      ])

      const courierTableFoot = [
        [
          '',
          'GENEL TOPLAM',
          `${data.summary.activeCouriersCount} Aktif`,
          String(data.summary.totalIndoor),
          String(data.summary.totalOutdoor),
          String(data.summary.totalDeliveries),
          `${data.summary.totalCourierEarnings.toFixed(2)} ₺`
        ]
      ]

      ;(doc as any).autoTable({
        startY: table1StartY + 3,
        head: courierTableHead,
        body: courierTableBody,
        foot: courierTableFoot,
        theme: 'grid',
        margin: { left: margin, right: margin },
        styles: {
          font: fontName,
          fontSize: 8.5,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        },
        footStyles: {
          fillColor: [226, 232, 240], // Slate 200
          textColor: [15, 23, 42],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
        }
      })

      // 4. TABLE 2: MEKAN SİPARİŞ DAĞILIMI VE DURUMLARI
      const lastTable1EndY = (doc as any).lastAutoTable.finalY
      let table2StartY = lastTable1EndY + 10

      // If close to page bottom, add page
      if (table2StartY > pageHeight - 60) {
        doc.addPage()
        table2StartY = 18
      }

      doc.setFont(fontName, 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(15, 23, 42)
      doc.text('2. Mekan Sipariş Dağılımı ve Durumları', margin, table2StartY)

      const venueTableHead = [
        ['#', 'Mekan Adı', 'Durum', 'Çıkan Sipariş', 'Teslim Edilen', 'Toplam Ciro / Tutar', 'Ort. Süre']
      ]

      const venueTableBody = data.venues.map((v, i) => [
        String(i + 1),
        v.name,
        v.isActive ? 'Aktif' : 'Pasif',
        String(v.totalOrders),
        String(v.deliveredOrders),
        `${v.totalRevenue.toFixed(2)} ₺`,
        v.avgDeliveryTime
      ])

      const venueTableFoot = [
        [
          '',
          'GENEL TOPLAM',
          `${data.summary.activeVenuesWithOrders} Sipariş Veren`,
          String(data.summary.totalDeliveries),
          String(data.summary.totalDeliveries),
          `${data.summary.totalRevenue.toFixed(2)} ₺`,
          '—'
        ]
      ]

      ;(doc as any).autoTable({
        startY: table2StartY + 3,
        head: venueTableHead,
        body: venueTableBody,
        foot: venueTableFoot,
        theme: 'grid',
        margin: { left: margin, right: margin },
        styles: {
          font: fontName,
          fontSize: 8.5,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [6, 78, 59], // Emerald 900
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244] // Emerald 50
        },
        footStyles: {
          fillColor: [209, 250, 229], // Emerald 100
          textColor: [6, 78, 59],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 24, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 32, halign: 'center' }
        }
      })

      // 5. FOOTER ON ALL PAGES
      const totalPages = doc.internal.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)

        // Top thin divider for footer
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

        doc.setFont(fontName, 'normal')
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184) // Slate 400

        // Left note
        doc.text(
          'Bu rapor gün sonu arşivleme amacıyla otomatik oluşturulmuştur.',
          margin,
          pageHeight - 7
        )

        // Right page number
        doc.text(
          `Sayfa ${p} / ${totalPages}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: 'right' }
        )
      }

      // Generate blob and trigger download
      const pdfBlob = doc.output('blob')
      const fileName = getTimestampFileName('pdf', data.date)
      downloadBlob(pdfBlob, fileName)

      toast.success(
        `Gün sonu PDF raporu (${fileName}) başarıyla oluşturuldu ve indirildi.`,
        'PDF İndirildi'
      )
      return true
    } catch (err: any) {
      console.error('Error generating PDF report:', err)
      toast.error('PDF raporu oluşturulurken bir hata meydana geldi: ' + err.message, 'Hata')
      return false
    } finally {
      isExporting.value = false
      exportingType.value = null
    }
  }

  return {
    isExporting: readonly(isExporting),
    exportingType: readonly(exportingType),
    fetchDailySummary,
    exportToExcel,
    exportToPdf
  }
}
