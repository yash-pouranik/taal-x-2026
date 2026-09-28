'use client'

import AdminNav from '@/components/AdminNav'
import {
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Export Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Download comprehensive CSV datasets for offline audit, event records, and committee meetings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Participant Report */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-8 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                <Users className="w-6 h-6" />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Participant Master List
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Complete register of all girls enrolled in the system including Participant ID, Name, Father&apos;s Name, and registration date in IST.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono">
                  participants.csv
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100">
                  UTF-8 CSV
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <a
                href="/api/reports/participants"
                download="participants.csv"
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Participant CSV</span>
              </a>
            </div>
          </div>

          {/* Distribution Report */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-8 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Distribution Audit Log
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Detailed record of every prop handed out. Includes Participant ID, Name, Navratri Day, IST Timestamp, and the specific volunteer who verified the claim.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono">
                  distribution-report.csv
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100">
                  Full Audit Trail
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <a
                href="/api/reports/distribution"
                download="distribution-report.csv"
                className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-semibold text-xs shadow-sm shadow-orange-600/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Distribution CSV</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
