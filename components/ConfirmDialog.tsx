'use client'

import React from 'react'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'हाँ, पुष्टि करें',
  cancelText = 'रद्द करें',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-red-600" />,
          iconBg: 'bg-red-50 border-red-100',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-100',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        }
      case 'primary':
      default:
        return {
          icon: <Info className="w-6 h-6 text-orange-600" />,
          iconBg: 'bg-orange-50 border-orange-100',
          btnBg: 'bg-orange-500 hover:bg-orange-600 text-white',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog Box */}
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${styles.iconBg}`}
          >
            {styles.icon}
          </div>

          <div className="flex-1 pt-1">
            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors ${styles.btnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
