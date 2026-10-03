'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  Printer,
  Plus,
  Search,
  ChevronRight,
  Calendar,
  Loader2,
} from 'lucide-react'

interface Participant {
  _id: string
  participantId: string
  countNumber?: number
  name: string
  motherName?: string
  fatherName: string
  phone?: string
  address?: string
  category?: 'general' | 'obc' | 'sc' | 'st'
  status?: 'active' | 'cancelled'
  createdAt: string
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchParticipants = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/participants?q=${encodeURIComponent(q)}&limit=100`)
      const data = await res.json()
      setParticipants(data.participants || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const timer = setTimeout(fetchParticipants, 300)
    return () => clearTimeout(timer)
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

          <div className="flex items-center gap-3">
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

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="प्रतिभागी का नाम, पिता का नाम या आईडी से खोजें..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-xs placeholder:text-slate-400"
          />
        </div>

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
                          <Link
                            href={`/admin/participants/${p._id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>विवरण देखें</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
