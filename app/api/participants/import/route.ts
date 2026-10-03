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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bulkOps: any[] = []
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

    let countNumber: number
    if (countNumStr && !isNaN(Number(countNumStr))) {
      countNumber = Number(countNumStr)
    } else {
      currentCount++
      countNumber = currentCount
    }

    const participantId = `NAV-${String(countNumber).padStart(3, '0')}`
    const category = validCategories.includes(rawCategory) ? rawCategory : null

    const rawToken = generateQRToken()
    const qrTokenHash = hashToken(rawToken)

    bulkOps.push({
      updateOne: {
        filter: { participantId },
        update: {
          $set: {
            participantId,
            countNumber,
            name,
            motherName: motherName || '',
            fatherName: fatherName || '',
            phone: phone || '',
            address: address || '',
            category,
            status: 'active',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            qrToken: rawToken,
            qrTokenHash,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    })
  }

  if (bulkOps.length === 0) {
    return NextResponse.json(
      {
        error: 'कोई भी रिकॉर्ड इम्पोर्ट नहीं हो सका। कृपया फ़ील्ड्स (कन्या, पिता आदि) की जांच करें।',
        skipped,
      },
      { status: 400 }
    )
  }

  // Execute bulk operations with upsert
  const bulkResult = await Participant.bulkWrite(bulkOps)
  const totalAffected = (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0) + (bulkResult.insertedCount || 0)

  return NextResponse.json({
    success: true,
    totalReceived: list.length,
    importedCount: totalAffected || bulkOps.length,
    skippedCount: skipped.length,
    skipped,
    message: `${bulkOps.length} प्रतिभागी सफलतापूर्वक इम्पोर्ट/अपडेट किए गए।`,
  })
}
