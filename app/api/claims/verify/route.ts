import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import Claim from '@/models/Claim'
import EventConfig from '@/models/EventConfig'
import { hashToken } from '@/lib/qr'
import { isDistributionActive } from '@/lib/dateUtils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const body = await req.json()
  const { token } = body

  if (!token || typeof token !== 'string' || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
  }

  // Step 1: Hash and look up
  const tokenHash = hashToken(token)
  const participant = await Participant.findOne({ qrTokenHash: tokenHash })

  if (!participant) {
    return NextResponse.json({
      valid: false,
      error: 'INVALID_QR',
      message: 'This QR code is not registered in the system.',
    }, { status: 404 })
  }

  // Check if registration was cancelled
  if (participant.status === 'cancelled') {
    return NextResponse.json({
      valid: false,
      error: 'CANCELLED',
      message: 'This participant registration has been cancelled. Prop cannot be issued.',
      participant: {
        name: participant.name,
        fatherName: participant.fatherName,
        participantId: participant.participantId,
      },
    }, { status: 403 })
  }

  // Step 2: Check distribution window (server-side IST — never trust client)
  const config = await EventConfig.findOne()
  const status = isDistributionActive(config)

  if (!status.active) {
    const messages: Record<string, string> = {
      NOT_STARTED: 'Distribution has not started yet.',
      ENDED: 'Distribution has ended.',
      NO_CONFIG: 'Event dates are not configured. Please contact the administrator.',
    }
    return NextResponse.json({
      valid: false,
      error: status.reason,
      message: messages[status.reason] || 'Distribution is not active.',
      participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
    }, { status: 400 })
  }

  // Step 3: Check existing claim
  const { day, todayDate } = status
  const existingClaim = await Claim.findOne({
    participantId: participant._id,
    distributionDate: todayDate,
  }).populate('claimedByStaffId', 'name')

  if (existingClaim) {
    return NextResponse.json({
      valid: false,
      error: 'ALREADY_CLAIMED',
      message: 'This participant has already collected today\'s prop.',
      participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
      claim: {
        navratriDay: existingClaim.navratriDay,
        claimedAt: existingClaim.claimedAt,
        claimedBy: (existingClaim.claimedByStaffId as { name?: string })?.name,
      },
    }, { status: 409 })
  }

  // Step 4: Return verification info (claim NOT created yet)
  return NextResponse.json({
    valid: true,
    participant: {
      _id: participant._id.toString(),
      name: participant.name,
      fatherName: participant.fatherName,
      participantId: participant.participantId,
    },
    navratriDay: day,
    distributionDate: todayDate,
    alreadyClaimed: false,
  })
}
