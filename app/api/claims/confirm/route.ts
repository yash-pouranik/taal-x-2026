import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Types } from 'mongoose'
import Participant from '@/models/Participant'
import Claim from '@/models/Claim'
import EventConfig from '@/models/EventConfig'
import { isDistributionActive, toISTString } from '@/lib/dateUtils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const body = await req.json()
  const { participantId, itemType = 'both' } = body
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
      message: 'This registration has been cancelled. Cannot distribute item.',
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
  const staffObjectId = new Types.ObjectId(session.user.id)

  try {
    let claim = await Claim.findOne({
      participantId: participant._id,
      distributionDate: todayDate,
    })

    if (claim) {
      // Existing claim: update specific item(s)
      if (itemType === 'gift') {
        if (claim.giftClaimed) {
          return NextResponse.json({
            error: 'ALREADY_CLAIMED',
            message: 'Gift / Prop has already been claimed for today.',
          }, { status: 409 })
        }
        claim.giftClaimed = true
        claim.giftClaimedAt = claimedAt
        claim.giftStaffId = staffObjectId
      } else if (itemType === 'food') {
        if (claim.foodClaimed) {
          return NextResponse.json({
            error: 'ALREADY_CLAIMED',
            message: 'Food Packet has already been claimed for today.',
          }, { status: 409 })
        }
        claim.foodClaimed = true
        claim.foodClaimedAt = claimedAt
        claim.foodStaffId = staffObjectId
      } else {
        // 'both'
        if (claim.giftClaimed && claim.foodClaimed) {
          return NextResponse.json({
            error: 'ALREADY_CLAIMED',
            message: 'Both Gift and Food Packet have already been claimed for today.',
          }, { status: 409 })
        }
        if (!claim.giftClaimed) {
          claim.giftClaimed = true
          claim.giftClaimedAt = claimedAt
          claim.giftStaffId = staffObjectId
        }
        if (!claim.foodClaimed) {
          claim.foodClaimed = true
          claim.foodClaimedAt = claimedAt
          claim.foodStaffId = staffObjectId
        }
      }

      await claim.save()
    } else {
      // New claim
      const claimGift = itemType === 'gift' || itemType === 'both'
      const claimFood = itemType === 'food' || itemType === 'both'

      claim = new Claim({
        participantId: participant._id,
        distributionDate: todayDate,
        navratriDay: day,
        claimedAt,
        claimedByStaffId: staffObjectId,
        giftClaimed: claimGift,
        giftClaimedAt: claimGift ? claimedAt : undefined,
        giftStaffId: claimGift ? staffObjectId : undefined,
        foodClaimed: claimFood,
        foodClaimedAt: claimFood ? claimedAt : undefined,
        foodStaffId: claimFood ? staffObjectId : undefined,
      })
      await claim.save()
    }

    const itemLabel = itemType === 'both' ? 'Gift & Food Packet' : itemType === 'gift' ? 'Gift / Prop' : 'Food Packet'

    return NextResponse.json({
      success: true,
      message: `${itemLabel} distributed successfully.`,
      claim: {
        participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
        navratriDay: day,
        distributionDate: todayDate,
        giftClaimed: claim.giftClaimed,
        giftClaimedAt: claim.giftClaimedAt ? toISTString(claim.giftClaimedAt) : undefined,
        foodClaimed: claim.foodClaimed,
        foodClaimedAt: claim.foodClaimedAt ? toISTString(claim.foodClaimedAt) : undefined,
        claimedAt: toISTString(claimedAt),
      },
    }, { status: 201 })
  } catch (err: unknown) {
    // MongoDB duplicate key error — concurrent request
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({
        error: 'ALREADY_CLAIMED',
        message: 'This participant has already been marked for today.',
      }, { status: 409 })
    }
    console.error('Claim confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
