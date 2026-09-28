'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, ArrowLeft, Flame, Loader2 } from 'lucide-react'

interface Participant {
  participantId: string
  name: string
  fatherName: string
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
          <span className="text-sm font-medium">Preparing printable pass...</span>
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
          <span>Back to Profile</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl font-semibold text-xs shadow-sm shadow-orange-600/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print Pass</span>
        </button>
      </div>

      {/* The Printable Card */}
      <div className="bg-white border-2 border-orange-400/80 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl shadow-slate-200/50 print:shadow-none print:border-slate-800 print:rounded-2xl">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 mb-2">
          <Flame className="w-5 h-5 fill-orange-500/20" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          NAVRATRI 2026
        </h1>
        <p className="text-xs uppercase tracking-widest font-semibold text-orange-600 mt-0.5 mb-6">
          Daily Prop Pass
        </p>

        {/* QR Code */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 inline-block shadow-xs mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code"
            className="w-48 h-48 mx-auto rounded-xl"
          />
        </div>

        {/* Participant Details */}
        <div className="border-t border-slate-100 pt-4">
          <h2 className="text-xl font-bold text-slate-900">
            {participant.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Daughter of {participant.fatherName}
          </p>
          <div className="mt-2.5 inline-block">
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-800">
              {participant.participantId}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
          Please present this QR pass at the distribution counter each day.
        </p>
      </div>
    </div>
  )
}
