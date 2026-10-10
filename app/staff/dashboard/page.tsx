'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Flame, QrCode, LogOut, CheckCircle2, Users, Loader2 } from 'lucide-react'

export default function StaffDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<{
    todayCollected: number
    totalParticipants: number
    config: { startDate: string; endDate: string } | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const day = stats?.config
    ? (() => {
        const today = new Date().toISOString().split('T')[0]
        const start = new Date(stats.config.startDate + 'T00:00:00')
        const end = new Date(stats.config.endDate + 'T00:00:00')
        const now = new Date(today + 'T00:00:00')
        const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        const diff = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= 0 && diff < totalDays ? diff + 1 : null
      })()
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50/50 to-slate-100 text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white/95 border-b border-orange-200/80 px-5 py-4 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
              <Flame className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm block leading-tight">
                Navratri 2026
              </span>
              <span className="text-[11px] text-orange-600 font-bold tracking-wider">
                कार्यकर्ता काउंटर
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3.5 py-1.5 rounded-xl font-semibold transition-colors shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>लॉग आउट</span>
          </button>
        </div>
      </header>

      {/* Main Center Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full gap-6">
        {/* Welcome */}
        <div className="text-center">
          <span className="text-xs font-bold text-orange-700 tracking-wider uppercase bg-orange-100/90 border border-orange-200 px-3 py-1 rounded-full">
            ड्यूटी पर कार्यकर्ता
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5 tracking-tight">
            {session?.user?.name || 'कार्यकर्ता'}
          </h1>
        </div>

        {/* Today's Day & Metric Badge */}
        {loading ? (
          <div className="w-full bg-white rounded-3xl border-2 border-orange-100 p-8 text-center shadow-lg shadow-orange-500/5">
            <Loader2 className="w-7 h-7 animate-spin text-orange-600 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold mt-2">लोड हो रहा है...</p>
          </div>
        ) : day ? (
          <div className="w-full bg-white rounded-3xl border-2 border-orange-200/90 p-7 text-center shadow-xl shadow-orange-500/10">
            <span className="text-xs font-extrabold text-orange-600 tracking-wider uppercase">
              आज का नवरात्रि दिवस
            </span>
            <div className="text-5xl font-black text-slate-900 mt-1 tracking-tight">
              दिवस {day}
            </div>

            {stats && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{stats.todayCollected} वितरित</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-bold">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>{stats.totalParticipants} कुल पास</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-white rounded-3xl border border-slate-200 p-6 text-center text-xs font-semibold text-slate-500 shadow-md">
            आज का दिन सक्रिय नवरात्रि तिथियों से बाहर है।
          </div>
        )}

        {/* Primary Action Button */}
        <Link
          href="/staff/scanner"
          className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-[0.98] text-white py-6 rounded-3xl text-center shadow-xl shadow-orange-600/30 transition-all flex flex-col items-center justify-center gap-2 group border-2 border-orange-400/40"
        >
          <div className="p-3.5 bg-white/20 backdrop-blur-xs rounded-2xl group-hover:scale-110 transition-transform shadow-xs text-white">
            <QrCode className="w-8 h-8" />
          </div>
          <span className="text-2xl font-black tracking-wide text-white drop-shadow-xs">
            QR स्कैनर खोलें
          </span>
          <span className="text-xs text-orange-100 font-semibold tracking-wide">
            प्रतिभागी का पास स्कैन करने के लिए टैप करें
          </span>
        </Link>
      </main>

      {/* Footer hint */}
      <footer className="py-4 text-center text-xs text-slate-500 font-medium">
        नवरात्रि महोत्सव प्रबंधन • QR पास वितरण प्रणाली
      </footer>
    </div>
  )
}

