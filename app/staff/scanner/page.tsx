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
  UserCheck,
  RefreshCw,
  Loader2,
  Gift,
  UtensilsCrossed,
  LogIn,
  LogOut,
  Footprints,
} from 'lucide-react'
import { formatDurationHindi } from '@/lib/dateUtils'

type ScanState = 'scanning' | 'loading' | 'verify' | 'success' | 'error'

interface VerifyResult {
  participant: {
    _id: string
    name: string
    motherName?: string
    fatherName: string
    phone?: string
    address?: string
    category?: string
    countNumber?: number
    participantId: string
  }
  navratriDay: number
  distributionDate: string
  hasEntered: boolean
  hasExited: boolean
  canMarkEntry: boolean
  canClaimGift: boolean
  canClaimFood: boolean
  canMarkExit: boolean
  entryTime?: string
  exitTime?: string
  claim?: {
    entryTime?: string
    exitTime?: string
    giftClaimed: boolean
    giftClaimedAt?: string
    giftStaffName?: string
    foodClaimed: boolean
    foodClaimedAt?: string
    foodStaffName?: string
  } | null
}

interface ErrorResult {
  error: string
  message: string
  participant?: { name: string; fatherName: string; participantId: string }
  claim?: {
    navratriDay: number
    claimedAt?: string
    claimedBy?: string
    entryTime?: string
    exitTime?: string
    giftClaimed?: boolean
    giftClaimedAt?: string
    giftStaffName?: string
    foodClaimed?: boolean
    foodClaimedAt?: string
    foodStaffName?: string
  }
}

