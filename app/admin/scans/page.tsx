'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  Users,
  Gift,
  UtensilsCrossed,
  Clock,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  LogIn,
  LogOut as ExitIcon,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

interface ScanRecord {
  _id: string
  participant: {
    id: string
    participantId: string
    name: string
    fatherName: string
    status: string
  }
  navratriDay: number
  distributionDate: string
  giftClaimed: boolean
  giftClaimedAt?: string
  giftStaffName?: string
  foodClaimed: boolean
  foodClaimedAt?: string
  foodStaffName?: string
  claimedAt: string
}

interface DateOption {
  day: number
  date: string
  isToday: boolean
}

interface SummaryData {
  totalParticipants: number
  turnout: number
  giftDistributed: number
  foodDistributed: number
  pendingTurnout: number
  pendingGift: number
  pendingFood: number
}

interface EventConfigInfo {
  startDate: string
  endDate: string
  entryStartTime: string
  entryEndTime: string
  exitStartTime: string
  exitEndTime: string
}

export default function DailyScansPage() {
  const [availableDates, setAvailableDates] = useState<DateOption[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [config, setConfig] = useState<EventConfigInfo | null>(null)
  const [summary, setSummary] = useState<SummaryData>({
    totalParticipants: 0,
    turnout: 0,
    giftDistributed: 0,
    foodDistributed: 0,
    pendingTurnout: 0,
    pendingGift: 0,
    pendingFood: 0,
  })
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'both' | 'gift_only' | 'food_only'>('all')

  async function fetchScanData(targetDate?: string) {
    setLoading(true)
    try {
      const url = targetDate
        ? `/api/admin/scans?date=${targetDate}`
        : '/api/admin/scans'
      const res = await fetch(url)
      const data = await res.json()

      if (res.ok) {
        setAvailableDates(data.availableDates || [])
        setSelectedDate(data.selectedDate)
        setSelectedDay(data.selectedDay)
        setConfig(data.config)
        setSummary(data.summary)
        setScans(data.scans || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScanData()
  }, [])

  function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr)
    fetchScanData(dateStr)
  }

  // Filtered scans
  const filteredScans = scans.filter((record) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      record.participant.name.toLowerCase().includes(q) ||
      record.participant.fatherName.toLowerCase().includes(q) ||
      record.participant.participantId.toLowerCase().includes(q)

    if (!matchesSearch) return false

    if (statusFilter === 'both') {
      return record.giftClaimed && record.foodClaimed
    }
    if (statusFilter === 'gift_only') {
      return record.giftClaimed && !record.foodClaimed
    }
    if (statusFilter === 'food_only') {
      return !record.giftClaimed && record.foodClaimed
    }

    return true
  })

  // Export to CSV
  function handleExportCSV() {
    if (!scans.length) return

    const headers = [
      'Participant ID',
      'Participant Name',
      'Father Name',
      'Navratri Day',
      'Date (IST)',
      'First Check-In (IST)',
      'Gift Status',
      'Gift Claim Time',
      'Gift Staff',
      'Food Packet Status',
      'Food Packet Claim Time',
      'Food Packet Staff',
    ]

    const rows = filteredScans.map((s) => [
      `"${s.participant.participantId}"`,
      `"${s.participant.name}"`,
      `"${s.participant.fatherName}"`,
      s.navratriDay,
      s.distributionDate,
      s.claimedAt
        ? new Date(s.claimedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        : '-',
      s.giftClaimed ? 'CLAIMED' : 'PENDING',
      s.giftClaimedAt
        ? new Date(s.giftClaimedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        : '-',
      `"${s.giftStaffName || '-'}"`,
      s.foodClaimed ? 'CLAIMED' : 'PENDING',
      s.foodClaimedAt
        ? new Date(s.foodClaimedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        : '-',
      `"${s.foodStaffName || '-'}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `scans-day-${selectedDay}-${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const turnoutPercent = summary.totalParticipants > 0
    ? Math.round((summary.turnout / summary.totalParticipants) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header with Title and Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                <Calendar className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Date-Wise Scans & Turnout
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Real-time daily breakdown of participant attendance, gift/prop claims, and food packets.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchScanData(selectedDate)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading || scans.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Day {selectedDay} CSV</span>
            </button>
          </div>
        </div>

        {/* 9-Day Pill Selector */}
        {availableDates.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {availableDates.map((item) => {
                const isSelected = item.date === selectedDate
                return (
                  <button
                    key={item.date}
                    onClick={() => handleSelectDate(item.date)}
                    className={`shrink-0 flex flex-col items-center py-2 px-3.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-orange-600 text-white font-semibold shadow-sm shadow-orange-600/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Day {item.day}</span>
                      {item.isToday && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-mono mt-0.5 ${
                        isSelected ? 'text-orange-100' : 'text-slate-400'
                      }`}
                    >
                      {item.date.slice(5)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Operational Time Windows Info Bar */}
        {config && (
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-orange-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>
                Schedule for <strong>Day {selectedDay} ({selectedDate})</strong>
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-orange-200/40">
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                <span>Entry Window: <strong>{config.entryStartTime} - {config.entryEndTime}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-orange-200/40">
                <ExitIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Exit Window: <strong>{config.exitStartTime} - {config.exitEndTime}</strong></span>
              </span>
            </div>
          </div>
        )}

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Turnout Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Day Turnout</span>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{summary.turnout}</span>
              <span className="text-xs font-semibold text-slate-400">/ {summary.totalParticipants}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Attendance Rate</span>
              <span className="font-bold text-orange-600">{turnoutPercent}%</span>
            </div>
          </div>

          {/* Gifts / Props Distributed */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gifts / Props</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700">{summary.giftDistributed}</span>
              <span className="text-xs font-semibold text-slate-400">given</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Pending Gifts</span>
              <span className="font-semibold text-amber-600">{summary.pendingGift}</span>
            </div>
          </div>

          {/* Food Packets Distributed */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Food Packets</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-700">{summary.foodDistributed}</span>
              <span className="text-xs font-semibold text-slate-400">given</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Pending Packets</span>
              <span className="font-semibold text-amber-600">{summary.pendingFood}</span>
            </div>
          </div>

          {/* Total Registered Active */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Turnout</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-700">{summary.pendingTurnout}</span>
              <span className="text-xs font-semibold text-slate-400">yet to arrive</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Total Active Passes</span>
              <span className="font-bold text-slate-800">{summary.totalParticipants}</span>
            </div>
          </div>
        </div>

        {/* Scan Log Table Section */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Participant Scans Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed scan entries recorded on {selectedDate} (Day {selectedDay})
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search participant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'both' | 'gift_only' | 'food_only')}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">All Scans ({scans.length})</option>
                <option value="both">Both Claimed</option>
                <option value="gift_only">Gift Only</option>
                <option value="food_only">Food Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="text-xs">Loading scans for Day {selectedDay}...</span>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No scans recorded for Day {selectedDay} matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="py-3 px-4 rounded-l-xl">Participant</th>
                    <th className="py-3 px-3">First Check-in</th>
                    <th className="py-3 px-3">Gift / Prop</th>
                    <th className="py-3 px-3">Food Packet</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredScans.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Participant */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                              {record.participant.participantId}
                            </span>
                            <span className="font-bold text-slate-900">
                              {record.participant.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 pl-0.5">
                            D/o: {record.participant.fatherName}
                          </span>
                        </div>
                      </td>

                      {/* First Check-in Time */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {new Date(record.claimedAt).toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Gift Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {record.giftClaimed ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Claimed
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {record.giftClaimedAt && new Date(record.giftClaimedAt).toLocaleTimeString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {record.giftStaffName ? ` • ${record.giftStaffName}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            <XCircle className="w-3 h-3 text-slate-300" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Food Packet Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {record.foodClaimed ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-semibold w-fit">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                              Claimed
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {record.foodClaimedAt && new Date(record.foodClaimedAt).toLocaleTimeString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {record.foodStaffName ? ` • ${record.foodStaffName}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            <XCircle className="w-3 h-3 text-slate-300" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {record.participant.id && (
                          <Link
                            href={`/admin/participants/${record.participant.id}`}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
