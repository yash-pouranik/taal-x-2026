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
} from 'lucide-react'

interface DayGrid {
  day: number
  date: string
  claimed: boolean
  claimInfo?: {
    claimedAt: string
    navratriDay: number
    claimedByStaffId: { name: string }
  }
}

interface Participant {
  _id: string
  participantId: string
  name: string
  fatherName: string
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
        title="Regenerate QR Code?"
        description="This will invalidate her existing physical/digital QR code. A new token will be generated. Old cards will be rejected at the counter. Only proceed if the card was lost or damaged."
        confirmText="Yes, Invalidate &amp; Regenerate"
        cancelText="Keep Existing QR"
        variant="warning"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenModal(false)}
      />

      {/* Confirmation Dialog: Cancel Registration */}
      <ConfirmDialog
        isOpen={showCancelModal}
        title={`Cancel Registration for ${participant.name}?`}
        description="Cancelling will immediately deactivate this participant's QR pass. Any volunteer scanning this pass will see 'Registration Cancelled' and prop distribution will be blocked. You can reactivate later if needed."
        confirmText="Yes, Cancel Registration"
        cancelText="Keep Active"
        variant="warning"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Confirmation Dialog: Reactivate Registration */}
      <ConfirmDialog
        isOpen={showReactivateModal}
        title={`Reactivate ${participant.name}?`}
        description="This will restore the participant to Active status. Her QR pass will once again be valid for daily prop collection."
        confirmText="Yes, Reactivate Pass"
        cancelText="Keep Cancelled"
        variant="primary"
        onConfirm={handleConfirmReactivate}
        onCancel={() => setShowReactivateModal(false)}
      />

      {/* Confirmation Dialog: Delete Permanently */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title={`Permanently Delete ${participant.name}?`}
        description={`This will erase ${participant.name} (${participant.participantId}) and all their claim history completely from the database. This action CANNOT be undone.`}
        confirmText="Permanently Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin/participants"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Participants</span>
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
            <span>{isCancelled ? 'Registration Cancelled' : 'Active Pass'}</span>
          </span>
        </div>

        {/* Cancellation Notice Banner (Visible only if cancelled) */}
        {isCancelled && (
          <div className="mb-6 bg-red-50 border border-red-200/80 rounded-3xl p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  This Registration Has Been Cancelled
                </h3>
                <p className="text-xs text-red-700 mt-1">
                  The QR code for this participant is deactivated. Volunteers scanning this code will see &quot;Registration Cancelled&quot; and will not be able to distribute props.
                  {participant.cancelledAt && (
                    <span className="block mt-0.5 text-red-600/80">
                      Cancelled on: {new Date(participant.cancelledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
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
              Reactivate
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
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800">
                      {participant.participantId}
                    </span>
                    <span className="text-xs text-slate-400">
                      Joined{' '}
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
                  <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                    <span className="text-slate-400">Daughter of:</span>
                    <span className="text-slate-800">{participant.fatherName}</span>
                  </p>
                </div>

                {!isCancelled && (
                  <Link
                    href={`/admin/participants/${id}/print`}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Single Card</span>
                  </Link>
                )}
              </div>
            </div>

            {/* 9-Day Distribution Matrix */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    9-Day Claim History
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live verification audit per Navratri festival day.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Collected
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <XCircle className="w-3.5 h-3.5" /> Pending
                  </span>
                </div>
              </div>

              {dayGrid.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Event dates not configured yet. Configure dates to view matrix.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {dayGrid.map((d) => (
                    <div
                      key={d.day}
                      className={`rounded-2xl p-4 transition-all border ${
                        d.claimed
                          ? 'bg-emerald-50/70 border-emerald-200/80 shadow-xs'
                          : 'bg-slate-50/50 border-slate-200/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700">
                          Day {d.day}
                        </span>
                        {d.claimed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {d.date}
                      </div>

                      {d.claimed && d.claimInfo && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/50 text-[11px] text-emerald-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            {new Date(d.claimInfo.claimedAt).toLocaleTimeString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone: Cancellation & Permanent Delete Card */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Registration Management
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Deactivate or delete this participant registration.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {isCancelled ? (
                  <button
                    onClick={() => setShowReactivateModal(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reactivate Registration</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 border border-amber-300 hover:bg-amber-50 text-amber-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <UserX className="w-4 h-4 text-amber-600" />
                    <span>Cancel Registration</span>
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): QR Code Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7 text-center">
              <h2 className="font-bold text-base text-slate-900 text-left mb-1">
                Participant QR Code
              </h2>
              <p className="text-xs text-slate-500 text-left mb-5">
                {isCancelled
                  ? 'QR code is currently DEACTIVATED due to registration cancellation.'
                  : 'Scan-ready QR pass encoded with non-guessable random token.'}
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
                          Cancelled
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
                        <span>Print ID Card</span>
                      </Link>

                      <a
                        href={qrDataUrl}
                        download={`qr-${participant.participantId}.png`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Download PNG</span>
                      </a>

                      <button
                        onClick={() => setShowRegenModal(true)}
                        className="w-full inline-flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate (If Lost)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 font-medium">
                      Pass is deactivated. Reactivate registration above to allow printing and prop distribution.
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-relaxed text-left pt-2 border-t border-slate-100">
                    Re-printing or downloading uses the same token. Regenerate creates a new token if the physical card was lost.
                  </p>
                </div>
              ) : (
                <button
                  onClick={loadQR}
                  className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Generate QR
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
