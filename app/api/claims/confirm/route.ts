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
  const { participantId, itemType = 'entry' } = body
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
    if (itemType === 'entry') {
      const existing = await Claim.findOne({
        participantId: participant._id,
        distributionDate: todayDate,
      })

      if (existing && existing.entryTime) {
        return NextResponse.json({
          error: 'ALREADY_ENTERED',
          message: 'इस प्रतिभागी का प्रवेश पहले ही दर्ज हो चुका है।',
        }, { status: 409 })
      }

      const claim = await Claim.findOneAndUpdate(
        {
          participantId: participant._id,
          distributionDate: todayDate,
        },
        {
          $set: {
            entryTime: claimedAt,
            claimedAt,
            claimedByStaffId: staffObjectId,
            navratriDay: day,
          },
          $setOnInsert: {
            participantId: participant._id,
            distributionDate: todayDate,
            giftClaimed: false,
            foodClaimed: false,
          },
        },
        { upsert: true, new: true }
      )

      return NextResponse.json({
        success: true,
        message: 'प्रवेश (Entry) सफलतापूर्वक दर्ज किया गया।',
        claim: {
          participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
          navratriDay: day,
          distributionDate: todayDate,
          itemType: 'entry',
          itemLabel: 'प्रवेश (Entry In)',
          entryTime: toISTString(claimedAt),
          claimedAt: toISTString(claimedAt),
        },
      }, { status: 201 })
    }

    if (itemType === 'food') {
      const updatedClaim = await Claim.findOneAndUpdate(
        {
          participantId: participant._id,
          distributionDate: todayDate,
          entryTime: { $exists: true, $ne: null },
          foodClaimed: false,
        },
        {
          $set: {
            foodClaimed: true,
            foodClaimedAt: claimedAt,
            foodStaffId: staffObjectId,
          },
        },
        { new: true }
      )

      if (!updatedClaim) {
        const existing = await Claim.findOne({
          participantId: participant._id,
          distributionDate: todayDate,
        })

        if (!existing || !existing.entryTime) {
          return NextResponse.json({
            error: 'ENTRY_REQUIRED',
            message: 'कृपया पहले प्रवेश (Entry) दर्ज करें। बिना प्रवेश के उपहार या भोजन नहीं दिया जा सकता।',
          }, { status: 400 })
        }

        if (existing.foodClaimed) {
          const diff = existing.foodClaimedAt ? Date.now() - new Date(existing.foodClaimedAt).getTime() : 999999
          if (diff < 15000) {
            return NextResponse.json({
              success: true,
              message: 'भोजन पैकेट सफलतापूर्वक वितरित किया गया।',
              claim: {
                participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
                navratriDay: day,
                distributionDate: todayDate,
                itemType: 'food',
                itemLabel: 'भोजन पैकेट',
                foodClaimed: true,
                foodClaimedAt: toISTString(existing.foodClaimedAt!),
                claimedAt: toISTString(existing.foodClaimedAt!),
              },
            }, { status: 200 })
          }

          return NextResponse.json({
            error: 'ALREADY_CLAIMED',
            message: 'भोजन पैकेट पहले ही दिया जा चुका है।',
          }, { status: 409 })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'भोजन पैकेट सफलतापूर्वक वितरित किया गया।',
        claim: {
          participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
          navratriDay: day,
          distributionDate: todayDate,
          itemType: 'food',
          itemLabel: 'भोजन पैकेट',
          foodClaimed: true,
          foodClaimedAt: toISTString(claimedAt),
          claimedAt: toISTString(claimedAt),
        },
      }, { status: 201 })
    }

    return NextResponse.json({
      error: 'INVALID_ITEM_TYPE',
      message: 'अमान्य प्रक्रिया (केवल प्रवेश या भोजन मान्य है)।',
    }, { status: 400 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({
        error: 'ALREADY_CLAIMED',
        message: 'इस प्रतिभागी की यह प्रविष्टि पहले ही दर्ज हो चुकी है।',
      }, { status: 409 })
    }
    console.error('Claim confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
