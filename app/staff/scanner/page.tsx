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
      const { Html5Qrcode } = await import('html5-qrcode')

      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode('qr-reader')
      }

      if (isScanningRef.current) {
        return
      }

      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (token: string) => {
          onQRScanned(token)
        },
        () => {} // Frame error ignore
      )

      isScanningRef.current = true
      setCameraError(null)
    } catch (err) {
      console.error('Camera start error:', err)
      isScanningRef.current = false
      setCameraError(
        'Camera permission is required to scan passes. Please grant camera permission in your browser and tap Retry.'
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
    if (!token) return

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
          <span>स्कैनर बंद करें</span>
        </Link>
        <span className="text-xs font-bold tracking-wider text-orange-400">
          प्रवेश व वितरण काउंटर
        </span>
      </header>

      {/* Main Screen Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
        {/* ── 1. SCANNING STATE (Element stays mounted permanently to prevent DOM detached errors) ── */}
        <div
          className={
            state === 'scanning'
              ? 'w-full flex flex-col items-center justify-center gap-5'
              : 'hidden'
          }
        >
          {cameraError ? (
            <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-7 text-center w-full max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-3">
                <CameraOff className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-red-200">कैमरा अनुमति नहीं मिली</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                पास स्कैन करने के लिए कैमरे की अनुमति आवश्यक है। कृपया अपने ब्राउज़र में कैमरा चालू करें और पुनः प्रयास करें।
              </p>
              <button
                onClick={() => {
                  setCameraError(null)
                  startCamera()
                }}
                className="mt-5 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-semibold"
              >
                कैमरा पुनः चालू करें
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-100">
                  प्रतिभागी का QR पास स्कैन करें
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  QR कोड को कैमरे के चौखट के सामने लाएं
                </p>
              </div>

              <div className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl relative bg-black">
                {/* #qr-reader is permanently in DOM */}
                <div id="qr-reader" className="w-full h-full" />
              </div>

              <span className="text-xs text-slate-400 font-medium">
                कैमरा सक्रिय है • ऑटो-स्कैन हो रहा है
              </span>
            </>
          )}
        </div>

        {/* ── 2. LOADING STATE ── */}
        {state === 'loading' && (
          <div className="text-center py-16 animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-orange-500 mx-auto mb-4 animate-pulse">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">पास की जांच हो रही है...</h3>
            <p className="text-xs text-slate-400 mt-1">
              डेटाबेस में प्रवेश व वितरण की स्थिति जांची जा रही है
            </p>
          </div>
        )}

        {/* ── 3. VERIFY STATE ── */}
        {state === 'verify' && verifyData && (
          <div className="w-full flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Participant Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>सत्यापित प्रतिभागी</span>
                </div>

                {/* Stage Badge */}
                {!verifyData.hasEntered ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    <LogIn className="w-3 h-3" />
                    <span>प्रवेश बाकी (Gate Entry)</span>
                  </span>
                ) : !verifyData.hasExited ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>अंदर हैं (IN)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                    <LogOut className="w-3 h-3 text-slate-400" />
                    <span>बाहर जा चुके (OUT)</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {verifyData.participant.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap mt-1 text-sm font-medium text-slate-300">
                {verifyData.participant.motherName && (
                  <span>माता: <strong className="text-white">{verifyData.participant.motherName}</strong> • </span>
                )}
                <span>पिता: <strong className="text-white">{verifyData.participant.fatherName}</strong></span>
                {verifyData.participant.phone && (
                  <span className="text-slate-400 font-mono text-xs">📞 {verifyData.participant.phone}</span>
                )}
                {verifyData.participant.category && (
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    {verifyData.participant.category}
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {verifyData.participant.participantId}
                </span>

                {verifyData.participant.countNumber && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    #{verifyData.participant.countNumber}
                  </span>
                )}

                {verifyData.entryTime && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    प्रवेश: {formatClaimTime(verifyData.entryTime)}
                    {!verifyData.hasExited && (
                      <strong className="text-emerald-400 font-sans ml-1">
                        ({formatDurationHindi(verifyData.entryTime)} पहले)
                      </strong>
                    )}
                  </span>
                )}

                {verifyData.exitTime && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    • प्रस्थान: {formatClaimTime(verifyData.exitTime)}
                    <strong className="text-blue-300 font-sans ml-1">
                      (कुल {formatDurationHindi(verifyData.entryTime!, verifyData.exitTime)} रहे)
                    </strong>
                  </span>
                )}
              </div>

              {/* Status Box: Gift & Bhojan Status (Only shown once entered) */}
              {verifyData.hasEntered && (
                <div className="mt-5 space-y-2.5">
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">उपहार / प्रॉप (Gift)</span>
                        <span className="text-[10px] text-slate-400">दिवस {verifyData.navratriDay}</span>
                      </div>
                    </div>
                    <div>
                      {verifyData.canClaimGift ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                          देना बाकी
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>वितरित ✓</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">भोजन पैकेट (Bhojan)</span>
                        <span className="text-[10px] text-slate-400">दैनिक प्रसादम</span>
                      </div>
                    </div>
                    <div>
                      {verifyData.canClaimFood ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                          देना बाकी
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-blue-500" />
                          <span>वितरित ✓</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div className="w-full space-y-3">
              {/* STAGE 1: FIRST SCAN — ONLY ENTRANCE CAN BE ACCEPTED! */}
              {verifyData.canMarkEntry && (
                <div className="space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-center">
                    <p className="text-xs text-amber-300 font-semibold">
                      प्रथम स्कैन — प्रतिभागी का प्रवेश (Entry) दर्ज करें
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      सामग्री (उपहार / भोजन) प्रवेश दर्ज होने के बाद ही वितरित की जा सकेगी।
                    </p>
                  </div>

                  <button
                    onClick={() => confirmClaim('entry')}
                    disabled={confirming}
                    className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 active:scale-[0.99] disabled:opacity-60 text-white text-base font-bold py-4 rounded-2xl shadow-xl shadow-orange-950/40 transition-all flex items-center justify-center gap-2"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>प्रवेश दर्ज हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>प्रवेश दर्ज करें (Mark Entry In)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STAGE 2: SUBSEQUENT SCAN — ENTRY ALREADY DONE: FOOD, GIFT, AND EXIT */}
              {verifyData.hasEntered && (
                <div className="space-y-3">
                  {/* Both Gift & Food Available */}
                  {verifyData.canClaimGift && verifyData.canClaimFood && (
                    <>
                      <button
                        onClick={() => confirmClaim('both')}
                        disabled={confirming}
                        className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 active:scale-[0.99] disabled:opacity-60 text-white text-base font-bold py-4 rounded-2xl shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
                      >
                        {confirming ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>दर्ज हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>दोनों दें (उपहार + भोजन पैकेट)</span>
                          </>
                        )}
                      </button>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => confirmClaim('gift')}
                          disabled={confirming}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Gift className="w-4 h-4 text-emerald-400" />
                          <span>केवल उपहार</span>
                        </button>

                        <button
                          onClick={() => confirmClaim('food')}
                          disabled={confirming}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UtensilsCrossed className="w-4 h-4 text-blue-400" />
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
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-60 text-white text-base font-bold py-4 rounded-2xl shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>दर्ज हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
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
                      className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-60 text-white text-base font-bold py-4 rounded-2xl shadow-xl shadow-blue-950/40 transition-all flex items-center justify-center gap-2"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>दर्ज हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <UtensilsCrossed className="w-5 h-5" />
                          <span>भोजन पैकेट दें</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Neither Gift nor Food available (already given) */}
                  {!verifyData.canClaimGift && !verifyData.canClaimFood && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>आज के उपहार व भोजन दोनों दिए जा चुके हैं</span>
                    </div>
                  )}

                  {/* EXIT ACTION: If participant is currently IN, gate/counter staff can mark Exit! */}
                  {verifyData.canMarkExit && (
                    <div className="pt-2">
                      <button
                        onClick={() => confirmClaim('exit')}
                        disabled={confirming}
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-300 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {confirming ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4 text-red-400" />
                        )}
                        <span>प्रस्थान दर्ज करें (Mark Exit / बाहर गए)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={reset}
                className="w-full py-3 text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
              >
                रद्द करें व अगला पास स्कैन करें
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

              <span className="text-xs font-bold text-emerald-400 tracking-wider">
                वितरण सफल रहा
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">
                {successData.name}
              </h2>
              <p className="text-emerald-400/90 text-sm font-semibold mt-1">
                दिवस {successData.navratriDay} • {successData.itemLabel} दिया गया
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
              <span>अगला पास स्कैन करें</span>
            </button>
          </div>
        )}

        {/* ── 5. ERROR STATE ── */}
        {state === 'error' && errorData && (
          <div className="w-full flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-7 w-full shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
                {errorData.error === 'ALL_COMPLETED' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : errorData.error === 'ENTRY_REQUIRED' ? (
                  <LogIn className="w-7 h-7 text-amber-400" />
                ) : errorData.error === 'ALREADY_CLAIMED' ? (
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
                {errorData.error === 'ALL_COMPLETED'
                  ? 'आज की सभी प्रक्रियाएं पूर्ण ✅'
                  : errorData.error === 'ENTRY_REQUIRED'
                  ? 'पहले प्रवेश (Entry) आवश्यक है'
                  : errorData.error === 'ALREADY_ENTERED'
                  ? 'प्रवेश पहले ही दर्ज है'
                  : errorData.error === 'ALREADY_EXITED'
                  ? 'प्रस्थान पहले ही दर्ज है'
                  : errorData.error === 'ALREADY_CLAIMED'
                  ? 'आज का वितरण पहले ही हो चुका है'
                  : errorData.error === 'CANCELLED'
                  ? 'यह पास रद्द (Cancelled) है'
                  : errorData.error === 'NOT_STARTED'
                  ? 'कार्यक्रम अभी प्रारंभ नहीं हुआ'
                  : errorData.error === 'ENDED'
                  ? 'कार्यक्रम समाप्त हो चुका है'
                  : errorData.error === 'INVALID_QR'
                  ? 'अमान्य QR पास'
                  : 'सूचना'}
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
                    पिता / अभिभावक: {errorData.participant.fatherName}
                  </p>
                </div>
              )}

              {errorData.claim && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs space-y-1.5">
                  {errorData.claim.giftClaimed && (
                    <div className="text-amber-300 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>उपहार दिया गया: {formatClaimTime(errorData.claim.giftClaimedAt || errorData.claim.claimedAt)} {errorData.claim.giftStaffName ? `(${errorData.claim.giftStaffName} द्वारा)` : errorData.claim.claimedBy ? `(${errorData.claim.claimedBy} द्वारा)` : ''}</span>
                    </div>
                  )}
                  {errorData.claim.foodClaimed && (
                    <div className="text-blue-300 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>भोजन पैकेट दिया गया: {formatClaimTime(errorData.claim.foodClaimedAt)} {errorData.claim.foodStaffName ? `(${errorData.claim.foodStaffName} द्वारा)` : ''}</span>
                    </div>
                  )}
                  {!errorData.claim.giftClaimed && !errorData.claim.foodClaimed && errorData.claim.claimedAt && (
                    <div className="text-slate-400">
                      वितरण समय: {formatClaimTime(errorData.claim.claimedAt)} {errorData.claim.claimedBy ? `(${errorData.claim.claimedBy} द्वारा)` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-2xl text-sm border border-slate-700 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>पुनः स्कैन करें</span>
            </button>
          </div>
        )}
      </main>

      <div className="py-2" />
    </div>
  )
}
