'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ArrowRight,
  BarChart3,
  Loader2,
} from 'lucide-react'

interface Stats {
  todayDate: string
  totalParticipants: number
  todayCollected: number
  todayPending: number
  collectionRate: string
  perDay: { day: number; date: string; collected: number }[]
  config: { startDate: string; endDate: string } | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const maxCollected = Math.max(1, ...(stats?.perDay?.map((d) => d.collected) ?? [1]))

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              वितरण अवलोकन (डैशबोर्ड)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              नवरात्रि वितरण, उपस्थिति और दैनिक स्कैन की वास्तविक समय स्थिति।
            </p>
          </div>

          {stats?.todayDate && (
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-xs text-xs font-semibold text-slate-700 self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>आज (IST): {stats.todayDate}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium">वितरण आंकड़े लोड हो रहे हैं...</span>
          </div>
        ) : !stats?.config ? (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-6 text-amber-900 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900">कार्यक्रम तिथियां निर्धारित नहीं हैं</h3>
              <p className="text-sm text-amber-800 mt-1">
                कृपया दैनिक दिन गणना और आंकड़ों के लिए नवरात्रि प्रारंभ और समाप्ति तिथि सेट करें।
              </p>
              <Link
                href="/admin/config"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-amber-900 hover:text-amber-950 underline"
              >
                <span>कार्यक्रम तिथियां सेट करें</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                {
                  label: 'कुल पंजीकृत',
                  value: stats.totalParticipants.toLocaleString('hi-IN'),
                  sub: 'पंजीकृत प्रतिभागी',
                  icon: Users,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50/80 border-blue-100',
                },
                {
                  label: 'आज वितरित',
                  value: stats.todayCollected.toLocaleString('hi-IN'),
                  sub: 'दिए गए उपहार/प्रॉप्स',
                  icon: CheckCircle2,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50/80 border-emerald-100',
                },
                {
                  label: 'आज बाकी',
                  value: stats.todayPending.toLocaleString('hi-IN'),
                  sub: 'वितरण शेष',
                  icon: Clock,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50/80 border-amber-100',
                },
                {
                  label: 'वितरण प्रतिशत',
                  value: `${stats.collectionRate}%`,
                  sub: 'उपस्थिति प्रगति',
                  icon: TrendingUp,
                  color: 'text-purple-600',
                  bg: 'bg-purple-50/80 border-purple-100',
                },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.label}
                    className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 hover:shadow-sm transition-shadow flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {card.label}
                      </span>
                      <div className={`p-2 rounded-xl border ${card.bg}`}>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold tracking-tight text-slate-900">
                        {card.value}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-medium">
                        {card.sub}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Daily Distribution Chart */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-50 border border-orange-100 rounded-xl text-orange-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-900">
                      ९-दिवसीय वितरण विवरण
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      प्रत्येक दिन सत्यापित और वितरित सामग्री का विवरण।
                    </p>
                  </div>
                </div>

                <Link
                  href="/admin/reports"
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>रिपोर्ट डाउनलोड करें</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3.5">
                {stats.perDay.map((d) => {
                  const percentage =
                    maxCollected > 0
                      ? Math.round((d.collected / maxCollected) * 100)
                      : 0
                  const isCurrentDay = d.date === stats.todayDate

                  return (
                    <div
                      key={d.day}
                      className={`flex items-center gap-3 sm:gap-4 p-2.5 rounded-xl transition-colors ${
                        isCurrentDay ? 'bg-orange-50/60 border border-orange-200/70' : ''
                      }`}
                    >
                      <div className="w-20 sm:w-24 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold ${
                              isCurrentDay ? 'text-orange-700' : 'text-slate-700'
                            }`}
                          >
                            दिवस {d.day}
                          </span>
                          {isCurrentDay && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {d.date}
                        </span>
                      </div>

                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCurrentDay
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <div className="w-14 sm:w-16 text-right shrink-0">
                        <span
                          className={`text-sm font-bold ${
                            isCurrentDay ? 'text-orange-700' : 'text-slate-900'
                          }`}
                        >
                          {d.collected}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
