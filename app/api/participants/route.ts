import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import { generateQRToken, hashToken } from '@/lib/qr'

/**
 * Safely computes the next available sequence number.
 * Directly maps 1:1 with participantId: NAV-{countNumber}.
 * Uses MongoDB aggregation to find true numeric maximum across both
 * `countNumber` and numeric component of `participantId`.
 */
async function getNextAvailableCountNumber(): Promise<number> {
  const maxAgg = await Participant.aggregate([
    {
      $project: {
        numFromId: {
          $convert: {
            input: {
              $arrayElemAt: [{ $split: ['$participantId', '-'] }, 1],
            },
            to: 'int',
            onError: 0,
            onNull: 0,
          },
        },
        numFromCount: {
          $convert: {
            input: '$countNumber',
            to: 'int',
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $project: {
        effectiveNum: { $max: ['$numFromId', '$numFromCount'] },
      },
    },
    {
      $group: {
        _id: null,
        maxNum: { $max: '$effectiveNum' },
      },
    },
  ])

  const highestExistingNum =
    maxAgg.length > 0 && typeof maxAgg[0].maxNum === 'number'
      ? maxAgg[0].maxNum
      : 0

  let candidateNum = Math.max(1, highestExistingNum + 1)
  let candidateId = `NAV-${String(candidateNum).padStart(3, '0')}`

  // Ensure candidate number and ID are not already taken by any record
  while (
    await Participant.exists({
      $or: [{ participantId: candidateId }, { countNumber: candidateNum }],
    })
  ) {
    candidateNum++
    candidateId = `NAV-${String(candidateNum).padStart(3, '0')}`
  }

  return candidateNum
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  if (req.nextUrl.searchParams.get('checkNext') === 'true') {
    const nextNum = await getNextAvailableCountNumber()
    return NextResponse.json({
      nextCountNumber: nextNum,
      nextParticipantId: `NAV-${String(nextNum).padStart(3, '0')}`,
    })
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
  const limitParam = req.nextUrl.searchParams.get('limit')
  const isAll = limitParam === 'all' || limitParam === '0'
  const limit = isAll ? 0 : parseInt(limitParam || '500')

  const fromParam = req.nextUrl.searchParams.get('from') || req.nextUrl.searchParams.get('fromCount')
  const toParam = req.nextUrl.searchParams.get('to') || req.nextUrl.searchParams.get('toCount')

  // Check if range is given via query params
  let from: number | null = fromParam && !isNaN(Number(fromParam)) ? Number(fromParam) : null
  let to: number | null = toParam && !isNaN(Number(toParam)) ? Number(toParam) : null

  // Check if `q` matches a range pattern: e.g. "262 or 278", "262-278", "262 to 278", "262 se 278", "262 278"
  const rangeMatch = q.match(/^#?(\d+)\s*(?:-|to|or|se|and|तक|\s)+\s*#?(\d+)(?:\s*(?:tak|तक))?$/i)
  if (rangeMatch) {
    const n1 = parseInt(rangeMatch[1], 10)
    const n2 = parseInt(rangeMatch[2], 10)
    from = Math.min(n1, n2)
    to = Math.max(n1, n2)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = {}

  if (from !== null && to !== null) {
    const paddedIds: string[] = []
    if (to - from <= 2000) {
      for (let c = from; c <= to; c++) {
        paddedIds.push(`NAV-${String(c).padStart(3, '0')}`)
        paddedIds.push(`NAV-${c}`)
      }
    }
    const rangeCondition = {
      $or: [
        { countNumber: { $gte: from, $lte: to } },
        { participantId: { $in: paddedIds } },
      ],
    }

    if (q && !rangeMatch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orConditions: any[] = [
        { name: { $regex: q, $options: 'i' } },
        { motherName: { $regex: q, $options: 'i' } },
        { fatherName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { participantId: { $regex: q, $options: 'i' } },
      ]
      query = {
        $and: [rangeCondition, { $or: orConditions }],
      }
    } else {
      query = rangeCondition
    }
  } else if (from !== null) {
    query = { countNumber: { $gte: from } }
  } else if (to !== null) {
    query = { countNumber: { $lte: to } }
  } else if (q) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orConditions: any[] = [
      { name: { $regex: q, $options: 'i' } },
      { motherName: { $regex: q, $options: 'i' } },
      { fatherName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { address: { $regex: q, $options: 'i' } },
      { participantId: { $regex: q, $options: 'i' } },
    ]
    const cleanNum = q.replace(/^#/, '').trim()
    if (!isNaN(Number(cleanNum)) && cleanNum !== '') {
      orConditions.push({ countNumber: Number(cleanNum) })
    }
    query = { $or: orConditions }
  }

  let findQuery = Participant.find(query)
    .select('-qrTokenHash')
    .sort({ countNumber: 1, participantId: 1 })

  if (limit > 0) {
    const skip = (page - 1) * limit
    findQuery = findQuery.skip(skip).limit(limit)
  }

  const [participants, total] = await Promise.all([
    findQuery.exec(),
    Participant.countDocuments(query),
  ])

  return NextResponse.json({
    participants,
    total,
    page,
    limit: isAll ? total : limit,
    detectedRange: from !== null && to !== null ? { from, to } : null,
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।' },
        { status: 401 }
      )
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'केवल व्यवस्थापक (Admin) ही नया पंजीकरण कर सकते हैं।' },
        { status: 403 }
      )
    }

    try {
      await connectDB()
    } catch (dbErr) {
      console.error('Database connection error in POST /api/participants:', dbErr)
      return NextResponse.json(
        {
          error: 'डेटाबेस से संपर्क नहीं हो पा रहा है। कृपया वेबसाइट वाले (तकनीकी टीम) से संपर्क करें।',
          isTechnicalError: true,
        },
        { status: 503 }
      )
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'अमान्य डेटा प्रारूप प्राप्त हुआ। कृपया फॉर्म दोबारा भरकर सबमिट करें।' },
        { status: 400 }
      )
    }

    const { name, motherName, fatherName, phone, address, countNumber, category } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'कृपया बच्ची का नाम दर्ज करें।' }, { status: 400 })
    }
    if (!motherName?.trim()) {
      return NextResponse.json({ error: 'कृपया माता जी का नाम दर्ज करें।' }, { status: 400 })
    }
    if (!fatherName?.trim()) {
      return NextResponse.json({ error: 'कृपया पिता जी का नाम दर्ज करें।' }, { status: 400 })
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।' }, { status: 400 })
    }

    const cleanedPhone = phone.trim().replace(/\D/g, '')
    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9893335885)।' },
        { status: 400 }
      )
    }

    const validCategories = ['general', 'obc', 'sc', 'st']
    const selectedCategory = validCategories.includes(String(category).toLowerCase())
      ? String(category).toLowerCase()
      : 'general'

    let finalCountNumber: number
    let participantId: string

    if (countNumber !== undefined && countNumber !== null && String(countNumber).trim() !== '') {
      const parsed = Number(countNumber)
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: 'क्रमांक केवल धनात्मक संख्या (Positive Number) होना चाहिए।' },
          { status: 400 }
        )
      }

      finalCountNumber = parsed
      // 1:1 Direct mapping: NAV-{countNumber}
      participantId = `NAV-${String(finalCountNumber).padStart(3, '0')}`

      // Check if this countNumber OR participantId is already taken
      const existing = await Participant.findOne({
        $or: [
          { countNumber: finalCountNumber },
          { participantId }
        ]
      }).select('name fatherName countNumber participantId')

      if (existing) {
        return NextResponse.json(
          {
            error: `क्रमांक ${finalCountNumber} (${participantId}) पहले से '${existing.name}' (पिता: '${existing.fatherName}') के नाम पर पंजीकृत है। कृपया कोई दूसरा क्रमांक दर्ज करें, या इसे खाली छोड़ दें ताकि सिस्टम अपने आप अगला उपलब्ध क्रमांक दे सके।`,
            isTechnicalError: false,
          },
          { status: 409 }
        )
      }
    } else {
      // Auto-generate: directly map to the next available sequence number
      finalCountNumber = await getNextAvailableCountNumber()
      participantId = `NAV-${String(finalCountNumber).padStart(3, '0')}`
    }

    // Generate QR token
    const rawToken = generateQRToken()
    const qrTokenHash = hashToken(rawToken)

    const isAutoGenerated = !countNumber || String(countNumber).trim() === ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let savedParticipant: any = null
    let attempts = 0
    const maxAttempts = isAutoGenerated ? 10 : 1

    while (attempts < maxAttempts) {
      attempts++
      try {
        const participant = new Participant({
          participantId,
          countNumber: finalCountNumber,
          name: name.trim(),
          motherName: motherName.trim(),
          fatherName: fatherName.trim(),
          phone: cleanedPhone,
          address: address?.trim() || '',
          category: selectedCategory,
          qrToken: rawToken,
          qrTokenHash,
        })

        await participant.save()
        savedParticipant = participant
        break
      } catch (saveErr: any) {
        // If auto-generated and hit a duplicate key (e.g. concurrent submission), auto-increment to next free ID and retry
        if (isAutoGenerated && saveErr?.code === 11000 && attempts < maxAttempts) {
          finalCountNumber = await getNextAvailableCountNumber()
          participantId = `NAV-${String(finalCountNumber).padStart(3, '0')}`
          continue
        }
        throw saveErr
      }
    }

    return NextResponse.json(
      {
        participant: { ...savedParticipant.toObject(), _id: savedParticipant._id.toString() },
        rawToken,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error('Participant creation error:', err)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorObj = err as any

    // Handle Mongo duplicate key error (E11000)
    if (errorObj?.code === 11000) {
      const keyPattern = errorObj.keyPattern || {}
      if (keyPattern.participantId || errorObj.message?.includes('participantId')) {
        return NextResponse.json(
          {
            error: 'यह प्रतिभागी कोड (ID) पहले से पंजीकृत है। कृपया कोई दूसरा क्रमांक दर्ज करें या इसे खाली छोड़ दें।',
            isTechnicalError: false,
          },
          { status: 409 }
        )
      }
      if (keyPattern.countNumber || errorObj.message?.includes('countNumber')) {
        return NextResponse.json(
          {
            error: 'यह क्रमांक पहले से पंजीकृत है। कृपया कोई दूसरा क्रमांक दर्ज करें या इसे खाली छोड़ दें।',
            isTechnicalError: false,
          },
          { status: 409 }
        )
      }
      if (keyPattern.qrTokenHash) {
        return NextResponse.json(
          {
            error: 'QR कोड जनरेशन में टकराव हुआ। कृपया एक बार फिर सबमिट करें।',
            isTechnicalError: false,
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: 'यह विवरण पहले से डेटाबेस में मौजूद है। कृपया दूसरा क्रमांक चुनें।',
          isTechnicalError: true,
        },
        { status: 409 }
      )
    }

    // Handle Mongoose Validation Error
    if (errorObj?.name === 'ValidationError') {
      const messages = Object.values(errorObj.errors || {})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => e.message)
        .join(', ')
      return NextResponse.json(
        {
          error: `डेटा सत्यापन में त्रुटि: ${messages || 'कृपया सभी फ़ील्ड्स सही भरें।'}`,
          isTechnicalError: false,
        },
        { status: 400 }
      )
    }

    // Default Fallback
    return NextResponse.json(
      {
        error: 'सर्वर पर अप्रत्याशित समस्या आई है। कृपया वेबसाइट वाले (डेवलपर) से संपर्क करें।',
        details: errorObj?.message || 'Internal Server Error',
        isTechnicalError: true,
      },
      { status: 500 }
    )
  }
}
