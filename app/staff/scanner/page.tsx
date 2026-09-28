'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  CameraOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  XCircle,
  QrCode,
  ArrowLeft,
  Sparkles,
  UserCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react'

type ScanState = 'scanning' | 'loading' | 'verify' | 'success' | 'error'

interface VerifyResult {
  participant: {
    _id: string
    name: string
    fatherName: string
    participantId: string
  }
  navratriDay: number
  distributionDate: string
  alreadyClaimed: boolean
}

interface ErrorResult {
  error: string
  message: string
  participant?: { name: string; fatherName: string; participantId: string }
  claim?: { navratriDay: number; claimedAt: string; claimedBy: string }
}

export default function ScannerPage() {
  const html5QrRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const [state, setState] = useState<ScanState>('scanning')
  const [verifyData, setVerifyData] = useState<VerifyResult | null>(null)
  const [errorData, setErrorData] = useState<ErrorResult | null>(null)
  const [successData, setSuccessData] = useState<{
    name: string
    navratriDay: number
    claimedAt: string
  } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let scanner: { stop: () => Promise<void> } | null = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        scanner = new Html5Qrcode('qr-reader')
        html5QrRef.current = scanner

        await (
          scanner as unknown as {
            start: (
              config: { facingMode: string },
              settings: {
                fps: number
                qrbox: { width: number; height: number }
                aspectRatio: number
              },
              onSuccess: (text: string) => void,
              onError: () => void
            ) => Promise<void>
          }
        ).start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (token: string) => {
            if (mounted) onQRScanned(token)
          },
          () => {} // Frame error ignore
        )
      } catch (err) {
        if (mounted) {
          console.error(err)
          setCameraError(
            'Camera permission is required to scan passes. Please grant camera permission in your browser and tap Retry.'
          )
        }
      }
    }

    if (state === 'scanning') {
      startScanner()
    }

    return () => {
      mounted = false
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  async function onQRScanned(token: string) {
    if (html5QrRef.current) {
      await html5QrRef.current.stop().catch(() => {})
    }
    setState('loading')

    try {
      const res = await fetch('/api/claims/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.valid) {
        setVerifyData(data)
        setState('verify')
      } else {
        setErrorData(data)
        setState('error')
      }
    } catch {
      setErrorData({
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Check local network connection.',
      })
      setState('error')
    }
  }

  async function confirmClaim() {
    if (!verifyData) return
    setConfirming(true)
    try {
      const res = await fetch('/api/claims/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: verifyData.participant._id }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setSuccessData({
          name: data.claim.participant.name,
          navratriDay: data.claim.navratriDay,
          claimedAt: data.claim.claimedAt,
        })
        setState('success')
      } else {
        setErrorData({ error: data.error, message: data.message })
        setState('error')
      }
    } catch {
      setErrorData({
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please try again.',
      })
      setState('error')
    } finally {
      setConfirming(false)
    }
  }

  function reset() {
    setVerifyData(null)
    setErrorData(null)
    setSuccessData(null)
    setState('scanning')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <Link
          href="/staff/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Scanner</span>
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
          Distribution Counter
        </span>
      </header>

      {/* Main Screen Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
        {/* ── 1. SCANNING STATE ── */}
        {state === 'scanning' && (
          <div className="w-full flex flex-col items-center justify-center gap-5">
            {cameraError ? (
              <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-7 text-center w-full max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-3">
                  <CameraOff className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-red-200">Camera Access Blocked</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={() => {
                    setCameraError(null)
                    setState('scanning')
                  }}
                  className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-semibold"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-base font-bold text-slate-200">
                    Scan Participant Pass
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Align QR code inside camera target
                  </p>
                </div>

                <div className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl relative bg-black">
                  <div id="qr-reader" className="w-full h-full" />
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  Camera active • Auto-detecting code
                </span>
              </>
            )}
          </div>
        )}

        {/* ── 2. LOADING STATE ── */}
        {state === 'loading' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-orange-500 mx-auto mb-4 animate-pulse">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Verifying Token...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Checking database &amp; today&apos;s claim status
            </p>
          </div>
        )}

        {/* ── 3. VERIFY STATE ── */}
        {state === 'verify' && verifyData && (
          <div className="w-full flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Participant Card */}
            <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 sm:p-7 w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verified Participant</span>
              </div>

              <h2 className="text-3xl font-black text-white tracking-tight">
                {verifyData.participant.name}
              </h2>
              <p className="text-sm font-medium text-slate-300 mt-1">
                Daughter of: <strong className="text-white">{verifyData.participant.fatherName}</strong>
              </p>

              <div className="mt-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {verifyData.participant.participantId}
                </span>
              </div>

              {/* Status Box */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Festival Day
                  </span>
                  <span className="text-xl font-bold text-white">
                    Day {verifyData.navratriDay}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Not Collected</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation CTA */}
            <div className="w-full space-y-3">
              <button
                onClick={confirmClaim}
                disabled={confirming}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-900 text-white text-lg font-bold py-5 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>GIVE PROP</span>
                  </>
                )}
              </button>

              <button
                onClick={reset}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
              >
                Cancel &amp; Scan Next
              </button>
            </div>
          </div>
        )}

        {/* ── 4. SUCCESS STATE ── */}
        {state === 'success' && successData && (
          <div className="w-full flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 w-full shadow-2xl relative overflow-hidden">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <span className="text-xs uppercase font-bold text-emerald-400 tracking-widest">
                Distribution Confirmed
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">
                {successData.name}
              </h2>
              <p className="text-emerald-400/90 text-sm font-semibold mt-1">
                Day {successData.navratriDay} Prop Claimed
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-3">
                {successData.claimedAt}
              </p>
            </div>

            <button
              onClick={reset}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              <span>Scan Next Participant</span>
            </button>
          </div>
        )}

        {/* ── 5. ERROR STATE ── */}
        {state === 'error' && errorData && (
          <div className="w-full flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-7 w-full shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
                {errorData.error === 'ALREADY_CLAIMED' ? (
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                ) : errorData.error === 'NOT_STARTED' ? (
                  <Clock className="w-7 h-7 text-blue-400" />
                ) : errorData.error === 'ENDED' ? (
                  <Ban className="w-7 h-7 text-red-400" />
                ) : (
                  <XCircle className="w-7 h-7 text-red-400" />
                )}
              </div>

              <h2 className="text-lg font-bold text-white mb-1.5">
                {errorData.error === 'ALREADY_CLAIMED'
                  ? 'Already Collected Today'
                  : errorData.error === 'NOT_STARTED'
                  ? 'Distribution Not Started'
                  : errorData.error === 'ENDED'
                  ? 'Event Concluded'
                  : errorData.error === 'INVALID_QR'
                  ? 'Invalid QR Pass'
                  : 'Notice'}
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                {errorData.message}
              </p>

              {errorData.participant && (
                <div className="mt-5 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-left">
                  <p className="text-sm font-bold text-white">
                    {errorData.participant.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daughter of: {errorData.participant.fatherName}
                  </p>
                </div>
              )}

              {errorData.claim && (
                <div className="mt-3 text-[11px] text-amber-400/90 font-medium">
                  Claimed at:{' '}
                  {new Date(errorData.claim.claimedAt).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}{' '}
                  {errorData.claim.claimedBy && `by ${errorData.claim.claimedBy}`}
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-2xl text-sm border border-slate-700 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scan Again</span>
            </button>
          </div>
        )}
      </main>

      <div className="py-2" />
    </div>
  )
}
