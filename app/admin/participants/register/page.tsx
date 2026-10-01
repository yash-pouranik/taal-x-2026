'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  UserPlus,
  User,
  AlertCircle,
  Loader2,
  Printer,
  Sparkles,
} from 'lucide-react'

export default function RegisterParticipantPage() {
  const [name, setName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    _id: string
    participantId: string
    name: string
    rawToken: string
    dataUrl: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fatherName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'पंजीकरण विफल रहा')
        return
      }

      // Fetch QR as dataURL
      const qrRes = await fetch(
        `/api/participants/${data.participant._id}/qr?format=dataurl`,
        { method: 'GET' }
      )
      const qrData = await qrRes.json()

      setSuccess({
        _id: data.participant._id,
        participantId: data.participant.participantId,
        name: data.participant.name,
        rawToken: qrData.rawToken,
        dataUrl: qrData.dataUrl,
      })
    } catch {
      setError('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <Link
            href="/admin/participants"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>प्रतिभागी सूची पर वापस जाएं</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            नया प्रतिभागी पंजीकरण
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            प्रतिभागी का नाम और पिता का नाम दर्ज करें। तुरंत एक विशिष्ट QR कोड जनरेट होगा।
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {success.participantId}
            </span>

            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              {success.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              सफलतापूर्वक पंजीकृत हुआ! QR कोड तैयार और सुरक्षित है।
            </p>

            <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={success.dataUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto rounded-xl shadow-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/admin/participants/${success._id}/print`}
                className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>पास प्रिंट करें</span>
              </Link>
              <a
                href={success.dataUrl}
                download={`qr-${success.participantId}.png`}
                className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>QR डाउनलोड करें</span>
              </a>
              <button
                onClick={() => {
                  setSuccess(null)
                  setName('')
                  setFatherName('')
                }}
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>अन्य पंजीकरण करें</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  प्रतिभागी का पूरा नाम *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                    placeholder="उदा. प्रिया शर्मा"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  पिता / अभिभावक का नाम *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                    placeholder="उदा. रमेश शर्मा"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-orange-300 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-orange-600/20 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>QR कोड जनरेट व सुरक्षित हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>पंजीकरण करें व QR कोड बनाएं</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
