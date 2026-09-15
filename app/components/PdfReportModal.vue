<script setup lang="ts">
import { Printer, Download, X, Bike, FileText, CheckCircle2, MessageSquare } from 'lucide-vue-next'
import type { PdfReportData } from '~/composables/usePdfExport'

interface Props {
  modelValue: boolean
  data: PdfReportData | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'share-whatsapp'): void
}>()

const close = () => {
  emit('update:modelValue', false)
}

const handlePrint = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue && data" class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <!-- Modal Container -->
      <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        <!-- Modal Toolbar (Hidden in Print) -->
        <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div class="flex items-center gap-2">
            <FileText class="w-4 h-4 text-emerald-400" />
            <span class="text-xs sm:text-sm font-semibold tracking-tight">PDF Rapor Önizleme (A4)</span>
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              class="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30 text-xs"
              @click="emit('share-whatsapp')"
            >
              <template #leading>
                <MessageSquare class="w-3.5 h-3.5 text-emerald-400" />
              </template>
              WhatsApp'ta Paylaş
            </BaseButton>

            <BaseButton
              variant="outline"
              size="sm"
              class="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              @click="handlePrint"
            >
              <template #leading>
                <Printer class="w-3.5 h-3.5" />
              </template>
              Yazdır / PDF Kaydet
            </BaseButton>

            <button
              type="button"
              class="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              @click="close"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Scrollable A4 Preview Area -->
        <div class="overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <!-- A4 Page Simulation -->
          <div
            id="printable-pdf-document"
            class="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-sm border border-slate-200/80 rounded-lg print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0 flex flex-col justify-between"
          >
            <!-- TOP SECTION -->
            <div class="space-y-6">
              <!-- Header -->
              <div class="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                      <Bike class="w-4 h-4 text-emerald-400" />
                    </div>
                    <span class="text-lg font-black tracking-tight text-slate-900">KuryeTakip</span>
                  </div>
                  <h1 class="text-xl font-extrabold tracking-tight text-slate-900 uppercase mt-2">
                    {{ data.title }}
                  </h1>
                  <p class="text-xs text-slate-500 font-medium mt-0.5">
                    Operasyonel Hakediş & Paket Dağıtım Dökümü
                  </p>
                </div>

                <div class="text-right text-xs space-y-1">
                  <div class="text-slate-400 font-medium">Rapor Dönemi</div>
                  <div class="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                    {{ data.dateRange }}
                  </div>
                  <div class="text-[11px] text-slate-400 pt-1">
                    Düzenleme: {{ data.generatedAt }}
                  </div>
                </div>
              </div>

              <!-- Metadata Info Cards -->
              <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span class="text-slate-400 font-medium block">Kurye:</span>
                  <span class="text-sm font-bold text-slate-900 block mt-0.5">
                    {{ data.courierName || 'Tüm Kuryeler' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 font-medium block">Mekan Kapsamı:</span>
                  <span class="text-sm font-bold text-slate-900 block mt-0.5">
                    {{ data.venueName || 'Tüm Mekanlar' }}
                  </span>
                </div>
              </div>

              <!-- Settlement Breakdown Table -->
              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th class="px-3 py-2.5">Mekan</th>
                      <th class="px-3 py-2.5">Tip</th>
                      <th class="px-3 py-2.5 text-right font-mono">Paket</th>
                      <th class="px-3 py-2.5 text-right font-mono">Birim Fiyat</th>
                      <th class="px-3 py-2.5 text-right font-mono">Toplam Hakediş</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr
                      v-for="(row, idx) in data.rows"
                      :key="idx"
                      class="hover:bg-slate-50/50"
                    >
                      <td class="px-3 py-2.5 font-medium text-slate-900">
                        {{ row.venueName || '-' }}
                      </td>
                      <td class="px-3 py-2.5 font-medium">
                        <span :class="row.deliveryType.includes('İç') ? 'text-emerald-700' : 'text-sky-700'">
                          {{ row.deliveryType }}
                        </span>
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
                        {{ row.packageCount }}
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono text-slate-600">
                        {{ row.unitPrice.toFixed(2) }} ₺
                      </td>
                      <td class="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        {{ row.totalAmount.toFixed(2) }} ₺
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Summary Totals Block -->
              <div class="flex justify-end">
                <div class="w-full max-w-xs p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                  <div class="flex items-center justify-between text-slate-300">
                    <span>Toplam İç Paket:</span>
                    <span class="font-mono font-bold text-white">{{ data.totalIndoor }} Adet</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300">
                    <span>Toplam Dış Paket:</span>
                    <span class="font-mono font-bold text-white">{{ data.totalOutdoor }} Adet</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300 border-t border-slate-800 pt-2 font-semibold">
                    <span>Toplam Paket Sayısı:</span>
                    <span class="font-mono text-white">{{ data.totalPackages }} Adet</span>
                  </div>
                  <div class="flex items-center justify-between text-sm font-bold text-white border-t border-slate-700 pt-2">
                    <span>Toplam Hakediş:</span>
                    <span class="text-emerald-400 font-mono text-base font-extrabold">
                      {{ data.totalAmount.toFixed(2) }} ₺
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- BOTTOM FOOTER DISCLAIMER -->
            <div class="pt-8 border-t border-slate-200 mt-8 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                * Bu belge kurye operasyonel hakediş dökümüdür. Resmi ödeme makbuzu veya vergi faturası niteliğinde değildir.
              </div>
              <div class="font-mono shrink-0">
                KuryeTakip v1.0 • Sayfa 1 / 1
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@media print {
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  body * {
    visibility: hidden;
  }
  #printable-pdf-document, #printable-pdf-document * {
    visibility: visible;
  }
  #printable-pdf-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none !important;
    box-shadow: none !important;
  }
}
</style>
