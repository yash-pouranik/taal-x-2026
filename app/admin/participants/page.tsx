'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  Users,
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
  name: string
  fatherName: string
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
                Registered Participants
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {total}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Search, view claims matrix, download or print participant QR passes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/participants/print-sheet"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Bulk A4 Sheets</span>
            </Link>
            <Link
              href="/admin/participants/register"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-sm shadow-orange-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Register Girl</span>
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
            placeholder="Search by participant name, father's name, or ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-xs placeholder:text-slate-400"
          />
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Participant Name</th>
                  <th className="px-6 py-3.5">Parent / Guardian</th>
                  <th className="px-6 py-3.5">Registered On</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        <span>Searching participants...</span>
                      </div>
                    </td>
                  </tr>
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      No participants match your query.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.participantId}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="text-xs text-slate-400 mr-1.5 font-normal">
                          D/o
                        </span>
                        {p.fatherName}
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
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
