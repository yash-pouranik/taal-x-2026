'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, ArrowLeft, Flame, Loader2 } from 'lucide-react'

interface Participant {
  participantId: string
  countNumber?: number
  name: string
  motherName?: string
  fatherName: string
  phone?: string
  address?: string
  category?: string
}

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [pRes, qrRes] = await Promise.all([
        fetch(`/api/participants/${id}`),
        fetch(`/api/participants/${id}/qr?format=dataurl`),
      ])
      const pData = await pRes.json()
      const qrData = await qrRes.json()
      setParticipant(pData.participant)
      setQrDataUrl(qrData.dataUrl)
    }
    load()
  }, [id])

  if (!participant || !qrDataUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-sm font-medium">प्रिंट पास तैयार हो रहा है...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white flex flex-col items-center justify-center p-6 print:p-0">
      {/* Top action bar (hidden on print) */}
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link
          href={`/admin/participants/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>प्रोफ़ाइल पर वापस जाएं</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl font-semibold text-xs shadow-sm shadow-orange-600/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>पास प्रिंट करें</span>
        </button>
      </div>

      {/* The Printable Card */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl print:shadow-none print:border-slate-800 print:rounded-2xl">
        {/* 1. QR Code */}
        <div className="p-4 bg-white rounded-2xl border-2 border-slate-300 inline-block shadow-xs mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            className="w-52 h-52 mx-auto rounded-lg"
          />
        </div>

        {/* 2. Count Number */}
        <div className="mb-2">
          <span className="font-mono text-xl font-black px-4 py-1.5 rounded-xl bg-orange-100 text-orange-950 border border-orange-300 inline-block">
            #{participant.countNumber ?? participant.participantId}
          </span>
        </div>

        {/* 3. Kanya Ka Naam */}
        <div className="mt-2">
          <h2 className="text-2xl font-black text-slate-900">
            {participant.name}
          </h2>
        </div>
      </div>
    </div>
  )
}
