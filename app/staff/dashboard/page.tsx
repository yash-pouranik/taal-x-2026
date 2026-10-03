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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-slate-800/80 border-b border-slate-700/80 px-5 py-4 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-xs">
              <Flame className="w-4 h-4 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">
                Navratri 2026
              </span>
              <span className="text-[10px] text-orange-400 font-semibold tracking-wider">
                कार्यकर्ता काउंटर
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-3 py-1.5 rounded-xl transition-colors"
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
          <span className="text-xs font-semibold text-slate-400 tracking-wider">
            ड्यूटी पर कार्यकर्ता
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">
            {session?.user?.name || 'कार्यकर्ता'}
          </h1>
        </div>

        {/* Today's Day & Metric Badge */}
        {loading ? (
          <div className="w-full bg-slate-800/60 rounded-3xl border border-slate-700/80 p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
          </div>
        ) : day ? (
          <div className="w-full bg-slate-800/90 rounded-3xl border border-slate-700 p-7 text-center shadow-xl shadow-black/20">
            <span className="text-xs font-semibold text-orange-400 tracking-wider">
              आज का नवरात्रि दिवस
            </span>
            <div className="text-5xl font-black text-white mt-1.5 tracking-tight">
              दिवस {day}
            </div>

            {stats && (
              <div className="mt-5 pt-4 border-t border-slate-700/80 flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{stats.todayCollected} वितरित</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{stats.totalParticipants} कुल पास</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-slate-800/60 rounded-3xl border border-slate-700/80 p-6 text-center text-xs text-slate-400">
            आज का दिन सक्रिय नवरात्रि तिथियों से बाहर है।
          </div>
        )}

        {/* Primary Action Button */}
        <Link
          href="/staff/scanner"
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] text-white py-6 rounded-3xl text-center shadow-xl shadow-orange-600/30 transition-all flex flex-col items-center justify-center gap-2 group"
        >
          <div className="p-3 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
            <QrCode className="w-8 h-8" />
          </div>
          <span className="text-xl font-bold tracking-wide">QR स्कैनर खोलें</span>
          <span className="text-xs text-orange-200/80 font-medium">
            प्रतिभागी का पास स्कैन करने के लिए टैप करें
          </span>
        </Link>
      </main>

      {/* Footer hint */}
      <footer className="py-4 text-center text-[11px] text-slate-500">
        नवरात्रि महोत्सव प्रबंधन • QR पास वितरण प्रणाली
      </footer>
    </div>
  )
}