export default function ScannerPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null)
  const isScanningRef = useRef(false)
  const isProcessingRef = useRef(false)

  const [state, setState] = useState<ScanState>('scanning')
  const [verifyData, setVerifyData] = useState<VerifyResult | null>(null)
  const [errorData, setErrorData] = useState<ErrorResult | null>(null)
  const [successData, setSuccessData] = useState<{
    name: string
    navratriDay: number
    itemLabel: string
    claimedAt: string
  } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Safe time formatter
  function formatClaimTime(timeStr?: string) {
    if (!timeStr) return ''
    try {
      const d = new Date(timeStr)
      if (isNaN(d.getTime())) return timeStr
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
    } catch {
      return timeStr
    }
  }

  // Safe scanner stopper
  async function stopCamera() {
    if (html5QrRef.current && isScanningRef.current) {
      try {
        await html5QrRef.current.stop()
      } catch (err) {
        console.warn('Error stopping scanner:', err)
      } finally {
        isScanningRef.current = false
      }
    }
  }

  // Safe scanner starter
  async function startCamera() {
    try {
      // Check for secure context (Camera requires HTTPS or localhost)
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setCameraError(
          'कैमरा केवल सुरक्षित (HTTPS) कनेक्शन पर काम करता है। कृपया HTTPS से वेबसाइट खोलें या एडमिन से संपर्क करें।'
        )
        return
      }

      const { Html5Qrcode } = await import('html5-qrcode')

      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode('qr-reader')
      }

      if (isScanningRef.current) {
        return
      }

      const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }
      const onScanSuccess = (token: string) => {
        onQRScanned(token)
      }
      const onScanError = () => {} // Frame error ignore

      try {
        // Primary: Back camera (rear) for scanning passes
        await html5QrRef.current.start(
          { facingMode: 'environment' },
          qrConfig,
          onScanSuccess,
          onScanError
        )
      } catch (envErr) {
        console.warn('Environment camera start failed, trying device fallback:', envErr)
        // Fallback: Check available cameras and pick rear camera or first available
        const devices = await Html5Qrcode.getCameras().catch(() => [])
        if (devices && devices.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const backCam = devices.find((d: any) =>
            /back|rear|environment/i.test(d.label || '')
          )
          const chosenId = backCam ? backCam.id : devices[0].id
          await html5QrRef.current.start(
            chosenId,
            qrConfig,
            onScanSuccess,
            onScanError
          )
        } else {
          // Final fallback: user facing mode
          await html5QrRef.current.start(
            { facingMode: 'user' },
            qrConfig,
            onScanSuccess,
            onScanError
          )
        }
      }

      isScanningRef.current = true
      isProcessingRef.current = false
      setCameraError(null)
    } catch (err) {
      console.error('Camera start error:', err)
      isScanningRef.current = false
      setCameraError(
        'पास स्कैन करने हेतु कैमरे की अनुमति आवश्यक है। कृपया अपने ब्राउज़र में कैमरा चालू करें और पुनः प्रयास करें।'
      )
    }
  }

  useEffect(() => {
    if (state === 'scanning') {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  async function onQRScanned(token: string) {
    if (!token || isProcessingRef.current) return
    isProcessingRef.current = true

    // Stop camera immediately
    await stopCamera()
    setState('loading')

    try {
      const res = await fetch('/api/claims/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      const data = await res.json()

      if (res.ok && data?.valid) {
        setVerifyData(data)
        setState('verify')
      } else {
        setErrorData(data || { error: 'UNKNOWN', message: 'Verification failed' })
        setState('error')
      }
    } catch (err) {
      console.error('Fetch verify error:', err)
      setErrorData({
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your internet connection.',
      })
      setState('error')
    }
  }

  async function confirmClaim(itemType: 'entry' | 'gift' | 'food' | 'both' | 'exit') {
    if (!verifyData) return
    setConfirming(true)
    try {
      const res = await fetch('/api/claims/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: verifyData.participant._id,
          itemType,
        }),
      })
      const data = await res.json()

      if (res.ok && data?.success) {
        setSuccessData({
          name: data.claim.participant.name,
          navratriDay: data.claim.navratriDay,
          itemLabel: data.claim.itemLabel,
          claimedAt: data.claim.claimedAt,
        })
        setState('success')
      } else {
        setErrorData(data || { error: 'FAILED', message: 'प्रक्रिया दर्ज करने में त्रुटि हुई' })
        setState('error')
      }
    } catch (err) {
      console.error('Confirm claim error:', err)
      setErrorData({
        error: 'NETWORK_ERROR',
        message: 'सर्वर से संपर्क नहीं हो सका। कृपया इंटरनेट जांचें।',
      })
      setState('error')
    } finally {
      setConfirming(false)
    }
  }

  function reset() {
    isProcessingRef.current = false
    setVerifyData(null)
    setErrorData(null)
    setSuccessData(null)
    setState('scanning')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-orange-600 selection:text-white">
      {/* Top Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <Link
          href="/staff/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>डैशबोर्ड</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-neutral-200">
            QR स्कैनर (गेट व वितरण)
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
        {/* ── 1. SCANNING STATE ── */}
        <div
          className={
            state === 'scanning'
              ? 'w-full flex flex-col items-center justify-center gap-4'
              : 'hidden'
          }
        >
          {cameraError ? (
            <div className="bg-neutral-900 border border-red-900/60 rounded-2xl p-6 text-center w-full max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-900/40">
                <CameraOff className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm text-red-200">कैमरा अनुमति नहीं मिली</h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                पास स्कैन करने के लिए कैमरे की अनुमति आवश्यक है। कृपया अपने ब्राउज़र सेटिंग्स में कैमरा चालू करें और पुनः प्रयास करें।
              </p>
              <button
                onClick={() => {
                  setCameraError(null)
                  startCamera()
                }}
                className="mt-4 w-full bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-2.5 rounded-lg text-xs font-semibold transition-colors"
              >
                कैमरा पुनः चालू करें
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-0.5">
                <h2 className="text-base font-semibold text-neutral-100">
                  प्रतिभागी पास स्कैन करें
                </h2>
                <p className="text-xs text-neutral-400">
                  QR कोड को कैमरे के सामने स्थिर रखें
                </p>
              </div>

              {/* Viewfinder with Corner Accents */}
              <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border border-neutral-800 bg-black relative">
                {/* Corner reticle guides */}
                <div className="pointer-events-none absolute inset-0 z-10 p-3 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-t-2 border-l-2 border-orange-500 rounded-tl-sm" />
                    <div className="w-5 h-5 border-t-2 border-r-2 border-orange-500 rounded-tr-sm" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-b-2 border-l-2 border-orange-500 rounded-bl-sm" />
                    <div className="w-5 h-5 border-b-2 border-r-2 border-orange-500 rounded-br-sm" />
                  </div>
                </div>

                {/* Permanent DOM node for html5-qrcode */}
                <div id="qr-reader" className="w-full h-full" />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>कैमरा सक्रिय • ऑटो-डिटेक्ट चालू है</span>
              </div>
            </>
          )}
        </div>

        {/* ── 2. LOADING STATE ── */}
        {state === 'loading' && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-orange-500 mx-auto mb-3">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-white">पास जांचा जा रहा है...</h3>
            <p className="text-xs text-neutral-400 mt-1">
              प्रवेश व सामग्री की स्थिति सत्यापित की जा रही है
            </p>
          </div>
        )}

        {/* ── 3. VERIFY STATE ── */}
        {state === 'verify' && verifyData && (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Participant Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full">
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>सत्यापित पास</span>
                </div>

                {/* Presence Stage Badge */}
                {!verifyData.hasEntered ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-0.5 rounded-md">
                    <LogIn className="w-3 h-3" />
                    <span>प्रवेश बाकी (Gate In)</span>
                  </span>
                ) : !verifyData.hasExited ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>अंदर हैं (IN)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400 bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 rounded-md">
                    <LogOut className="w-3 h-3 text-neutral-400" />
                    <span>बाहर गए (OUT)</span>
                  </span>
                )}
              </div>

              {/* Participant Name */}
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {verifyData.participant.name}
              </h2>

              {/* Parentage & Info */}
              <div className="mt-1.5 text-xs text-neutral-300 space-y-0.5">
                <p>
                  {verifyData.participant.motherName && (
                    <span>माता: <strong className="text-neutral-100">{verifyData.participant.motherName}</strong> | </span>
                  )}
                  पिता: <strong className="text-neutral-100">{verifyData.participant.fatherName}</strong>
                </p>
                {verifyData.participant.phone && (
                  <p className="text-neutral-400 font-mono">
                    मोबाइल: <span className="text-neutral-300">{verifyData.participant.phone}</span>
                  </p>
                )}
              </div>

              {/* ID & Categorical Badges */}
              <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
                  {verifyData.participant.participantId}
                </span>

                {verifyData.participant.countNumber && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800/60">
                    क्रमांक #{verifyData.participant.countNumber}
                  </span>
                )}

                {verifyData.participant.category && (
                  <span className="uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {verifyData.participant.category}
                  </span>
                )}
              </div>

              {/* Timestamps (Entry / Exit duration) */}
              {(verifyData.entryTime || verifyData.exitTime) && (
                <div className="mt-2.5 text-[11px] text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg p-2 font-mono space-y-0.5">
                  {verifyData.entryTime && (
                    <div>
                      प्रवेश: {formatClaimTime(verifyData.entryTime)}
                      {!verifyData.hasExited && (
                        <span className="text-emerald-400 font-sans ml-1.5 font-medium">
                          ({formatDurationHindi(verifyData.entryTime)} से अंदर)
                        </span>
                      )}
                    </div>
                  )}
                  {verifyData.exitTime && (
                    <div>
                      प्रस्थान: {formatClaimTime(verifyData.exitTime)}
                      <span className="text-neutral-300 font-sans ml-1.5 font-medium">
                        (कुल {formatDurationHindi(verifyData.entryTime!, verifyData.exitTime)})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Items Status List (Once entered) */}
              {verifyData.hasEntered && (
                <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
                  {/* Gift Status Row */}
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">
                          उपहार / प्रॉप (Gift)
                        </span>
                        <span className="text-[10px] text-neutral-400">दिवस {verifyData.navratriDay}</span>
                      </div>
                    </div>
                    <div>
                      {verifyData.canClaimGift ? (
                        <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                          देना बाकी
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>वितरित</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bhojan Status Row */}
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">
                          भोजन पैकेट (Bhojan)
                        </span>
                        <span className="text-[10px] text-neutral-400">दैनिक प्रसादम</span>
                      </div>
                    </div>
                    <div>
                      {verifyData.canClaimFood ? (
                        <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                          देना बाकी
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>वितरित</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div className="w-full space-y-2.5">
              {/* STAGE 1: FIRST SCAN — ENTRY ONLY */}
              {verifyData.canMarkEntry && (
                <div className="space-y-2">
                  <div className="bg-amber-950/50 border border-amber-800/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-amber-300 font-semibold">
                      प्रथम स्कैन — पहले प्रवेश (Gate Entry) दर्ज करें
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      सामग्री (उपहार व भोजन) प्रवेश दर्ज होने के बाद ही दी जा सकेगी।
                    </p>
                  </div>

                  <button
                    onClick={() => confirmClaim('entry')}
                    disabled={confirming}
                    className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>प्रवेश दर्ज हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>प्रवेश दर्ज करें (Mark Gate Entry)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STAGE 2: SUBSEQUENT SCAN — BOTH, GIFT, FOOD, EXIT */}
              {verifyData.hasEntered && (
                <div className="space-y-2">
                  {/* Both Gift & Food Available */}
                  {verifyData.canClaimGift && verifyData.canClaimFood && (
                    <>
                      <button
                        onClick={() => confirmClaim('both')}
                        disabled={confirming}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {confirming ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>दर्ज हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>दोनों दें (उपहार + भोजन पैकेट)</span>
                          </>
                        )}
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => confirmClaim('gift')}
                          disabled={confirming}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-emerald-400 font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Gift className="w-3.5 h-3.5 text-emerald-400" />
                          <span>केवल उपहार</span>
                        </button>

                        <button
                          onClick={() => confirmClaim('food')}
                          disabled={confirming}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-blue-400 font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5 text-blue-400" />
                          <span>केवल भोजन</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Only Gift Available */}
                  {verifyData.canClaimGift && !verifyData.canClaimFood && (
                    <button
                      onClick={() => confirmClaim('gift')}
                      disabled={confirming}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>दर्ज हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          <span>उपहार / प्रॉप दें</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Only Food Available */}
                  {!verifyData.canClaimGift && verifyData.canClaimFood && (
                    <button
                      onClick={() => confirmClaim('food')}
                      disabled={confirming}
                      className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>दर्ज हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <UtensilsCrossed className="w-4 h-4" />
                          <span>भोजन पैकेट दें</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Both already claimed */}
                  {!verifyData.canClaimGift && !verifyData.canClaimFood && (
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>आज के उपहार व भोजन दोनों दिए जा चुके हैं</span>
                    </div>
                  )}

                  {/* Exit Option */}
                  {verifyData.canMarkExit && (
                    <button
                      onClick={() => confirmClaim('exit')}
                      disabled={confirming}
                      className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-red-300 font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {confirming ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                      <span>प्रस्थान दर्ज करें (Mark Exit)</span>
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={reset}
                className="w-full py-2.5 text-xs text-neutral-400 hover:text-white transition-colors font-medium"
              >
                रद्द करें व अगला पास स्कैन करें
              </button>
            </div>
          </div>
        )}

        {/* ── 4. SUCCESS STATE ── */}
        {state === 'success' && successData && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                वितरण सफल रहा
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                {successData.name}
              </h2>
              <p className="text-neutral-300 text-xs font-medium mt-1">
                दिवस {successData.navratriDay} • {successData.itemLabel}
              </p>
              <p className="text-[11px] text-neutral-500 font-mono mt-2">
                {successData.claimedAt}
              </p>
            </div>

            <button
              onClick={reset}
              className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>अगला पास स्कैन करें</span>
            </button>
          </div>
        )}

        {/* ── 5. ERROR STATE ── */}
        {state === 'error' && errorData && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-900/60 flex items-center justify-center text-red-400 mx-auto mb-3">
                {errorData.error === 'ALL_COMPLETED' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : errorData.error === 'ENTRY_REQUIRED' ? (
                  <LogIn className="w-6 h-6 text-amber-400" />
                ) : errorData.error === 'ALREADY_CLAIMED' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                ) : errorData.error === 'NOT_STARTED' ? (
                  <Clock className="w-6 h-6 text-blue-400" />
                ) : errorData.error === 'ENDED' ? (
                  <Ban className="w-6 h-6 text-red-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>

              <h2 className="text-base font-bold text-white mb-1">
                {errorData.error === 'ALL_COMPLETED'
                  ? 'आज की सभी प्रक्रियाएं पूर्ण ✅'
                  : errorData.error === 'ENTRY_REQUIRED'
                  ? 'पहले प्रवेश (Gate Entry) आवश्यक है'
                  : errorData.error === 'ALREADY_ENTERED'
                  ? 'प्रवेश पहले ही दर्ज है'
                  : errorData.error === 'ALREADY_EXITED'
                  ? 'प्रस्थान पहले ही दर्ज है'
                  : errorData.error === 'ALREADY_CLAIMED'
                  ? 'आज का वितरण पहले ही हो चुका है'
                  : errorData.error === 'CANCELLED'
                  ? 'यह पास निरस्त (Cancelled) है'
                  : errorData.error === 'NOT_STARTED'
                  ? 'कार्यक्रम अभी प्रारंभ नहीं हुआ'
                  : errorData.error === 'ENDED'
                  ? 'कार्यक्रम समाप्त हो चुका है'
                  : errorData.error === 'INVALID_QR'
                  ? 'अमान्य QR पास'
                  : 'सूचना'}
              </h2>

              <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                {errorData.message}
              </p>

              {errorData.participant && (
                <div className="mt-4 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-left">
                  <p className="text-sm font-semibold text-white">
                    {errorData.participant.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    पिता: {errorData.participant.fatherName}
                  </p>
                </div>
              )}

              {errorData.claim && (
                <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-left text-xs space-y-1">
                  {errorData.claim.giftClaimed && (
                    <div className="text-emerald-400 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 shrink-0" />
                      <span>उपहार दिया गया: {formatClaimTime(errorData.claim.giftClaimedAt || errorData.claim.claimedAt)} {errorData.claim.giftStaffName ? `(${errorData.claim.giftStaffName})` : ''}</span>
                    </div>
                  )}
                  {errorData.claim.foodClaimed && (
                    <div className="text-blue-400 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                      <span>भोजन पैकेट दिया गया: {formatClaimTime(errorData.claim.foodClaimedAt)} {errorData.claim.foodStaffName ? `(${errorData.claim.foodStaffName})` : ''}</span>
                    </div>
                  )}
                  {!errorData.claim.giftClaimed && !errorData.claim.foodClaimed && errorData.claim.claimedAt && (
                    <div className="text-neutral-400">
                      वितरण समय: {formatClaimTime(errorData.claim.claimedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 text-white font-medium py-3 rounded-xl text-xs border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>पुनः स्कैन करें</span>
            </button>
          </div>
        )}
      </main>

      <div className="py-2" />
    </div>
  )
}
