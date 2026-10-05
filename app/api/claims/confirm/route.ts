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

    if (itemType === 'exit') {
      const updatedClaim = await Claim.findOneAndUpdate(
        {
          participantId: participant._id,
          distributionDate: todayDate,
          entryTime: { $exists: true, $ne: null },
          $or: [{ exitTime: { $exists: false } }, { exitTime: null }],
        },
        {
          $set: { exitTime: claimedAt },
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
            message: 'प्रस्थान दर्ज करने से पहले प्रवेश दर्ज होना आवश्यक है।',
          }, { status: 400 })
        }

        if (existing.exitTime) {
          const diff = Date.now() - new Date(existing.exitTime).getTime()
          if (diff < 15000) {
            return NextResponse.json({
              success: true,
              message: 'प्रस्थान (Exit) सफलतापूर्वक दर्ज किया गया।',
              claim: {
                participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
                navratriDay: day,
                distributionDate: todayDate,
                itemType: 'exit',
                itemLabel: 'प्रस्थान (Exit Out)',
                exitTime: toISTString(existing.exitTime),
                claimedAt: toISTString(existing.exitTime),
              },
            }, { status: 200 })
          }

          return NextResponse.json({
            error: 'ALREADY_EXITED',
            message: 'इस प्रतिभागी का प्रस्थान पहले ही दर्ज हो चुका है।',
          }, { status: 409 })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'प्रस्थान (Exit) सफलतापूर्वक दर्ज किया गया।',
        claim: {
          participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
          navratriDay: day,
          distributionDate: todayDate,
          itemType: 'exit',
          itemLabel: 'प्रस्थान (Exit Out)',
          exitTime: toISTString(claimedAt),
          claimedAt: toISTString(claimedAt),
        },
      }, { status: 200 })
    }

    // Gift, Food or Both require entry to have been done first!
    if (itemType === 'gift') {
      const updatedClaim = await Claim.findOneAndUpdate(
        {
          participantId: participant._id,
          distributionDate: todayDate,
          entryTime: { $exists: true, $ne: null },
          giftClaimed: false,
        },
        {
          $set: {
            giftClaimed: true,
            giftClaimedAt: claimedAt,
            giftStaffId: staffObjectId,
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

        if (existing.giftClaimed) {
          const diff = existing.giftClaimedAt ? Date.now() - new Date(existing.giftClaimedAt).getTime() : 999999
          if (diff < 15000) {
            return NextResponse.json({
              success: true,
              message: 'उपहार / प्रॉप सफलतापूर्वक वितरित किया गया।',
              claim: {
                participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
                navratriDay: day,
                distributionDate: todayDate,
                itemType: 'gift',
                itemLabel: 'उपहार / प्रॉप',
                giftClaimed: true,
                giftClaimedAt: toISTString(existing.giftClaimedAt!),
                claimedAt: toISTString(existing.giftClaimedAt!),
              },
            }, { status: 200 })
          }

          return NextResponse.json({
            error: 'ALREADY_CLAIMED',
            message: 'उपहार / प्रॉप पहले ही दिया जा चुका है।',
          }, { status: 409 })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'उपहार / प्रॉप सफलतापूर्वक वितरित किया गया।',
        claim: {
          participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
          navratriDay: day,
          distributionDate: todayDate,
          itemType: 'gift',
          itemLabel: 'उपहार / प्रॉप',
          giftClaimed: true,
          giftClaimedAt: toISTString(claimedAt),
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

    // Default: 'both'
    const updatedClaim = await Claim.findOneAndUpdate(
      {
        participantId: participant._id,
        distributionDate: todayDate,
        entryTime: { $exists: true, $ne: null },
        $or: [{ giftClaimed: false }, { foodClaimed: false }],
      },
      {
        $set: {
          giftClaimed: true,
          giftClaimedAt: claimedAt,
          giftStaffId: staffObjectId,
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

      if (existing.giftClaimed && existing.foodClaimed) {
        const diff = existing.giftClaimedAt ? Date.now() - new Date(existing.giftClaimedAt).getTime() : 999999
        if (diff < 15000) {
          return NextResponse.json({
            success: true,
            message: 'उपहार व भोजन पैकेट सफलतापूर्वक वितरित किया गया।',
            claim: {
              participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
              navratriDay: day,
              distributionDate: todayDate,
              itemType: 'both',
              itemLabel: 'उपहार व भोजन पैकेट',
              giftClaimed: true,
              giftClaimedAt: toISTString(existing.giftClaimedAt!),
              foodClaimed: true,
              foodClaimedAt: toISTString(existing.foodClaimedAt!),
              claimedAt: toISTString(existing.giftClaimedAt!),
            },
          }, { status: 200 })
        }

        return NextResponse.json({
          error: 'ALREADY_CLAIMED',
          message: 'उपहार और भोजन पैकेट दोनों पहले ही दिए जा चुके हैं।',
        }, { status: 409 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'उपहार व भोजन पैकेट सफलतापूर्वक वितरित किया गया।',
      claim: {
        participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
        navratriDay: day,
        distributionDate: todayDate,
        itemType: 'both',
        itemLabel: 'उपहार व भोजन पैकेट',
        giftClaimed: true,
        giftClaimedAt: toISTString(claimedAt),
        foodClaimed: true,
        foodClaimedAt: toISTString(claimedAt),
        claimedAt: toISTString(claimedAt),
      },
    }, { status: 201 })
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
