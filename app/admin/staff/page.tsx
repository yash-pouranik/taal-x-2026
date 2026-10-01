'use client'

import { useEffect, useState } from 'react'
import AdminNav from '@/components/AdminNav'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  Plus,
  Trash2,
  Power,
  Mail,
  Lock,
  User,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

interface StaffMember {
  _id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)

  // State for delete confirmation dialog
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null)

  async function loadStaff() {
    setTableLoading(true)
    try {
      const res = await fetch('/api/admin/staff')
      const data = await res.json()
      setStaff(data.staff || [])
    } finally {
      setTableLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  async function createStaff(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create staff member')
        return
      }
      setShowForm(false)
      setForm({ name: '', email: '', password: '' })
      loadStaff()
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    loadStaff()
  }

  async function handleConfirmDelete() {
    if (!staffToDelete) return
    const id = staffToDelete._id
    setStaffToDelete(null)
    await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' })
    loadStaff()
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      {/* Confirmation Dialog for Deleting Staff */}
      <ConfirmDialog
        isOpen={!!staffToDelete}
        title={`${staffToDelete?.name} को हटाएं?`}
        description={`यह कार्यकर्ता लॉगिन खाता (${staffToDelete?.email}) स्थायी रूप से हटा देगा। वे आगे से लॉगिन या QR स्कैन नहीं कर सकेंगे।`}
        confirmText="हाँ, कार्यकर्ता हटाएं"
        cancelText="रद्द करें"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setStaffToDelete(null)}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                कार्यकर्ता व स्वयंसेवक
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {staff.length}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              वितरण काउंटरों के लिए कार्यकर्ता स्कैनर खाते बनाएं और प्रबंधित करें।
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-sm shadow-orange-600/20 self-start sm:self-auto"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                <span>फॉर्म बंद करें</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>नया कार्यकर्ता जोड़ें</span>
              </>
            )}
          </button>
        </div>

        {/* Add Staff Card */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-base text-slate-900">
                नया कार्यकर्ता / स्कैनर खाता बनाएं
              </h2>
            </div>

            <form onSubmit={createStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    कार्यकर्ता का पूरा नाम
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="उदा. राहुल शर्मा"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    लॉगिन ईमेल (Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="staff1@event.local"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    पासवर्ड (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-xs"
                >
                  {loading ? 'खाता बन रहा है...' : 'खाता बनाएं'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[550px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">नाम</th>
                  <th className="px-6 py-3.5">ईमेल</th>
                  <th className="px-6 py-3.5">स्थिति</th>
                  <th className="px-6 py-3.5 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-orange-500" />
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      अभी तक कोई कार्यकर्ता नहीं बनाया गया है। &quot;नया कार्यकर्ता जोड़ें&quot; पर क्लिक करें।
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {s.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                        {s.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            s.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{s.isActive ? 'सक्रिय' : 'निष्क्रिय'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleActive(s._id, s.isActive)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                            title={s.isActive ? 'खाता निष्क्रिय करें' : 'खाता सक्रिय करें'}
                          >
                            <Power className="w-3.5 h-3.5 text-slate-500" />
                            <span>{s.isActive ? 'निष्क्रिय करें' : 'सक्रिय करें'}</span>
                          </button>
                          <button
                            onClick={() => setStaffToDelete(s)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                            title="कार्यकर्ता हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>हटाएं</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
