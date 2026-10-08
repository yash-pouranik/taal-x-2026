'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  Printer,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Loader2,
  UploadCloud,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react'
import EditParticipantModal from '@/components/EditParticipantModal'

interface Participant {
  _id: string
  participantId: string
  countNumber?: number
  name: string
  motherName?: string
  fatherName: string
  phone?: string
  address?: string
  category?: 'general' | 'obc' | 'sc' | 'st' | null
  status?: 'active' | 'cancelled'
  createdAt: string
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [fromCount, setFromCount] = useState('')
  const [toCount, setToCount] = useState('')
  const [detectedRange, setDetectedRange] = useState<{ from: number; to: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | 'all'>('all')
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)

  const [debouncedQ, setDebouncedQ] = useState('')
  const [debouncedFrom, setDebouncedFrom] = useState('')
  const [debouncedTo, setDebouncedTo] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q)
      setDebouncedFrom(fromCount)
      setDebouncedTo(toCount)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [q, fromCount, toCount])

  const fetchParticipants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim())
      if (debouncedFrom.trim()) params.set('from', debouncedFrom.trim())
      if (debouncedTo.trim()) params.set('to', debouncedTo.trim())
      params.set('page', String(page))
      params.set('limit', String(pageSize))

      const res = await fetch(`/api/participants?${params.toString()}`)
      const data = await res.json()
      setParticipants(data.participants || [])
      setTotal(data.total || 0)
      setDetectedRange(data.detectedRange || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, debouncedFrom, debouncedTo, page, pageSize])

  useEffect(() => {
    fetchParticipants()
  }, [fetchParticipants])

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                पंजीकृत प्रतिभागी
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {total}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              प्रतिभागी खोजें, वितरण सारणी देखें, और QR पास प्रिंट/डाउनलोड करें।
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/participants/import"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-xs"
            >
              <UploadCloud className="w-4 h-4 text-orange-600" />
              <span>बल्क JSON इम्पोर्ट</span>
            </Link>
            <Link
              href="/admin/participants/print-sheet"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>A4 शीट प्रिंट करें</span>
            </Link>
            <Link
              href="/admin/participants/register"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-sm shadow-orange-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>नया पंजीकरण</span>
            </Link>
          </div>
        </div>

        {/* Search & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="खोजें (उदा. नाम, मोबाइल, या रेंज जैसे 262 or 278, 262-278)..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-xs placeholder:text-slate-400"
            />
          </div>

          {/* Quick Range Inputs */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs text-xs">
            <span className="font-semibold text-slate-700 whitespace-nowrap">रेंज:</span>
            <input
              type="number"
              placeholder="से"
              value={fromCount}
              onChange={(e) => setFromCount(e.target.value)}
              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="number"
              placeholder="तक"
              value={toCount}
              onChange={(e) => setToCount(e.target.value)}
              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {(fromCount !== '' || toCount !== '') && (
              <button
                onClick={() => {
                  setFromCount('')
                  setToCount('')
                }}
                className="text-red-500 hover:text-red-700 font-bold text-xs ml-1 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-colors"
                title="रेंज हटाएं"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs shrink-0 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">दिखाएं:</span>
            <div className="flex items-center gap-1">
              {(['all', 50, 100, 200] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    pageSize === size
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {size === 'all' ? 'सभी (All)' : size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Range Banner */}
        {(detectedRange || (fromCount && toCount)) && (
          <div className="flex items-center gap-2 mb-4 bg-orange-50 border border-orange-200 text-orange-950 px-3.5 py-2 rounded-xl text-xs w-fit shadow-2xs">
            <span className="font-bold text-orange-700">🎯 क्रमांक रेंज सक्रिय:</span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-orange-200">
              #{detectedRange?.from ?? fromCount} से #{detectedRange?.to ?? toCount}
            </span>
            <span className="text-orange-800 font-medium">
              ({total} प्रतिभागी मिले)
            </span>
            <button
              onClick={() => {
                setFromCount('')
                setToCount('')
                setQ('')
              }}
              className="text-orange-700 hover:text-orange-950 font-bold text-xs bg-orange-200/70 hover:bg-orange-200 px-1.5 py-0.5 rounded ml-1 transition-colors"
              title="रेंज हटाएं"
            >
              ✕ हटाएं
            </button>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">आईडी / क्रमांक</th>
                  <th className="px-5 py-3.5">बच्ची का नाम</th>
                  <th className="px-5 py-3.5">माता व पिता</th>
                  <th className="px-5 py-3.5">मोबाइल व पता</th>
                  <th className="px-5 py-3.5">स्थिति</th>
                  <th className="px-5 py-3.5">पंजीकरण</th>
                  <th className="px-5 py-3.5 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        <span>प्रतिभागी खोजे जा रहे हैं...</span>
                      </div>
                    </td>
                  </tr>
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      कोई प्रतिभागी नहीं मिला।
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => {
                    const isCancelled = p.status === 'cancelled'
                    return (
                      <tr
                        key={p._id}
                        className={`transition-colors group ${
                          isCancelled
                            ? 'bg-red-50/30 hover:bg-red-50/50'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* ID & Count Number */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded w-fit ${
                                isCancelled
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.participantId}
                            </span>
                            {p.countNumber && (
                              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                                #{p.countNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Girl's Name & Category */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-semibold ${
                                isCancelled
                                  ? 'text-slate-500 line-through'
                                  : 'text-slate-900'
                              }`}
                            >
                              {p.name}
                            </span>
                            {p.category && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {p.category}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Mother & Father */}
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {p.motherName && (
                            <div className="text-slate-700">
                              <span className="text-slate-400 mr-1">माता:</span>
                              {p.motherName}
                            </div>
                          )}
                          <div className="text-slate-700">
                            <span className="text-slate-400 mr-1">पिता:</span>
                            {p.fatherName}
                          </div>
                        </td>

                        {/* Phone & Address */}
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {p.phone && (
                            <div className="font-mono text-slate-800 font-medium">
                              {p.phone}
                            </div>
                          )}
                          {p.address && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={p.address}>
                              {p.address}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isCancelled
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isCancelled ? 'रद्द' : 'सक्रिय'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(p.createdAt).toLocaleDateString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/participants/print-sheet?ids=${p.countNumber ?? p.participantId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                              title="इस प्रतिभागी का QR शीट में प्रिंट करें"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>शीट</span>
                            </Link>
                            <button
                              onClick={() => setEditingParticipant(p)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                              title="विवरण एडिट करें"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span>एडिट</span>
                            </button>
                            <Link
                              href={`/admin/participants/${p._id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <span>विवरण</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Footer / Pagination */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 px-1">
          <div>
            <span>
              कुल <strong>{total}</strong> में से <strong>{participants.length}</strong> प्रतिभागी प्रदर्शित
            </span>
            {pageSize !== 'all' && total > (typeof pageSize === 'number' ? pageSize : 0) && (
              <span className="ml-2 text-slate-400">
                (पृष्ठ {page} / {Math.ceil(total / (typeof pageSize === 'number' ? pageSize : 1))})
              </span>
            )}
          </div>

          {pageSize !== 'all' && total > (typeof pageSize === 'number' ? pageSize : 0) && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>पिछला</span>
              </button>
              <span className="px-2 font-mono font-bold text-slate-800">
                {page} / {Math.ceil(total / (typeof pageSize === 'number' ? pageSize : 1))}
              </span>
              <button
                disabled={
                  page >= Math.ceil(total / (typeof pageSize === 'number' ? pageSize : 1)) ||
                  loading
                }
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs font-semibold"
              >
                <span>अगला</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <EditParticipantModal
          isOpen={!!editingParticipant}
          onClose={() => setEditingParticipant(null)}
          participant={editingParticipant}
          onSuccess={(updated) => {
            setParticipants((prev) =>
              prev.map((item) =>
                item._id === updated._id ? ({ ...item, ...updated } as Participant) : item
              )
            )
            setEditingParticipant(null)
          }}
        />
      </main>
    </div>
  )
}
