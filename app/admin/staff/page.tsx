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
        title={`Remove ${staffToDelete?.name}?`}
        description={`This will permanently delete the staff login account (${staffToDelete?.email}). They will no longer be able to log in or scan QR codes.`}
        confirmText="Yes, Delete Staff"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setStaffToDelete(null)}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Staff &amp; Volunteers
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {staff.length}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Create and manage volunteer scanner accounts for event counters.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-4 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-sm shadow-orange-600/20"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </>
            )}
          </button>
        </div>

        {/* Add Staff Card */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-base text-slate-900">
                Create Volunteer / Scanner Account
              </h2>
            </div>

            <form onSubmit={createStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Staff Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
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
                    Login Email
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
                    Initial Password
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-xs"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
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
                    No staff members created yet. Click &quot;Add Staff Member&quot; to create one.
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
                        <span>{s.isActive ? 'Active' : 'Disabled'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(s._id, s.isActive)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                          title={s.isActive ? 'Disable Account' : 'Activate Account'}
                        >
                          <Power className="w-3.5 h-3.5 text-slate-500" />
                          <span>{s.isActive ? 'Disable' : 'Enable'}</span>
                        </button>
                        <button
                          onClick={() => setStaffToDelete(s)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
