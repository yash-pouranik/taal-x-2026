'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminNav from '@/components/AdminNav'
import {
  ArrowLeft,
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Users,
  Eye,
  Trash2,
} from 'lucide-react'

interface ParsedItem {
  countNumber?: number | string
  name: string
  fatherName: string
  motherName: string
  phone: string
  address: string
  category?: string | null
}

export default function BulkImportPage() {
  const [jsonInput, setJsonInput] = useState('')
  const [parsedPreview, setParsedPreview] = useState<ParsedItem[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    importedCount: number
    skippedCount: number
    message: string
  } | null>(null)

  // Live preview parser
  function handleJsonChange(value: string) {
    setJsonInput(value)
    setParseError(null)
    setResult(null)

    if (!value.trim()) {
      setParsedPreview([])
      return
    }

    try {
      const parsed = JSON.parse(value)
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.participants)
        ? parsed.participants
        : Array.isArray(parsed.data)
        ? parsed.data
        : []

      if (!list.length) {
        setParseError('JSON एक Array [...] होना चाहिए या { "participants": [...] }')
        setParsedPreview([])
        return
      }

      const cleanKey = (s: string) =>
        String(s || '')
          .normalize('NFC')
          .replace(/[\s\-_:.,;!?'"()[\]{}|/\\]/g, '')
          .toLowerCase()

      const preview: ParsedItem[] = list.map((item: Record<string, unknown>) => {
        const getVal = (
          targets: string[],
          containsTargets: string[] = [],
          excludeContains: string[] = []
        ) => {
          const objKeys = Object.keys(item)

          // 1. Exact match (case & whitespace & punctuation insensitive)
          for (const t of targets) {
            const cleanT = cleanKey(t)
            for (const k of objKeys) {
              const ck = cleanKey(k)
              if (excludeContains.some((exc) => ck.includes(cleanKey(exc)))) continue
              if (ck === cleanT) {
                const val = item[k]
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  return String(val).trim()
                }
              }
            }
          }

          // 2. Partial substring match
          for (const ct of containsTargets) {
            const cleanCt = cleanKey(ct)
            for (const k of objKeys) {
              const ck = cleanKey(k)
              if (excludeContains.some((exc) => ck.includes(cleanKey(exc)))) continue
              if (ck.includes(cleanCt)) {
                const val = item[k]
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  return String(val).trim()
                }
              }
            }
          }

          return ''
        }

        return {
          countNumber:
            getVal(
              ['क्रमांक', 'count number', 'count', 'countnumber', 'id', 'srno', 'sno', 'क्रम'],
              ['क्रमांक', 'count']
            ) || '-',
          name: getVal(
            ['कन्या', 'kanya', 'name', 'bachi', 'बच्ची', 'girl', 'कन्या का नाम', 'नाम', 'लड़की'],
            ['कन्या', 'kanya', 'bachi', 'बच्ची'],
            ['पिता', 'माता', 'father', 'mother', 'pita', 'mata']
          ),
          fatherName: getVal(
            ['पिता', 'पिताजी', 'पिता का नाम', 'पिताजी का नाम', 'pita', 'pitaji', 'father', 'father name', 'fathername', 'pita ka nam', 'pita ka naam'],
            ['पिता', 'pita', 'father']
          ),
          motherName: getVal(
            ['माता', 'माताजी', 'माता का नाम', 'माताजी का नाम', 'mata', 'mataji', 'mother', 'mother name', 'mothername', 'mata ka nam', 'mata ka naam'],
            ['माता', 'mata', 'mother']
          ),
          phone: getVal(
            ['मोबाइल', 'मोबाइल नंबर', 'मोबाइल नं', 'फोन', 'फ़ोन', 'फोन नंबर', 'phone', 'mobile', 'contact', 'संपर्क', 'number', 'नंबर'],
            ['मोबाइल', 'mobile', 'फोन', 'फ़ोन', 'phone', 'संपर्क']
          ),
          address: getVal(
            ['पता', 'address', 'pata', 'शहर', 'स्थान', 'कॉलोनी', 'colony', 'निवास'],
            ['पता', 'address', 'pata', 'निवास']
          ),
          category:
            getVal(['category', 'catagory', 'वर्ग', 'जाति', 'श्रेणी'], ['category', 'वर्ग']) ||
            null,
        }
      })

      setParsedPreview(preview)
    } catch {
      setParseError('अमान्य JSON सिंटैक्स (Invalid JSON Syntax) - कृपया ब्रैकेट्स और कॉमा जांचें')
      setParsedPreview([])
    }
  }

  // Handle file upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        handleJsonChange(text)
      }
    }
    reader.readAsText(file)
  }

  // Submit to API
  async function handleImport() {
    if (!parsedPreview.length) return

    setLoading(true)
    setParseError(null)

    try {
      const rawData = JSON.parse(jsonInput)
      const res = await fetch('/api/participants/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawData),
      })

      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error || 'इम्पोर्ट विफल रहा')
        return
      }

      setResult({
        success: true,
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        message: data.message,
      })
      setJsonInput('')
      setParsedPreview([])
    } catch {
      setParseError('सर्वर से संपर्क करने में त्रुटि हुई।')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/admin/participants"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>प्रतिभागी सूची पर वापस जाएं</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              📥 बल्क JSON इम्पोर्ट (Bulk JSON Import)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              JSON फ़ाइल अपलोड करें या डेटा सीधे पेस्ट करें। सभी प्रतिभागियों के QR कोड अपने आप जनरेट हो जाएंगे।
            </p>
          </div>

          <Link
            href="/admin/participants/print-sheet"
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all text-xs shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>A4 प्रिंट शीट</span>
          </Link>
        </div>

        {/* Success Banner */}
        {result?.success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">
              {result.message}
            </h2>
            <p className="text-xs text-emerald-700 mt-1">
              सभी प्रतिभागियों के रिकॉर्ड सेव हो चुके हैं और QR कोड तैयार हैं।
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <Link
                href="/admin/participants"
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-xs"
              >
                <Users className="w-4 h-4" />
                <span>प्रतिभागी सूची देखें</span>
              </Link>
              <Link
                href="/admin/participants/print-sheet"
                className="inline-flex items-center gap-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>कार्ड प्रिंट करें</span>
              </Link>
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-slate-200 transition-all"
              >
                और इम्पोर्ट करें
              </button>
            </div>
          </div>
        )}

        {/* Input Form Box */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-8 mb-6">
          {/* File Upload Zone */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              JSON फ़ाइल चुनें (.json)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-orange-50/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                फ़ाइल खींचकर यहाँ छोड़ें या ब्राउज़ करें
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                केवल .json फ़ाइल समर्थित है
              </p>
            </div>
          </div>

          {/* Direct Paste JSON Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-slate-400" />
                <span>या JSON कोड यहाँ पेस्ट करें</span>
              </label>
              {jsonInput && (
                <button
                  onClick={() => handleJsonChange('')}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>साफ़ करें</span>
                </button>
              )}
            </div>
            <textarea
              rows={8}
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={`[
  {
    "count number": 1,
    "kanya": "प्रिया शर्मा",
    "pita ka nam": "रमेश शर्मा",
    "mata ka naam": "सुनीता शर्मा",
    "number": "9876543210",
    "pata": "वार्ड नंबर 4, इंदौर"
  }
]`}
              className="w-full p-4 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 placeholder:text-slate-300"
            />
          </div>

          {parseError && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Live Preview Table */}
        {parsedPreview.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-8 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    डेटा पूर्वावलोकन (Preview)
                  </h3>
                  <p className="text-xs text-slate-500">
                    इम्पोर्ट करने से पहले कॉलम और विवरण की जांच कर लें।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-mono">
                  कुल: {parsedPreview.length} लड़कियाँ
                </span>

                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>इम्पोर्ट हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>डेटाबेस में इम्पोर्ट करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3 rounded-l-lg">क्रमांक</th>
                    <th className="py-2.5 px-3">कन्या (नाम)</th>
                    <th className="py-2.5 px-3">पिता का नाम</th>
                    <th className="py-2.5 px-3">माता का नाम</th>
                    <th className="py-2.5 px-3">मोबाइल नंबर</th>
                    <th className="py-2.5 px-3 rounded-r-lg">पता</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                        #{item.countNumber}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name || <span className="text-red-400">नाम अनुपलब्ध</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.fatherName || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.motherName || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">
                        {item.phone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]" title={item.address}>
                        {item.address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md shadow-orange-600/20 transition-all inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>डेटाबेस में सुरक्षित हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>सभी {parsedPreview.length} प्रतिभागियों को इम्पोर्ट करें</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
