'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  Users,
  UtensilsCrossed,
  Clock,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  LogIn,
  RefreshCw,
  ExternalLink,
  ArrowUpDown,
  AlertTriangle,
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
  hasEntered: boolean
  entryTime?: string
  timeSpent?: string
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
  foodDistributed: number
  pendingTurnout: number
  pendingFood: number
  pendingFoodForEntered: number
}

interface EventConfigInfo {
  startDate: string
  endDate: string
  entryStartTime: string
  entryEndTime: string
}

export default function DailyScansPage() {
  const [availableDates, setAvailableDates] = useState<DateOption[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [config, setConfig] = useState<EventConfigInfo | null>(null)
  const [summary, setSummary] = useState<SummaryData>({
    totalParticipants: 0,
    turnout: 0,
    foodDistributed: 0,
    pendingTurnout: 0,
    pendingFood: 0,
    pendingFoodForEntered: 0,
  })
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_food' | 'food_done'
  >('all')
  const [sortBy, setSortBy] = useState<
    'latest' | 'pending_wait_desc' | 'food_diff_desc'
  >('latest')

  // Helper to compute time difference between entry and food claim
  function getScanDelayMetrics(record: ScanRecord) {
    if (!record.hasEntered || !record.entryTime) {
      return {
        hasEntered: false,
        isPendingFood: false,
        foodDiffMs: 0,
        foodDiffLabel: '',
      }
    }

    const entryMs = new Date(record.entryTime).getTime()
    const isPendingFood = !record.foodClaimed

    // Food diff: if claimed, (foodClaimedAt - entryTime). If pending, (now - entryTime).
    const foodClaimMs = record.foodClaimed && record.foodClaimedAt
      ? new Date(record.foodClaimedAt).getTime()
      : Date.now()
    const foodDiffMs = Math.max(0, foodClaimMs - entryMs)

    function formatDiff(ms: number) {
      const mins = Math.floor(ms / 60000)
      const hours = Math.floor(mins / 60)
      const remMins = mins % 60
      if (hours === 0) return `${mins} मि.`
      if (remMins === 0) return `${hours} घंटे`
      return `${hours} घं. ${remMins} मि.`
    }

    return {
      hasEntered: true,
      isPendingFood,
      foodDiffMs,
      foodDiffLabel: formatDiff(foodDiffMs),
    }
  }

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

    if (statusFilter === 'pending_food') {
      return record.hasEntered && !record.foodClaimed
    }
    if (statusFilter === 'food_done') {
      return record.foodClaimed
    }

    return true
  })

  // Sorted scans
  const sortedAndFilteredScans = [...filteredScans].sort((a, b) => {
    const metricsA = getScanDelayMetrics(a)
    const metricsB = getScanDelayMetrics(b)

    if (sortBy === 'pending_wait_desc') {
      if (metricsA.isPendingFood && !metricsB.isPendingFood) return -1
      if (!metricsA.isPendingFood && metricsB.isPendingFood) return 1
      return metricsB.foodDiffMs - metricsA.foodDiffMs
    }

    if (sortBy === 'food_diff_desc') {
      return metricsB.foodDiffMs - metricsA.foodDiffMs
    }

    // Default 'latest': by entryTime or claimedAt descending
    const timeA = new Date(a.entryTime || a.claimedAt).getTime()
    const timeB = new Date(b.entryTime || b.claimedAt).getTime()
    return timeB - timeA
  })

  const pendingFoodCount = scans.filter((s) => s.hasEntered && !s.foodClaimed).length

  // Export to CSV
  function handleExportCSV() {
    if (!sortedAndFilteredScans.length) return

    const headers = [
      'Participant ID',
      'Participant Name',
      'Father Name',
      'Navratri Day',
      'Date (IST)',
      'Entry Time (IST)',
      'Bhojan Packet Status',
      'Bhojan Delay / Diff',
      'Bhojan Packet Claim Time',
      'Bhojan Packet Staff',
    ]

    const rows = sortedAndFilteredScans.map((s) => {
      const m = getScanDelayMetrics(s)
      return [
        `"${s.participant.participantId}"`,
        `"${s.participant.name}"`,
        `"${s.participant.fatherName}"`,
        s.navratriDay,
        s.distributionDate,
        s.entryTime
          ? new Date(s.entryTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
          : '-',
        s.foodClaimed ? 'CLAIMED' : (s.hasEntered ? 'PENDING' : 'NOT ENTERED'),
        `"${m.foodDiffLabel || '-'}"`,
        s.foodClaimedAt
          ? new Date(s.foodClaimedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
          : '-',
        `"${s.foodStaffName || '-'}"`,
      ]
    })

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

  const foodPercent = summary.turnout > 0
    ? Math.round((summary.foodDistributed / summary.turnout) * 100)
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
                दैनिक स्कैन व उपस्थिति रिपोर्ट
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              प्रतिभागी प्रवेश (Gate Entry) एवं भोजन पैकेट (Bhojan) वितरण का लाइव दैनिक विवरण।
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchScanData(selectedDate)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
              <span>रिफ्रेश</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading || scans.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>दिवस {selectedDay} CSV डाउनलोड</span>
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
                      <span>दिवस {item.day}</span>
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
                समय सारणी: <strong>दिवस {selectedDay} ({selectedDate})</strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-600">
              <span className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-orange-200/40">
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                <span>प्रवेश समय (Entry): <strong>{config.entryStartTime} - {config.entryEndTime}</strong></span>
              </span>
            </div>
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Participants Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">कुल पंजीकृत</span>
              <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{summary.totalParticipants}</span>
              <span className="text-xs font-semibold text-slate-400">प्रतिभागी</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
              <span>सक्रिय पास</span>
              <span className="font-bold text-slate-700">{summary.totalParticipants}</span>
            </div>
          </div>

          {/* Turnout / Gate Entry Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs space-y-2 bg-gradient-to-b from-white to-emerald-50/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">आज प्रवेश (Gate Entry)</span>
              <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                <LogIn className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{summary.turnout}</span>
              <span className="text-xs font-semibold text-slate-400">/ {summary.totalParticipants}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-emerald-100 flex justify-between">
              <span>उपस्थिति</span>
              <span className="font-bold text-emerald-700">{turnoutPercent}%</span>
            </div>
          </div>

          {/* Bhojan Packets Distributed */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-blue-200/80 shadow-xs space-y-2 bg-gradient-to-b from-white to-blue-50/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">भोजन पैकेट वितरित</span>
              <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">{summary.foodDistributed}</span>
              <span className="text-xs font-semibold text-slate-400">वितरित</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-blue-100 flex justify-between">
              <span>उपस्थिति में से</span>
              <span className="font-bold text-blue-700">{foodPercent}%</span>
            </div>
          </div>

          {/* Bhojan Pending Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">भोजन पैकेट शेष</span>
              <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{summary.pendingFood}</span>
              <span className="text-xs font-semibold text-slate-400">शेष</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
              <span>कुल बाकी</span>
              <span className="font-semibold text-amber-700">{summary.pendingFood}</span>
            </div>
          </div>

          {/* Entered but Food Pending Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/90 shadow-xs space-y-2 col-span-2 sm:col-span-1 bg-gradient-to-b from-white to-amber-50/30">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">प्रवेश हुआ, भोजन बाकी</span>
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{pendingFoodCount}</span>
              <span className="text-xs font-semibold text-amber-900">प्रतीक्षारत</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-amber-100 flex justify-between">
              <span>अंदर हैं भोजन बाकी</span>
              <span className="font-bold text-amber-700">{pendingFoodCount}</span>
            </div>
          </div>
        </div>

        {/* Scan Log Table Section */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900">
                प्रतिभागी स्कैन व उपस्थिति सूची
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedDate} (दिवस {selectedDay}) पर दर्ज किए गए स्कैन
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="नाम या आईडी से खोजें..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-52 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
              >
                <option value="all">सभी स्कैन ({scans.length})</option>
                <option value="pending_food">⚠️ प्रवेश हुआ, भोजन बाकी ({pendingFoodCount})</option>
                <option value="food_done">✅ भोजन पैकेट वितरित ({summary.foodDistributed})</option>
              </select>

              {/* Sort By Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  title="क्रमबद्ध करें (Sort By)"
                >
                  <option value="latest">समय: नवीनतम स्कैन पहले</option>
                  <option value="pending_wait_desc">⚠️ भोजन लंबित: अधिक प्रतीक्षा (High → Low)</option>
                  <option value="food_diff_desc">🍱 प्रवेश ➔ भोजन अंतर (High → Low)</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="text-xs">दिवस {selectedDay} के स्कैन लोड हो रहे हैं...</span>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              दिवस {selectedDay} के लिए कोई स्कैन रिकॉर्ड नहीं मिला।
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="py-3 px-4 rounded-l-xl">प्रतिभागी</th>
                    <th className="py-3 px-3">प्रवेश (Gate Entry)</th>
                    <th className="py-3 px-3">भोजन पैकेट (Bhojan)</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">विवरण</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedAndFilteredScans.map((record) => {
                    const metrics = getScanDelayMetrics(record)
                    return (
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
                              पिता / अभिभावक: {record.participant.fatherName}
                            </span>
                            {/* Warning banner if food pending */}
                            {metrics.isPendingFood && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50/80 px-1.5 py-0.5 rounded w-fit">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>भोजन बाकी ({metrics.foodDiffLabel})</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Gate Entry Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {record.hasEntered ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>प्रवेश दर्ज (IN)</span>
                              </span>
                              <span className="text-[11px] text-slate-600 mt-1 font-mono">
                                समय: {record.entryTime ? new Date(record.entryTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                              प्रवेश बाकी
                            </span>
                          )}
                        </td>

                        {/* Food Packet Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {record.foodClaimed ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-semibold w-fit">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                वितरित
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {record.foodClaimedAt && new Date(record.foodClaimedAt).toLocaleTimeString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {record.foodStaffName ? ` • ${record.foodStaffName}` : ''}
                              </span>
                              {metrics.hasEntered && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  अंतर: {metrics.foodDiffLabel}
                                </span>
                              )}
                            </div>
                          ) : record.hasEntered ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold w-fit animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                बाकी ({metrics.foodDiffLabel} से)
                              </span>
                              <span className="text-[10px] text-amber-700 font-semibold">
                                विलंब: {metrics.foodDiffLabel}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <XCircle className="w-3 h-3 text-slate-300" />
                              बाकी
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
                              <span>प्रोफाइल</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
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
      </main>
    </div>
  )
}
