import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import Claim from '@/models/Claim'
import EventConfig from '@/models/EventConfig'
import { isDistributionActive, toISTString } from '@/lib/dateUtils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const body = await req.json()
  const { participantId } = body
  // NOTE: we do NOT use client-provided distributionDate — server determines it

  if (!participantId) {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
  }

  const participant = await Participant.findById(participantId)
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  if (participant.status === 'cancelled') {
    return NextResponse.json({
      error: 'CANCELLED',
      message: 'This registration has been cancelled. Cannot distribute prop.',
    }, { status: 403 })
  }

  // Re-validate distribution window server-side (critical — client date is never trusted)
  const config = await EventConfig.findOne()
  const status = isDistributionActive(config)

  if (!status.active) {
    const messages: Record<string, string> = {
      NOT_STARTED: 'Distribution has not started yet.',
      ENDED: 'Distribution has ended.',
      NO_CONFIG: 'Event dates are not configured.',
    }
    return NextResponse.json({
      error: status.reason,
      message: messages[status.reason],
    }, { status: 400 })
  }

  const { day, todayDate } = status
  const claimedAt = new Date()

  try {
    const claim = new Claim({
      participantId: participant._id,
      distributionDate: todayDate,
      navratriDay: day,
      claimedAt,
      claimedByStaffId: session.user.id,
    })
    await claim.save()

    return NextResponse.json({
      success: true,
      message: 'Prop distributed successfully.',
      claim: {
        participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
        navratriDay: day,
        distributionDate: todayDate,
        claimedAt: toISTString(claimedAt),
      },
    }, { status: 201 })
  } catch (err: unknown) {
    // MongoDB duplicate key error — concurrent request already claimed
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({
        error: 'ALREADY_CLAIMED',
        message: 'This participant has already collected today\'s prop.',
      }, { status: 409 })
    }
    console.error('Claim confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
