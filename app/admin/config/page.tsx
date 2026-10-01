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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            कार्यक्रम तिथियां व समय सेटिंग्स
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            नवरात्रि वितरण तिथियां और समय निर्धारित करें। सभी गणनाएं पूरी तरह से{' '}
            <strong className="text-slate-800">Asia/Kolkata (IST)</strong> समय अनुसार होती हैं।
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-10">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="text-xs">सेटिंग्स लोड हो रही हैं...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    नवरात्रि वितरण अवधि (९ दिन)
                  </h2>
                  <p className="text-xs text-slate-400">
                    QR सत्यापन हेतु दिवस १ से दिवस ९ का निर्धारण
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    प्रारंभ तिथि (दिवस १)
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
                    समाप्ति तिथि (दिवस ९)
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
                    दैनिक संचालन समय सीमा (IST)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Entry Window */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">प्रवेश समय सीमा (Entry)</span>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">आगमन</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">शुरू समय</label>
                        <input
                          type="time"
                          value={entryStartTime}
                          onChange={(e) => setEntryStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">समाप्ति समय</label>
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
                      <span className="text-xs font-bold text-slate-700">प्रस्थान समय सीमा (Exit)</span>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">प्रस्थान</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">शुरू समय</label>
                        <input
                          type="time"
                          value={exitStartTime}
                          onChange={(e) => setExitStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">समाप्ति समय</label>
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
                  सर्वर द्वारा निर्धारित समय क्षेत्र:{' '}
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
                    कार्यक्रम सेटिंग्स सफलतापूर्वक सुरक्षित कर दी गईं।
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
                    <span>सेटिंग्स सुरक्षित हो रही हैं...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>सेटिंग्स सुरक्षित करें</span>
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
            <strong>महत्वपूर्ण सूचना:</strong> उत्सव के बीच में तिथियां बदलने से पहले के वितरण रिकॉर्ड की दिवस संख्या बदल सकती है। इसे केवल दिवस १ से पहले या आधिकारिक तिथि परिवर्तन होने पर ही बदलें।
          </div>
        </div>
      </main>
    </div>
  )
}
