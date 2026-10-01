'use client'

import { useEffect, useState } from 'react'
import AdminNav from '@/components/AdminNav'
import {
  CalendarRange,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  Clock,
} from 'lucide-react'

export default function ConfigPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [entryStartTime, setEntryStartTime] = useState('19:00')
  const [entryEndTime, setEntryEndTime] = useState('21:30')
  const [exitStartTime, setExitStartTime] = useState('22:00')
  const [exitEndTime, setExitEndTime] = useState('00:30')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setStartDate(d.config.startDate || '')
          setEndDate(d.config.endDate || '')
          setEntryStartTime(d.config.entryStartTime || '19:00')
          setEntryEndTime(d.config.entryEndTime || '21:30')
          setExitStartTime(d.config.exitStartTime || '22:00')
          setExitEndTime(d.config.exitEndTime || '00:30')
        }
      })
      .finally(() => setFetching(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          entryStartTime,
          entryEndTime,
          exitStartTime,
          exitEndTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update configuration')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Event Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure Navratri distribution dates. All calculations strictly use{' '}
            <strong className="text-slate-800">Asia/Kolkata (IST)</strong> timezone.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-8 sm:p-10">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="text-xs">Loading event settings...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Navratri Distribution Window
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defines Day 1 to Day 9 mapping for QR verification
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Start Date (Day 1)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    End Date (Day 9)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Daily Operating Time Windows */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daily Operational Time Windows (IST)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Entry Window */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Entry Time Window</span>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Arrival</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={entryStartTime}
                          onChange={(e) => setEntryStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">End Time</label>
                        <input
                          type="time"
                          value={entryEndTime}
                          onChange={(e) => setEntryEndTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exit Window */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Exit Time Window</span>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Departure</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={exitStartTime}
                          onChange={(e) => setExitStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">End Time</label>
                        <input
                          type="time"
                          value={exitEndTime}
                          onChange={(e) => setExitEndTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timezone Info */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Business timezone enforced server-side:{' '}
                  <strong className="text-slate-900 font-mono">Asia/Kolkata (IST)</strong>
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">
                    Event configuration saved successfully.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-orange-300 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-orange-600/20 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Event Dates</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Warning Callout */}
        <div className="mt-5 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Important:</strong> Changing event dates mid-festival alters the calculated day numbers for prior distribution records. Only adjust prior to Day 1 or if event dates officially change.
          </div>
        </div>
      </main>
    </div>
  )
}
