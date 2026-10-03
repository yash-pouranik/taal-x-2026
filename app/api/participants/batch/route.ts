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

  const participants = await Participant.find({ status: { $ne: 'cancelled' } }).sort({ countNumber: 1, participantId: 1 })

  // Ensure all participants have a qrToken populated for printing
  const updatedParticipants = await Promise.all(
    participants.map(async (p) => {
      if (!p.qrToken) {
        const rawToken = generateQRToken()
        p.qrToken = rawToken
        p.qrTokenHash = hashToken(rawToken)
        await p.save()
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
        qrToken: p.qrToken,
      }
    })
  )

  return NextResponse.json({ participants: updatedParticipants })
}
