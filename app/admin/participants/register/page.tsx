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
  Heart,
  Phone,
  MapPin,
  Tag,
  Hash,
  AlertCircle,
  Loader2,
  Printer,
  Sparkles,
} from 'lucide-react'

export default function RegisterParticipantPage() {
  const [name, setName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [countNumber, setCountNumber] = useState('')
  const [category, setCategory] = useState<'general' | 'obc' | 'sc' | 'st'>('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isTechnicalError, setIsTechnicalError] = useState(false)
  const [success, setSuccess] = useState<{
    _id: string
    participantId: string
    countNumber?: number
    name: string
    motherName?: string
    fatherName: string
    phone?: string
    address?: string
    category?: string
    rawToken: string
    dataUrl: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsTechnicalError(false)

    if (!name.trim()) {
      setError('कृपया बच्ची का नाम दर्ज करें।')
      setIsTechnicalError(false)
      return
    }
    if (!motherName.trim()) {
      setError('कृपया माता जी का नाम दर्ज करें।')
      setIsTechnicalError(false)
      return
    }
    if (!fatherName.trim()) {
      setError('कृपया पिता जी का नाम दर्ज करें।')
      setIsTechnicalError(false)
      return
    }
    if (!phone.trim()) {
      setError('कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।')
      setIsTechnicalError(false)
      return
    }

    const cleanPhone = phone.trim().replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      setError('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9893335885)।')
      setIsTechnicalError(false)
      return
    }

    if (countNumber && (isNaN(Number(countNumber)) || Number(countNumber) <= 0)) {
      setError('क्रमांक एक मान्य धनात्मक संख्या (Positive Number) होना चाहिए।')
      setIsTechnicalError(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          motherName: motherName.trim(),
          fatherName: fatherName.trim(),
          phone: cleanPhone,
          address: address.trim(),
          countNumber: countNumber ? Number(countNumber) : undefined,
          category,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'पंजीकरण करने में समस्या आई। कृपया वेबसाइट वाले से संपर्क करें।')
        setIsTechnicalError(Boolean(data.isTechnicalError || res.status >= 500))
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
        countNumber: data.participant.countNumber,
        name: data.participant.name,
        motherName: data.participant.motherName,
        fatherName: data.participant.fatherName,
        phone: data.participant.phone,
        address: data.participant.address,
        category: data.participant.category,
        rawToken: qrData.rawToken,
        dataUrl: qrData.dataUrl,
      })
    } catch {
      setError('इंटरनेट कनेक्शन या सर्वर में समस्या आई है। कृपया इंटरनेट जांचें या वेबसाइट वाले (तकनीकी टीम) से संपर्क करें।')
      setIsTechnicalError(true)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSuccess(null)
    setName('')
    setMotherName('')
    setFatherName('')
    setPhone('')
    setAddress('')
    setCountNumber('')
    setCategory('general')
  }

  const categoryLabel: Record<string, string> = {
    general: 'सामान्य (General)',
    obc: 'अन्य पिछड़ा वर्ग (OBC)',
    sc: 'अनुसूचित जाति (SC)',
    st: 'अनुसूचित जनजाति (ST)',
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
            बच्ची एवं अभिभावक का विवरण दर्ज करें। तुरंत एक विशिष्ट QR कोड जनरेट होगा।
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {success.participantId}
              </span>
              {success.countNumber && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                  क्रमांक: #{success.countNumber}
                </span>
              )}
              {success.category && (
                <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  {success.category}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              {success.name}
            </h2>
            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
              <p>
                {success.motherName && <span>माता: <strong className="text-slate-700">{success.motherName}</strong> | </span>}
                पिता: <strong className="text-slate-700">{success.fatherName}</strong>
              </p>
              {success.phone && (
                <p>मोबाइल: <strong className="text-slate-700 font-mono">{success.phone}</strong></p>
              )}
              {success.address && (
                <p>पता: <strong className="text-slate-700">{success.address}</strong></p>
              )}
            </div>

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
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>अन्य पंजीकरण करें</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Bachi Ka Naam */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  बच्ची का नाम (Bachi Ka Naam) *
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

              {/* Parents: Mata Ji & Pita Ji (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    माता जी का नाम (Mata Ji Name) *
                  </label>
                  <div className="relative">
                    <Heart className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      placeholder="उदा. सुनीता शर्मा"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    पिता जी का नाम (Pita Ji Name) *
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
              </div>

              {/* Phone & Category (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    फोन नंबर (Phone Number) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={10}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400 font-mono"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    श्रेणी / वर्ग (Category) *
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as 'general' | 'obc' | 'sc' | 'st')}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="general">सामान्य (General)</option>
                      <option value="obc">अन्य पिछड़ा वर्ग (OBC)</option>
                      <option value="sc">अनुसूचित जाति (SC)</option>
                      <option value="st">अनुसूचित जनजाति (ST)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Count Number & Address (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    काउंट नंबर (Count No.)
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      value={countNumber}
                      onChange={(e) => setCountNumber(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400 font-mono"
                      placeholder="स्वतः सेट"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    पता (Address)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      placeholder="मोहल्ला, वार्ड, या शहर का नाम"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50/90 border-2 border-red-200 rounded-2xl p-4 sm:p-5 text-red-900 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-red-900 mb-1">
                        पंजीकरण विफल (Registration Error)
                      </h3>
                      <p className="text-xs sm:text-sm text-red-800 leading-relaxed font-medium">
                        {error}
                      </p>
                      {isTechnicalError && (
                        <div className="mt-3 pt-3 border-t border-red-200/80 flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-100/60 p-2.5 rounded-xl">
                          <span>📞</span>
                          <span>
                            यदि यह समस्या पुनः आती है, तो कृपया <strong>वेबसाइट वाले (तकनीकी टीम / डेवलपर)</strong> से संपर्क करें।
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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
