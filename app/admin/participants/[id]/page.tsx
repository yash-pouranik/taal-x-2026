'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  ArrowLeft,
  Printer,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  UserX,
  Trash2,
  ShieldCheck,
  Gift,
  UtensilsCrossed,
  LogIn,
  LogOut as ExitIcon,
  Pencil,
} from 'lucide-react'
import EditParticipantModal from '@/components/EditParticipantModal'

interface DayGrid {
  day: number
  date: string
  claimed: boolean
  entryWindow?: { start: string; end: string }
  exitWindow?: { start: string; end: string }
  entryTime?: string
  exitTime?: string
  hasEntered?: boolean
  hasExited?: boolean
  isCurrentlyInside?: boolean
  durationSpent?: string
  gift?: {
    claimed: boolean
    claimedAt?: string
    staffName?: string
  }
  food?: {
    claimed: boolean
    claimedAt?: string
    staffName?: string
  }
  claimInfo?: {
    claimedAt: string
    navratriDay: number
    claimedByStaffId: { name: string }
  }
}

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
  cancelledAt?: string
  createdAt: string
}

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [dayGrid, setDayGrid] = useState<DayGrid[]>([])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function loadQR() {
    setQrLoading(true)
    try {
      const res = await fetch(`/api/participants/${id}/qr?format=dataurl`)
      const data = await res.json()
      setQrDataUrl(data.dataUrl)
    } finally {
      setQrLoading(false)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/participants/${id}`)
      const data = await res.json()
      setParticipant(data.participant)
      setDayGrid(data.dayGrid || [])
      loadQR()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleConfirmRegenerate() {
    setShowRegenModal(false)
    setQrLoading(true)
    try {
      const res = await fetch(`/api/participants/${id}/qr`, { method: 'POST' })
      const data = await res.json()
      setQrDataUrl(data.dataUrl)
    } finally {
      setQrLoading(false)
    }
  }

  // Cancel registration
  async function handleConfirmCancel() {
    setShowCancelModal(false)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      const data = await res.json()
      if (res.ok && data.participant) {
        setParticipant(data.participant)
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Reactivate registration
  async function handleConfirmReactivate() {
    setShowReactivateModal(false)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      const data = await res.json()
      if (res.ok && data.participant) {
        setParticipant(data.participant)
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Delete registration permanently
  async function handleConfirmDelete() {
    setShowDeleteModal(false)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/admin/participants')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/70">
        <AdminNav />
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Loading participant details...</span>
        </div>
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-slate-50/70">
        <AdminNav />
        <div className="max-w-md mx-auto py-24 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Participant Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">This record may have been deleted.</p>
          <Link
            href="/admin/participants"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-orange-600 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to participants</span>
          </Link>
        </div>
      </div>
    )
  }

  const isCancelled = participant.status === 'cancelled'

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      {/* Confirmation Dialog: Regenerate QR */}
      <ConfirmDialog
        isOpen={showRegenModal}
        title="नया QR कोड बनाएं (पुराना रद्द होगा)?"
        description="यह प्रक्रिया एक नया गोपनीय QR टोकन बनाएगी। प्रतिभागी का पुराना भौतिक कार्ड अमान्य हो जाएगा और काउंटर पर अस्वीकार कर दिया जाएगा।"
        confirmText="हाँ, नया QR बनाएं"
        cancelText="रद्द करें"
        variant="warning"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenModal(false)}
      />

      {/* Confirmation Dialog: Cancel Registration */}
      <ConfirmDialog
        isOpen={showCancelModal}
        title={`क्या आप ${participant.name} का पास रद्द करना चाहते हैं?`}
        description="पास रद्द करने से QR कोड तुरंत निष्क्रिय हो जाएगा। वितरण काउंटर पर स्वयंसेवक इसे स्कैन नहीं कर सकेंगे। आप इसे बाद में पुनः सक्रिय भी कर सकते हैं।"
        confirmText="हाँ, पास रद्द करें"
        cancelText="सक्रिय ही रखें"
        variant="warning"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Confirmation Dialog: Reactivate Registration */}
      <ConfirmDialog
        isOpen={showReactivateModal}
        title={`पास पुनः सक्रिय करें (${participant.name})?`}
        description="प्रतिभागी को पुनः सक्रिय (Active) कर दिया जाएगा। उनका QR पास दैनिक वितरण के लिए दोबारा मान्य हो जाएगा।"
        confirmText="हाँ, पुनः सक्रिय करें"
        cancelText="रद्द ही रखें"
        variant="primary"
        onConfirm={handleConfirmReactivate}
        onCancel={() => setShowReactivateModal(false)}
      />

      {/* Confirmation Dialog: Delete Permanently */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title={`स्थायी रूप से हटाएं (${participant.name})?`}
        description={`यह क्रिया ${participant.name} (${participant.participantId}) और उनके पूरे वितरण इतिहास को डेटाबेस से पूरी तरह मिटा देगी। यह वापस नहीं किया जा सकता।`}
        confirmText="स्थायी रूप से हटाएं"
        cancelText="रद्द करें"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Edit Participant Modal */}
      <EditParticipantModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        participant={participant}
        onSuccess={(updated) => {
          setParticipant((prev) => (prev ? ({ ...prev, ...updated } as Participant) : null))
          setShowEditModal(false)
        }}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin/participants"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>प्रतिभागी सूची पर वापस जाएं</span>
          </Link>

          {/* Registration Status Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isCancelled
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCancelled ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
            <span>{isCancelled ? 'रजिस्ट्रेशन रद्द (Cancelled)' : 'सक्रिय पास (Active)'}</span>
          </span>
        </div>

        {/* Cancellation Notice Banner (Visible only if cancelled) */}
        {isCancelled && (
          <div className="mb-6 bg-red-50 border border-red-200/80 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  यह रजिस्ट्रेशन रद्द किया जा चुका है
                </h3>
                <p className="text-xs text-red-700 mt-1">
                  इस प्रतिभागी का QR कोड निष्क्रिय है। स्कैनर पर यह पास रद्द दिखाई देगा और कोई सामग्री नहीं दी जा सकेगी।
                  {participant.cancelledAt && (
                    <span className="block mt-0.5 text-red-600/80">
                      रद्द करने की तिथि: {new Date(participant.cancelledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowReactivateModal(true)}
              disabled={actionLoading}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs"
            >
              पुनः सक्रिय करें
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Details + 9-Day Grid */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Info Header */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800">
                      {participant.participantId}
                    </span>
                    {participant.countNumber && (
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        क्रमांक: #{participant.countNumber}
                      </span>
                    )}
                    {participant.category && (
                      <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {participant.category}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      पंजीकरण तिथि:{' '}
                      {new Date(participant.createdAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                  </div>
                  <h1
                    className={`text-2xl font-bold tracking-tight mt-2 ${
                      isCancelled
                        ? 'text-slate-500 line-through'
                        : 'text-slate-900'
                    }`}
                  >
                    {participant.name}
                  </h1>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    {participant.motherName && (
                      <p className="font-medium text-slate-600 flex items-center gap-1.5">
                        <span className="text-slate-400">माता जी:</span>
                        <span className="text-slate-800 font-semibold">{participant.motherName}</span>
                      </p>
                    )}
                    <p className="font-medium text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400">पिता जी:</span>
                      <span className="text-slate-800 font-semibold">{participant.fatherName}</span>
                    </p>
                    {participant.phone && (
                      <p className="font-medium text-slate-600 flex items-center gap-1.5">
                        <span className="text-slate-400">मोबाइल:</span>
                        <span className="text-slate-800 font-mono font-semibold">{participant.phone}</span>
                      </p>
                    )}
                    {participant.address && (
                      <p className="font-medium text-slate-600 flex items-center gap-1.5">
                        <span className="text-slate-400">पता:</span>
                        <span className="text-slate-800">{participant.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                    <span>एडिट करें</span>
                  </button>

                  {!isCancelled && (
                    <Link
                      href={`/admin/participants/${id}/print`}
                      className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>आईडी कार्ड प्रिंट करें</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* 9-Day Distribution Matrix */}
            {/* 9-Day Distribution Matrix */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    {dayGrid.length > 0 ? `${dayGrid.length} दिवसीय` : ''} वितरण एवं उपस्थिति सारणी
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    उपहार/प्रॉप, भोजन पैकेट और प्रवेश/प्रस्थान समय का अलग-अलग विवरण।
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5" /> वितरित
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                    <XCircle className="w-3.5 h-3.5" /> बाकी
                  </span>
                </div>
              </div>

              {dayGrid.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  कार्यक्रम तिथियां सेटिंग्स में कॉन्फ़िगर नहीं हैं।
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                        <th className="py-3 px-4 rounded-l-xl">दिन व तारीख</th>
                        <th className="py-3 px-3">प्रवेश (Entry)</th>
                        <th className="py-3 px-3">उपहार / प्रॉप (Gift)</th>
                        <th className="py-3 px-3">भोजन पैकेट (Bhojan)</th>
                        <th className="py-3 px-4 rounded-r-xl">प्रस्थान (Exit) व अवधि</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {dayGrid.map((d) => {
                        const isGiftClaimed = d.gift?.claimed ?? d.claimed
                        const isFoodClaimed = d.food?.claimed ?? false

                        return (
                          <tr key={d.day} className="hover:bg-slate-50/50 transition-colors">
                            {/* Day & Date */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 bg-orange-100/70 text-orange-800 text-[11px] px-2 py-0.5 rounded-md">
                                  दिवस {d.day}
                                </span>
                                <span className="text-slate-600 text-xs font-mono">
                                  {d.date}
                                </span>
                              </div>
                            </td>

                            {/* Entry Window & Actual Entry */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {d.hasEntered || d.entryTime ? (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <LogIn className="w-3 h-3 text-emerald-600" />
                                    प्रवेश दर्ज
                                  </span>
                                  <span className="text-[10px] text-slate-500 pl-1 font-mono">
                                    {new Date(d.entryTime!).toLocaleTimeString('en-IN', {
                                      timeZone: 'Asia/Kolkata',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {d.isCurrentlyInside && (
                                    <span className="text-[10px] text-emerald-600 font-semibold pl-1">
                                      🟢 अभी अंदर हैं ({d.durationSpent || '0 मिनट'} से)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100/60 px-2 py-0.5 rounded-md text-[11px]">
                                    <LogIn className="w-3 h-3 text-slate-400" />
                                    <span>विंडो: {d.entryWindow ? `${d.entryWindow.start} - ${d.entryWindow.end}` : '19:00 - 21:30'}</span>
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Gift / Prop Status */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {isGiftClaimed ? (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <Gift className="w-3 h-3 text-emerald-600" />
                                    वितरित
                                  </span>
                                  {(d.gift?.claimedAt || d.claimInfo?.claimedAt) && (
                                    <span className="text-[10px] text-slate-400 pl-1 font-mono">
                                      {new Date(d.gift?.claimedAt || d.claimInfo!.claimedAt).toLocaleTimeString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                      {d.gift?.staffName ? ` (${d.gift.staffName})` : ''}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-md text-[11px]">
                                  <Gift className="w-3 h-3 text-slate-300" />
                                  बाकी
                                </span>
                              )}
                            </td>

                            {/* Food Packet (Bhojan) Status */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {isFoodClaimed ? (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <UtensilsCrossed className="w-3 h-3 text-emerald-600" />
                                    वितरित
                                  </span>
                                  {d.food?.claimedAt && (
                                    <span className="text-[10px] text-slate-400 pl-1 font-mono">
                                      {new Date(d.food.claimedAt).toLocaleTimeString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                      {d.food?.staffName ? ` (${d.food.staffName})` : ''}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100/60 px-2 py-0.5 rounded-md text-[11px]">
                                  <UtensilsCrossed className="w-3 h-3 text-slate-300" />
                                  बाकी
                                </span>
                              )}
                            </td>

                            {/* Exit Window & Actual Exit / Duration */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {d.hasExited || d.exitTime ? (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <ExitIcon className="w-3 h-3 text-blue-600" />
                                    प्रस्थान दर्ज
                                  </span>
                                  <span className="text-[10px] text-slate-500 pl-1 font-mono">
                                    {new Date(d.exitTime!).toLocaleTimeString('en-IN', {
                                      timeZone: 'Asia/Kolkata',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {d.durationSpent && (
                                    <span className="text-[10px] text-slate-600 pl-1 font-medium">
                                      कुल समय: {d.durationSpent}
                                    </span>
                                  )}
                                </div>
                              ) : d.isCurrentlyInside ? (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    अभी अंदर हैं
                                  </span>
                                  <span className="text-[10px] text-slate-400 pl-1">
                                    प्रस्थान दर्ज नहीं हुआ
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100/60 px-2 py-0.5 rounded-md text-[11px]">
                                    <ExitIcon className="w-3 h-3 text-slate-400" />
                                    <span>विंडो: {d.exitWindow ? `${d.exitWindow.start} - ${d.exitWindow.end}` : '22:00 - 00:30'}</span>
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Danger Zone: Cancellation & Permanent Delete Card */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                पास व रजिस्ट्रेशन प्रबंधन
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                इस प्रतिभागी का पास रद्द करें या रिकॉर्ड स्थायी रूप से हटाएं।
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {isCancelled ? (
                  <button
                    onClick={() => setShowReactivateModal(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>पास पुनः सक्रिय करें</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 border border-amber-300 hover:bg-amber-50 text-amber-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <UserX className="w-4 h-4 text-amber-600" />
                    <span>पास रद्द करें</span>
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>स्थायी रूप से हटाएं</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): QR Code Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7 text-center">
              <h2 className="font-bold text-base text-slate-900 text-left mb-1">
                प्रतिभागी QR पास
              </h2>
              <p className="text-xs text-slate-500 text-left mb-5">
                {isCancelled
                  ? 'रजिस्ट्रेशन रद्द होने के कारण QR कोड निष्क्रिय है।'
                  : 'स्कैन हेतु तैयार डिजिटल QR पास।'}
              </p>

              {qrLoading ? (
                <div className="w-48 h-48 mx-auto flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : qrDataUrl ? (
                <div className="space-y-4">
                  <div
                    className={`p-3 rounded-2xl border inline-block shadow-xs relative ${
                      isCancelled
                        ? 'bg-red-50/50 border-red-200 opacity-60'
                        : 'bg-slate-50/80 border-slate-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={`QR for ${participant.name}`}
                      className="w-48 h-48 mx-auto rounded-xl"
                    />

                    {isCancelled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-xs rounded-2xl">
                        <span className="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                          रद्द (Cancelled)
                        </span>
                      </div>
                    )}
                  </div>

                  {!isCancelled ? (
                    <div className="space-y-2">
                      <Link
                        href={`/admin/participants/${id}/print`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        <span>आईडी कार्ड प्रिंट करें</span>
                      </Link>

                      <a
                        href={qrDataUrl}
                        download={`qr-${participant.participantId}.png`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>QR इमेज डाउनलोड करें</span>
                      </a>

                      <button
                        onClick={() => setShowRegenModal(true)}
                        className="w-full inline-flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>कार्ड खोने पर नया QR बनाएं</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 font-medium">
                      पास निष्क्रिय है। कार्ड प्रिंटिंग और सामग्री वितरण के लिए ऊपर दिए गए बटन से पास पुनः सक्रिय करें।
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-relaxed text-left pt-2 border-t border-slate-100">
                    पुनः प्रिंट या डाउनलोड करने पर वही टोकन रहता है। यदि कार्ड खो जाए तो ही नया QR बनाएं।
                  </p>
                </div>
              ) : (
                <button
                  onClick={loadQR}
                  className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold"
                >
                  QR लोड करें
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
