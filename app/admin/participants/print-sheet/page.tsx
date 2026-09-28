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
  name: string
  fatherName: string
  qrToken: string
  qrDataUrl?: string
}

export default function BulkPrintSheetPage() {
  const [participants, setParticipants] = useState<ParticipantWithQR[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/participants/batch')
        const data = await res.json()
        const rawList: ParticipantWithQR[] = data.participants || []

        const withQRs = await Promise.all(
          rawList.map(async (p) => {
            const qrDataUrl = await QRCode.toDataURL(p.qrToken, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 160,
              color: { dark: '#000000', light: '#FFFFFF' },
            })
            return { ...p, qrDataUrl }
          })
        )

        setParticipants(withQRs)
      } catch (err) {
        console.error('Failed to load batch participants', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filtered = participants.filter((p) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      p.fatherName.toLowerCase().includes(term) ||
      p.participantId.toLowerCase().includes(term)
    )
  })

  // Group into pages of 8 cards each
  const CARDS_PER_PAGE = 8
  const pages: ParticipantWithQR[][] = []
  for (let i = 0; i < filtered.length; i += CARDS_PER_PAGE) {
    pages.push(filtered.slice(i, i + CARDS_PER_PAGE))
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* Top Toolbar (Hidden on Print) */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 shadow-xs print:hidden sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/participants"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Participants</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>A4 Bulk Card Print Sheets</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filtered.length} Cards
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by name / ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={() => window.print()}
              disabled={loading || filtered.length === 0}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-orange-600/20 flex items-center gap-2 text-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print {filtered.length} Passes</span>
              <span className="text-[11px] bg-orange-800/40 px-2 py-0.5 rounded-full font-mono">
                {pages.length} {pages.length === 1 ? 'Sheet' : 'Sheets'}
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>8 ID-sized cards per A4 page. 1,000 cards only take ~125 sheets.</span>
          </span>
          <span className="text-slate-400">
            Set printer margins to &quot;None&quot; or &quot;Minimum&quot; for optimal cut alignment.
          </span>
        </div>
      </header>

      {/* Printable Sheet View */}
      <main className="max-w-4xl mx-auto py-8 print:py-0 print:max-w-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Rendering A4 sheets and QR tokens...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400 text-sm">
            No participants found matching the filter.
          </div>
        ) : (
          pages.map((pageGroup, pageIndex) => (
            <div
              key={pageIndex}
              className="a4-sheet bg-white shadow-xl print:shadow-none mb-8 print:mb-0 p-6 print:p-3 rounded-2xl print:rounded-none border border-slate-200/80 print:border-none break-after-page"
              style={{
                pageBreakAfter: 'always',
                minHeight: '270mm',
              }}
            >
              {/* 2 columns × 4 rows = 8 cards */}
              <div className="grid grid-cols-2 gap-3.5 h-full">
                {pageGroup.map((p) => (
                  <div
                    key={p._id}
                    className="border-2 border-dashed border-slate-300 print:border-slate-400 rounded-xl p-3 flex flex-col justify-between bg-white relative"
                    style={{ minHeight: '62mm' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-orange-100 pb-1 mb-1">
                      <span className="text-[11px] font-bold text-orange-600 tracking-wider uppercase flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span>Navratri 2026</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {p.participantId}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex items-center gap-3 my-auto">
                      {p.qrDataUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.qrDataUrl}
                          alt={`QR for ${p.name}`}
                          className="w-24 h-24 shrink-0 rounded-lg border border-slate-100 p-0.5"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-slate-50 rounded-lg shrink-0 animate-pulse" />
                      )}

                      <div className="flex-1 min-w-0 pr-1">
                        <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                          {p.name}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium leading-snug">
                          Daughter of:
                        </p>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {p.fatherName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-tight font-medium">
                          Daily Distribution Pass
                        </p>
                      </div>
                    </div>

                    {/* Footer / Cut Marker */}
                    <div className="border-t border-slate-100 pt-1 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                      <span>★ 9-DAY PROP PASS</span>
                      <span className="flex items-center gap-0.5">
                        <Scissors className="w-2.5 h-2.5 text-slate-400" />
                        <span>CUT ALONG DASHED LINE</span>
                      </span>
                    </div>
                  </div>
                ))}

                {/* Empty slots on final sheet */}
                {Array.from({ length: CARDS_PER_PAGE - pageGroup.length }).map(
                  (_, emptyIdx) => (
                    <div
                      key={`empty-${emptyIdx}`}
                      className="border border-dashed border-slate-200 rounded-xl"
                      style={{ minHeight: '62mm' }}
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
