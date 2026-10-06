'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import {
  Printer,
  ArrowLeft,
  Search,
  Scissors,
  Flame,
  Loader2,
  FileCheck,
} from 'lucide-react'

interface ParticipantWithQR {
  _id: string
  participantId: string
  countNumber?: number
  name: string
  qrToken: string
  qrDataUrl?: string
}

export default function BulkPrintSheetPage() {
  const [participants, setParticipants] = useState<ParticipantWithQR[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [paperSize, setPaperSize] = useState<'a4' | '12x18'>('a4')
  const [cardsPerPage, setCardsPerPage] = useState<number>(12)
  const [fromCount, setFromCount] = useState<string>('')
  const [toCount, setToCount] = useState<string>('')

  function handlePaperSizeChange(newSize: 'a4' | '12x18') {
    setPaperSize(newSize)
    if (newSize === '12x18') {
      setCardsPerPage(60) // Default 60 passes for 12x18 with 25mm QR
    } else {
      setCardsPerPage(12)
    }
  }

  function getQrSizeMm(): number {
    if (paperSize === '12x18') {
      return 25 // Exactly 25mm x 25mm physical size locked for 12x18!
    }
    if (cardsPerPage === 12) return 46
    if (cardsPerPage === 16) return 38
    return 30
  }

  function getCardHeightStyle() {
    if (paperSize === '12x18') {
      if (cardsPerPage === 60 || cardsPerPage === 70) {
        return { minHeight: '39mm', maxHeight: '42mm' }
      }
      return { minHeight: '48mm', maxHeight: '52mm' }
    }
    // A4
    if (cardsPerPage === 20) return { minHeight: '50mm', maxHeight: '52mm' }
    if (cardsPerPage === 16) return { minHeight: '62mm', maxHeight: '65mm' }
    return { minHeight: '63mm', maxHeight: '66mm' }
  }

  function getGridClasses(): string {
    if (paperSize === '12x18') {
      if (cardsPerPage === 70) return 'grid-cols-7 gap-1 print:gap-0.5'
      if (cardsPerPage === 60) return 'grid-cols-6 gap-1.5 print:gap-1'
      if (cardsPerPage === 48) return 'grid-cols-6 gap-2 print:gap-1'
      return 'grid-cols-5 gap-2.5 print:gap-1.5' // 40
    }
    // A4
    if (cardsPerPage === 12) return 'grid-cols-3 gap-2.5 print:gap-1.5'
    if (cardsPerPage === 16) return 'grid-cols-4 gap-2 print:gap-1'
    return 'grid-cols-4 gap-1.5 print:gap-0.5' // 20
  }

  function getParticipantNum(p: ParticipantWithQR): number {
    if (p.countNumber !== undefined && p.countNumber !== null) return Number(p.countNumber)
    const match = p.participantId.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/participants/batch')
        const data = await res.json()
        const rawList: ParticipantWithQR[] = data.participants || []

        // Process in chunks to prevent memory spikes and browser UI freezing
        const chunkSize = 30
        const withQRs: ParticipantWithQR[] = []
        for (let i = 0; i < rawList.length; i += chunkSize) {
          const chunk = rawList.slice(i, i + chunkSize)
          const processed = await Promise.all(
            chunk.map(async (p) => {
              const qrDataUrl = await QRCode.toDataURL(p.qrToken, {
                errorCorrectionLevel: 'M',
                margin: 0,
                width: 300,
                color: { dark: '#000000', light: '#FFFFFF' },
              })
              return { ...p, qrDataUrl }
            })
          )
          withQRs.push(...processed)
        }

        setParticipants(withQRs)
      } catch (err) {
        console.error('Failed to load batch participants', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filtered = participants
    .filter((p) => {
      const num = getParticipantNum(p)

      if (fromCount !== '' && !isNaN(Number(fromCount))) {
        if (num < Number(fromCount)) return false
      }

      if (toCount !== '' && !isNaN(Number(toCount))) {
        if (num > Number(toCount)) return false
      }

      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(term) ||
        p.participantId.toLowerCase().includes(term) ||
        (p.countNumber && String(p.countNumber).includes(term))
      )
    })
    .sort((a, b) => getParticipantNum(a) - getParticipantNum(b))

  // Group into pages based on selected density (12, 16, or 20 per sheet)
  const pages: ParticipantWithQR[][] = []
  for (let i = 0; i < filtered.length; i += cardsPerPage) {
    pages.push(filtered.slice(i, i + cardsPerPage))
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* Top Toolbar (Hidden on Print) */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-4 shadow-xs print:hidden sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/participants"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>प्रतिभागी सूची पर वापस जाएं</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{paperSize === '12x18' ? '12×18 डिजिटल शीट प्रिंट' : 'A4 बल्क कार्ड प्रिंट शीट'}</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filtered.length} पास
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <span className="text-slate-500 px-2">कागज़:</span>
              <button
                onClick={() => handlePaperSizeChange('a4')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  paperSize === 'a4'
                    ? 'bg-white text-orange-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => handlePaperSizeChange('12x18')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  paperSize === '12x18'
                    ? 'bg-white text-orange-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                12×18 इंच
              </button>
            </div>

            {/* Density Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <span className="text-slate-500 px-2">प्रति शीट:</span>
              {paperSize === 'a4' ? (
                <>
                  <button
                    onClick={() => setCardsPerPage(12)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 12
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    बड़ा (12 पास)
                  </button>
                  <button
                    onClick={() => setCardsPerPage(16)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 16
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    मध्यम (16 पास)
                  </button>
                  <button
                    onClick={() => setCardsPerPage(20)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 20
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    छोटा (20 पास)
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCardsPerPage(60)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 60
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    60 पास (6×10 - बेस्ट)
                  </button>
                  <button
                    onClick={() => setCardsPerPage(70)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 70
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    70 पास (7×10 - अधिकतम)
                  </button>
                  <button
                    onClick={() => setCardsPerPage(48)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 48
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    48 पास (6×8)
                  </button>
                  <button
                    onClick={() => setCardsPerPage(40)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      cardsPerPage === 40
                        ? 'bg-white text-orange-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    40 पास (5×8)
                  </button>
                </>
              )}
            </div>

            {/* Count Range Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
              <span className="font-semibold text-slate-700 whitespace-nowrap">क्रमांक रेंज:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="से (From)"
                  value={fromCount}
                  onChange={(e) => setFromCount(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="number"
                  placeholder="तक (To)"
                  value={toCount}
                  onChange={(e) => setToCount(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              {(fromCount !== '' || toCount !== '') && (
                <button
                  onClick={() => {
                    setFromCount('')
                    setToCount('')
                  }}
                  className="text-red-500 hover:text-red-700 font-semibold text-[11px] ml-1 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors"
                  title="रेंज हटाएं"
                >
                  हटाएं
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="नाम या आईडी से खोजें..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 sm:w-48 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={() => window.print()}
              disabled={loading || filtered.length === 0}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-orange-600/20 flex items-center gap-2 text-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{filtered.length} पास प्रिंट करें</span>
              <span className="text-[11px] bg-orange-800/40 px-2 py-0.5 rounded-full font-mono">
                {pages.length} शीट
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-3 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-100 pt-2">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {paperSize === '12x18'
                ? `12×18 डिजिटल शीट: ${cardsPerPage} टोकन प्रति शीट (QR कोड ठीक 25 mm × 25 mm फिक्स लॉक)।`
                : cardsPerPage === 12
                ? 'A4 शीट: 12 टोकन प्रति शीट (3 × 4 ग्रिड, QR ~46mm)।'
                : cardsPerPage === 16
                ? 'A4 शीट: 16 टोकन प्रति शीट (4 × 4 ग्रिड, QR ~38mm)।'
                : 'A4 शीट: 20 टोकन प्रति शीट (4 × 5 ग्रिड, QR ~30mm)।'}
            </span>
            {(fromCount !== '' || toCount !== '') && (
              <span className="font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">
                क्रमांक #{fromCount || '1'} से #{toCount || 'अंतिम'} ({filtered.length} टोकन)
              </span>
            )}
          </span>
          <span className="text-slate-400">
            {paperSize === '12x18'
              ? 'प्रिंटर में Paper Size "12 x 18" या "Super A3" और Margin "Minimum/None" चुनें।'
              : 'प्रिंटर सेटिंग में मार्जिन "None" या "Minimum" सेट करें।'}
          </span>
        </div>
      </header>

      {/* Printable Sheet View */}
      <main
        className={`${
          paperSize === '12x18' ? 'max-w-5xl' : 'max-w-4xl'
        } mx-auto py-8 print:py-0 print:max-w-none`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium">शीट और QR कोड तैयार हो रहे हैं...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400 text-sm">
            खोज के अनुसार कोई प्रतिभागी नहीं मिले।
          </div>
        ) : (
          pages.map((pageGroup, pageIndex) => (
            <div
              key={pageIndex}
              className="sheet-container bg-white shadow-xl print:shadow-none mb-8 print:mb-0 p-3 sm:p-4 print:p-0 rounded-2xl print:rounded-none border border-slate-200/80 print:border-none break-after-page"
              style={{
                pageBreakAfter: 'always',
                minHeight: paperSize === '12x18' ? '435mm' : '272mm',
              }}
            >
              {/* Grid Layout */}
              <div className={`grid h-full ${getGridClasses()}`}>
                {pageGroup.map((p) => (
                  <div
                    key={p._id}
                    className="border border-dashed border-slate-400 p-1 print:p-0.5 rounded-lg flex flex-col items-center justify-between text-center bg-white overflow-hidden"
                    style={getCardHeightStyle()}
                  >
                    {/* 1. QR Code - Locked to exact millimeters */}
                    {p.qrDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.qrDataUrl}
                        alt={`QR for ${p.name}`}
                        style={{
                          width: `${getQrSizeMm()}mm`,
                          height: `${getQrSizeMm()}mm`,
                          minWidth: `${getQrSizeMm()}mm`,
                          minHeight: `${getQrSizeMm()}mm`,
                          maxWidth: `${getQrSizeMm()}mm`,
                          maxHeight: `${getQrSizeMm()}mm`,
                        }}
                        className="object-contain shrink-0 mx-auto block"
                      />
                    ) : (
                      <div
                        style={{
                          width: `${getQrSizeMm()}mm`,
                          height: `${getQrSizeMm()}mm`,
                        }}
                        className="bg-slate-100 rounded animate-pulse mx-auto"
                      />
                    )}

                    {/* Bottom Info: Number & Name */}
                    <div className="w-full shrink-0 mt-0.5">
                      {/* 2. Number underneath */}
                      <div
                        className={`font-black font-mono text-slate-900 leading-none ${
                          paperSize === '12x18'
                            ? cardsPerPage >= 60
                              ? 'text-xs'
                              : 'text-sm'
                            : cardsPerPage === 12
                            ? 'text-sm'
                            : 'text-xs'
                        }`}
                      >
                        #{p.countNumber ?? p.participantId}
                      </div>

                      {/* 3. Name underneath */}
                      <div
                        className={`font-bold text-slate-800 mt-0.5 leading-tight truncate px-0.5 ${
                          paperSize === '12x18'
                            ? cardsPerPage >= 60
                              ? 'text-[10px]'
                              : 'text-xs'
                            : cardsPerPage === 12
                            ? 'text-xs'
                            : 'text-[11px]'
                        }`}
                        title={p.name}
                      >
                        {p.name}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty slots on final sheet */}
                {Array.from({ length: cardsPerPage - pageGroup.length }).map(
                  (_, emptyIdx) => (
                    <div
                      key={`empty-${emptyIdx}`}
                      className="border border-dashed border-slate-200 rounded-lg"
                      style={getCardHeightStyle()}
                    />
                  )
                )}
              </div>
            </div>
          ))
        )}
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: ${paperSize === '12x18' ? '12in 18in' : 'A4 portrait'};
            margin: ${paperSize === '12x18' ? '6mm' : '6mm'};
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet-container {
            padding: 2mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  )
}
