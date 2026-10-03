import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import { generateQRToken, hashToken } from '@/lib/qr'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
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
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const body = await req.json()
  const { name, motherName, fatherName, phone, address, countNumber, category } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'बच्ची का नाम आवश्यक है (Name is required)' }, { status: 400 })
  }
  if (!motherName?.trim()) {
    return NextResponse.json({ error: 'माता जी का नाम आवश्यक है (Mother name is required)' }, { status: 400 })
  }
  if (!fatherName?.trim()) {
    return NextResponse.json({ error: 'पिता जी का नाम आवश्यक है (Father name is required)' }, { status: 400 })
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'फोन नंबर आवश्यक है (Phone number is required)' }, { status: 400 })
  }

  const validCategories = ['general', 'obc', 'sc', 'st']
  const selectedCategory = validCategories.includes(String(category).toLowerCase())
    ? String(category).toLowerCase()
    : 'general'

  // Generate sequential participant ID and countNumber
  const count = await Participant.countDocuments()
  const participantId = `NAV-${String(count + 1).padStart(3, '0')}`
  const finalCountNumber = countNumber !== undefined && countNumber !== null && String(countNumber).trim() !== ''
    ? Number(countNumber)
    : count + 1

  // Generate QR token
  const rawToken = generateQRToken()
  const qrTokenHash = hashToken(rawToken)

  const participant = new Participant({
    participantId,
    countNumber: isNaN(finalCountNumber) ? count + 1 : finalCountNumber,
    name: name.trim(),
    motherName: motherName.trim(),
    fatherName: fatherName.trim(),
    phone: phone.trim(),
    address: address?.trim() || '',
    category: selectedCategory,
    qrToken: rawToken,
    qrTokenHash,
  })

  await participant.save()

  // Return rawToken only here — it is NEVER stored, only the hash is
  return NextResponse.json({
    participant: { ...participant.toObject(), _id: participant._id.toString() },
    rawToken, // Admin uses this to generate/print the QR
  }, { status: 201 })
}
