import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import { generateQRToken, hashToken } from '@/lib/qr'

// Helper to find a value across various case-insensitive key synonyms
function getField(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    for (const objKey of Object.keys(obj)) {
      if (objKey.trim().toLowerCase() === k.toLowerCase()) {
        const val = obj[objKey]
        if (val !== undefined && val !== null) {
          return String(val).trim()
        }
      }
    }
  }
  return ''
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  let rawData: unknown
  try {
    rawData = await req.json()
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON डेटा (Invalid JSON)' }, { status: 400 })
  }

  // Support direct array, or wrapped in { participants: [...] } or { data: [...] }
  let list: Record<string, unknown>[] = []
  if (Array.isArray(rawData)) {
    list = rawData
  } else if (rawData && typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>
    if (Array.isArray(obj.participants)) {
      list = obj.participants
    } else if (Array.isArray(obj.data)) {
      list = obj.data
    } else if (Array.isArray(obj.items)) {
      list = obj.items
    }
  }

  if (!list.length) {
    return NextResponse.json(
      { error: 'JSON में कोई प्रतिभागी डेटा नहीं मिला (Empty array or invalid structure)' },
      { status: 400 }
    )
  }

  // Count existing participants for sequential IDs
  let currentCount = await Participant.countDocuments()

  const validCategories = ['general', 'obc', 'sc', 'st']
  const docsToInsert: Array<Record<string, unknown>> = []
  const skipped: Array<{ row: number; reason: string; data: unknown }> = []

  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (!item || typeof item !== 'object') {
      skipped.push({ row: i + 1, reason: 'अमान्य ऑब्जेक्ट', data: item })
      continue
    }

    // Map flexible keys
    const name = getField(item, [
      'kanya',
      'kanya ka naam',
      'kanya naam',
      'name',
      'bachi',
      'bachi ka naam',
      'girl',
      'girl name',
      'बच्ची का नाम',
      'कन्या',
      'नाम',
    ])

    const fatherName = getField(item, [
      'pita ka nam',
      'pita ka naam',
      'pita',
      'pita ji',
      'pitaji',
      'father',
      'father name',
      'fatherName',
      'पिता का नाम',
      'पिता',
    ])

    const motherName = getField(item, [
      'mata ka naam',
      'mata ka nam',
      'mata',
      'mata ji',
      'mataji',
      'mother',
      'mother name',
      'motherName',
      'माता का नाम',
      'माता',
    ])

    const phone = getField(item, [
      'number',
      'phone',
      'mobile',
      'contact',
      'phone number',
      'mobile number',
      'फोन नंबर',
      'मोबाइल',
      'नंबर',
    ])

    const address = getField(item, [
      'pata',
      'address',
      'city',
      'location',
      'पता',
    ])

    const countNumStr = getField(item, [
      'count number',
      'count number as id',
      'count',
      'countNumber',
      'id',
      'क्रमांक',
      'काउंट नंबर',
      'क्रमांक संख्या',
    ])

    const rawCategory = getField(item, [
      'category',
      'catagory',
      'caste',
      'वर्ग',
      'जाति',
    ]).toLowerCase()

    if (!name) {
      skipped.push({ row: i + 1, reason: 'कन्या / बच्ची का नाम अनुपलब्ध (Missing name)', data: item })
      continue
    }

    currentCount++
    const participantId = `NAV-${String(currentCount).padStart(3, '0')}`

    let countNumber: number | undefined
    if (countNumStr && !isNaN(Number(countNumStr))) {
      countNumber = Number(countNumStr)
    } else {
      countNumber = currentCount
    }

    const category = validCategories.includes(rawCategory) ? rawCategory : null

    const rawToken = generateQRToken()
    const qrTokenHash = hashToken(rawToken)

    docsToInsert.push({
      participantId,
      countNumber,
      name,
      motherName: motherName || '',
      fatherName: fatherName || '',
      phone: phone || '',
      address: address || '',
      category,
      status: 'active',
      qrToken: rawToken,
      qrTokenHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  if (docsToInsert.length === 0) {
    return NextResponse.json(
      {
        error: 'कोई भी रिकॉर्ड इम्पोर्ट नहीं हो सका। कृपया फ़ील्ड्स (kanya, pita ka nam) की जांच करें।',
        skipped,
      },
      { status: 400 }
    )
  }

  // Insert all valid documents
  const inserted = await Participant.insertMany(docsToInsert)

  return NextResponse.json({
    success: true,
    totalReceived: list.length,
    importedCount: inserted.length,
    skippedCount: skipped.length,
    skipped,
    message: `${inserted.length} प्रतिभागी सफलतापूर्वक इम्पोर्ट किए गए।`,
  })
}
