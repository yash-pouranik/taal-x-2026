'use client'

import React, { useState, useEffect } from 'react'
import { X, UserCheck, Loader2, AlertCircle } from 'lucide-react'

export interface EditableParticipant {
  _id: string
  participantId: string
  countNumber?: number
  name: string
  motherName?: string
  fatherName: string
  phone?: string
  address?: string
  category?: 'general' | 'obc' | 'sc' | 'st' | null | string
  status?: 'active' | 'cancelled'
  createdAt?: string
}

interface EditParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  participant: EditableParticipant | null
  onSuccess: (updated: EditableParticipant) => void
}

export default function EditParticipantModal({
  isOpen,
  onClose,
  participant,
  onSuccess,
}: EditParticipantModalProps) {
  const [name, setName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [countNumber, setCountNumber] = useState<string | number>('')
  const [category, setCategory] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (participant) {
      setName(participant.name || '')
      setFatherName(participant.fatherName || '')
      setMotherName(participant.motherName || '')
      setPhone(participant.phone || '')
      setAddress(participant.address || '')
      setCountNumber(participant.countNumber ?? '')
      setCategory(participant.category || '')
      setError(null)
    }
  }, [participant])

  if (!isOpen || !participant) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !fatherName.trim()) {
      setError('कन्या का नाम और पिता का नाम आवश्यक हैं।')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/participants/${participant?._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          fatherName: fatherName.trim(),
          motherName: motherName.trim() || '',
          phone: phone.trim() || '',
          address: address.trim() || '',
          countNumber: countNumber !== '' ? Number(countNumber) : undefined,
          category: category ? category : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'विवरण अपडेट करने में समस्या आई')
        return
      }

      onSuccess(data.participant)
      onClose()
    } catch {
      setError('नेटवर्क त्रुटि: कृपया दोबारा प्रयास करें।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">प्रतिभागी विवरण एडिट करें</h2>
              <p className="text-xs text-slate-500 font-mono">
                {participant.participantId} {participant.countNumber ? `• क्रमांक #${participant.countNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                कन्या / बच्ची का नाम <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. प्रिया शर्मा"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
              />
            </div>

            {/* Count Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                क्रमांक (Count Number)
              </label>
              <input
                type="number"
                value={countNumber}
                onChange={(e) => setCountNumber(e.target.value)}
                placeholder="उदा. 137"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-slate-800"
              />
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                पिता जी का नाम <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="उदा. रमेश शर्मा"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
              />
            </div>

            {/* Mother Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                माता जी का नाम
              </label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="उदा. सुनीता शर्मा"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                मोबाइल नंबर
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="उदा. 9876543210"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-slate-800"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                वर्ग / श्रेणी (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
              >
                <option value="">कोई नहीं (None / Not specified)</option>
                <option value="general">सामान्य (General)</option>
                <option value="obc">ओबीसी (OBC)</option>
                <option value="sc">एससी (SC)</option>
                <option value="st">एसटी (ST)</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              पता (Address)
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="उदा. बदल का भट्टा, बाणगंगा, इंदौर"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>सुरक्षित हो रहा है...</span>
                </>
              ) : (
                <span>बदलाव सुरक्षित करें</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
