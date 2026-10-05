import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import { generateQRToken, hashToken } from '@/lib/qr'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const participants = await Participant.find({ status: { $ne: 'cancelled' } })
    .sort({ countNumber: 1, participantId: 1 })
    .lean()

  // Prepare bulk updates only for participants missing a qrToken
  const bulkOps: any[] = []
  const updatedParticipants = participants.map((p) => {
    let rawToken = p.qrToken
    if (!rawToken) {
      rawToken = generateQRToken()
      const qrTokenHash = hashToken(rawToken)
      bulkOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { qrToken: rawToken, qrTokenHash } },
        },
      })
    }
    return {
      _id: p._id.toString(),
      participantId: p.participantId,
      countNumber: p.countNumber,
      name: p.name,
      motherName: p.motherName,
      fatherName: p.fatherName,
      phone: p.phone,
      address: p.address,
      category: p.category,
      qrToken: rawToken,
    }
  })

  if (bulkOps.length > 0) {
    await Participant.bulkWrite(bulkOps)
  }

  return NextResponse.json({ participants: updatedParticipants })
}
