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
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  let query = {}
  if (q) {
    query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { fatherName: { $regex: q, $options: 'i' } },
        { participantId: { $regex: q, $options: 'i' } },
      ],
    }
  }

  const [participants, total] = await Promise.all([
    Participant.find(query).select('-qrTokenHash').sort({ participantId: 1 }).skip(skip).limit(limit),
    Participant.countDocuments(query),
  ])

  return NextResponse.json({ participants, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const body = await req.json()
  const { name, fatherName } = body

  if (!name?.trim() || !fatherName?.trim()) {
    return NextResponse.json({ error: 'Name and father name are required' }, { status: 400 })
  }

  // Generate sequential participant ID
  const count = await Participant.countDocuments()
  const participantId = `NAV-${String(count + 1).padStart(3, '0')}`

  // Generate QR token
  const rawToken = generateQRToken()
  const qrTokenHash = hashToken(rawToken)

  const participant = new Participant({
    participantId,
    name: name.trim(),
    fatherName: fatherName.trim(),
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
