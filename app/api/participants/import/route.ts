import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import { generateQRToken, hashToken } from '@/lib/qr'

function cleanKey(s: string): string {
  return String(s || '')
    .normalize('NFC')
    .replace(/[\s\-_:.,;!?'"()[\]{}|/\\]/g, '')
    .toLowerCase()
}

// Helper to find a value across various key synonyms with Unicode & partial matching
function getField(
  obj: Record<string, unknown>,
  targets: string[],
  containsTargets: string[] = [],
  excludeContains: string[] = []
): string {
  const objKeys = Object.keys(obj)

  // 1. Exact match (case & whitespace & punctuation insensitive)
  for (const t of targets) {
    const cleanT = cleanKey(t)
    for (const k of objKeys) {
      const ck = cleanKey(k)
      if (excludeContains.some((exc) => ck.includes(cleanKey(exc)))) continue
      if (ck === cleanT) {
        const val = obj[k]
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
        const val = obj[k]
        if (val !== undefined && val !== null && String(val).trim() !== '') {
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
    const name = getField(
      item,
      ['कन्या', 'kanya', 'name', 'bachi', 'बच्ची', 'girl', 'कन्या का नाम', 'नाम', 'लड़की'],
      ['कन्या', 'kanya', 'bachi', 'बच्ची'],
      ['पिता', 'माता', 'father', 'mother', 'pita', 'mata']
    )

    const fatherName = getField(
      item,
      ['पिता', 'पिताजी', 'पिता का नाम', 'पिताजी का नाम', 'pita', 'pitaji', 'father', 'father name', 'fathername', 'pita ka nam', 'pita ka naam'],
      ['पिता', 'pita', 'father']
    )

    const motherName = getField(
      item,
      ['माता', 'माताजी', 'माता का नाम', 'माताजी का नाम', 'mata', 'mataji', 'mother', 'mother name', 'mothername', 'mata ka nam', 'mata ka naam'],
      ['माता', 'mata', 'mother']
    )

    const phone = getField(
      item,
      ['मोबाइल', 'मोबाइल नंबर', 'मोबाइल नं', 'फोन', 'फ़ोन', 'फोन नंबर', 'phone', 'mobile', 'contact', 'संपर्क', 'number', 'नंबर'],
      ['मोबाइल', 'mobile', 'फोन', 'फ़ोन', 'phone', 'संपर्क']
    )

    const address = getField(
      item,
      ['पता', 'address', 'pata', 'शहर', 'स्थान', 'कॉलोनी', 'colony', 'निवास'],
      ['पता', 'address', 'pata', 'निवास']
    )

    const countNumStr = getField(
      item,
      ['क्रमांक', 'count number', 'count', 'countnumber', 'id', 'srno', 'sno', 'क्रम'],
      ['क्रमांक', 'count']
    )

    const rawCategory = getField(
      item,
      ['category', 'catagory', 'caste', 'वर्ग', 'जाति', 'श्रेणी'],
      ['category', 'वर्ग']
    ).toLowerCase()

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
