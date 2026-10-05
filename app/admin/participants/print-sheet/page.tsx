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

  const [cardsPerPage, setCardsPerPage] = useState<number>(12)
  const [fromCount, setFromCount] = useState<string>('')
  const [toCount, setToCount] = useState<string>('')

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
                width: 220,
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
                <span>A4 बल्क कार्ड प्रिंट शीट</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filtered.length} पास
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Density Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <span className="text-slate-500 px-2">साइज़:</span>
              <button
                onClick={() => setCardsPerPage(12)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 12
                    ? 'bg-white text-orange-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                बड़ा QR (12 प्रति शीट - 3×4)
              </button>
              <button
                onClick={() => setCardsPerPage(16)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 16
                    ? 'bg-white text-orange-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                मध्यम (16 प्रति शीट - 4×4)
              </button>
              <button
                onClick={() => setCardsPerPage(20)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 20
                    ? 'bg-white text-orange-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                छोटा (20 प्रति शीट - 4×5)
              </button>
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
              {cardsPerPage === 12
                ? 'बड़ा QR: 12 टोकन प्रति A4 शीट (3 × 4 ग्रिड)।'
                : cardsPerPage === 16
                ? 'मध्यम QR: 16 टोकन प्रति A4 शीट (4 × 4 ग्रिड)।'
                : 'छोटा QR: 20 टोकन प्रति A4 शीट (4 × 5 ग्रिड)।'}
            </span>
            {(fromCount !== '' || toCount !== '') && (
              <span className="font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">
                क्रमांक #{fromCount || '1'} से #{toCount || 'अंतिम'} ({filtered.length} टोकन)
              </span>
            )}
          </span>
          <span className="text-slate-400">
            प्रिंटर सेटिंग में मार्जिन &quot;None&quot; या &quot;Minimum&quot; सेट करें।
          </span>
        </div>
      </header>

      {/* Printable Sheet View */}
      <main className="max-w-4xl mx-auto py-8 print:py-0 print:max-w-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium">A4 शीट और QR कोड तैयार हो रहे हैं...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400 text-sm">
            खोज के अनुसार कोई प्रतिभागी नहीं मिले।
          </div>
        ) : (
          pages.map((pageGroup, pageIndex) => (
            <div
              key={pageIndex}
              className="a4-sheet bg-white shadow-xl print:shadow-none mb-8 print:mb-0 p-3 sm:p-4 print:p-1.5 rounded-2xl print:rounded-none border border-slate-200/80 print:border-none break-after-page"
              style={{
                pageBreakAfter: 'always',
                minHeight: '272mm',
              }}
            >
              {/* Grid: 3 cols for 12, 4 cols for 16 or 20 */}
              <div
                className={`grid h-full ${
                  cardsPerPage === 12
                    ? 'grid-cols-3 gap-2.5 print:gap-1.5'
                    : cardsPerPage === 16
                    ? 'grid-cols-4 gap-2 print:gap-1'
                    : 'grid-cols-4 gap-1.5 print:gap-0.5'
                }`}
              >
                {pageGroup.map((p) => (
                  <div
                    key={p._id}
                    className="border border-dashed border-slate-400 p-1 sm:p-1.5 print:p-1 rounded-lg flex flex-col items-center justify-between text-center bg-white overflow-hidden"
                    style={{
                      minHeight: cardsPerPage === 20 ? '51mm' : '65mm',
                      maxHeight: cardsPerPage === 20 ? '53mm' : '67mm',
                    }}
                  >
                    {/* 1. QR Code */}
                    {p.qrDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.qrDataUrl}
                        alt={`QR for ${p.name}`}
                        className={`object-contain shrink-0 mx-auto ${
                          cardsPerPage === 12
                            ? 'w-full max-w-[50mm] max-h-[50mm]'
                            : cardsPerPage === 16
                            ? 'w-full max-w-[42mm] max-h-[42mm]'
                            : 'w-full max-w-[35mm] max-h-[35mm]'
                        }`}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded animate-pulse" />
                    )}

                    {/* Bottom Info: Number & Name */}
                    <div className="w-full shrink-0 mt-0.5">
                      {/* 2. Number underneath */}
                      <div
                        className={`font-black font-mono text-slate-900 leading-none ${
                          cardsPerPage === 12 ? 'text-sm' : 'text-xs'
                        }`}
                      >
                        #{p.countNumber ?? p.participantId}
                      </div>

                      {/* 3. Name underneath */}
                      <div
                        className={`font-bold text-slate-800 mt-0.5 leading-tight truncate px-0.5 ${
                          cardsPerPage === 12 ? 'text-xs' : 'text-[11px]'
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
                      style={{
                        minHeight: cardsPerPage === 20 ? '51mm' : '65mm',
                        maxHeight: cardsPerPage === 20 ? '53mm' : '67mm',
                      }}
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
            size: A4 portrait;
            margin: 6mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
