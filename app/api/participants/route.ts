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
  const q = req.nextUrl.searchParams.get('q') || ''
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
  const limitParam = req.nextUrl.searchParams.get('limit')
  const isAll = limitParam === 'all' || limitParam === '0'
  const limit = isAll ? 0 : parseInt(limitParam || '500')

  let query = {}
  if (q) {
    query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { motherName: { $regex: q, $options: 'i' } },
        { fatherName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { participantId: { $regex: q, $options: 'i' } },
      ],
    }
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

  return NextResponse.json({ participants, total, page, limit: isAll ? total : limit })
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
