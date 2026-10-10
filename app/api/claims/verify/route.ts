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
    return NextResponse.json({
      valid: false,
      error: 'INVALID_QR_FORMAT',
      message: 'यह डांडिया पास का मान्य QR कोड नहीं है। कृपया सही पास स्कैन करें।',
    }, { status: 400 })
  }

  // Step 1: Hash and look up
  const tokenHash = hashToken(token)
  const participant = await Participant.findOne({ qrTokenHash: tokenHash })

  if (!participant) {
    return NextResponse.json({
      valid: false,
      error: 'INVALID_QR',
      message: 'यह QR कोड सिस्टम में पंजीकृत नहीं है।',
    }, { status: 404 })
  }

  // Check if registration was cancelled
  if (participant.status === 'cancelled') {
    return NextResponse.json({
      valid: false,
      error: 'CANCELLED',
      message: 'इस प्रतिभागी का पास निरस्त (Cancelled) किया जा चुका है। सामग्री वितरण संभव नहीं है।',
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
      NOT_STARTED: 'वितरण अभी प्रारंभ नहीं हुआ है।',
      ENDED: 'वितरण की अवधि समाप्त हो चुकी है।',
      NO_CONFIG: 'कार्यक्रम की तिथियां सेट नहीं हैं। कृपया एडमिन से संपर्क करें।',
    }
    return NextResponse.json({
      valid: false,
      error: status.reason,
      message: messages[status.reason] || 'वितरण अभी सक्रिय नहीं है।',
      participant: { name: participant.name, fatherName: participant.fatherName, participantId: participant.participantId },
    }, { status: 400 })
  }

  // Step 3: Check existing claim
  const { day, todayDate } = status
  const existingClaim = await Claim.findOne({
    participantId: participant._id,
    distributionDate: todayDate,
  })
    .populate('claimedByStaffId', 'name')
    .populate('foodStaffId', 'name')

  const hasEntered = !!(existingClaim?.entryTime)
  const isFoodClaimed = existingClaim ? !!existingClaim.foodClaimed : false

  // If already entered and food is claimed, both stages are completed!
  if (existingClaim && hasEntered && isFoodClaimed) {
    return NextResponse.json({
      valid: false,
      error: 'ALL_COMPLETED',
      message: 'इस प्रतिभागी की आज की दोनों प्रक्रियाएं (प्रवेश एवं भोजन) पूर्ण हो चुकी हैं ✅',
      participant: {
        name: participant.name,
        fatherName: participant.fatherName,
        participantId: participant.participantId,
      },
      claim: {
        navratriDay: existingClaim.navratriDay,
        entryTime: existingClaim.entryTime,
        foodClaimed: true,
        foodClaimedAt: existingClaim.foodClaimedAt,
        foodStaffName: (existingClaim.foodStaffId as { name?: string })?.name,
      },
    }, { status: 409 })
  }

  // Step 4: Return verification info
  // Stage 1: Entry
  const canMarkEntry = !hasEntered
  // Stage 2: Food (allowed only after entry!)
  const canClaimFood = hasEntered && !isFoodClaimed

  return NextResponse.json({
    valid: true,
    participant: {
      _id: participant._id.toString(),
      participantId: participant.participantId,
      countNumber: participant.countNumber,
      name: participant.name,
      motherName: participant.motherName,
      fatherName: participant.fatherName,
      phone: participant.phone,
      address: participant.address,
      category: participant.category,
    },
    navratriDay: day,
    distributionDate: todayDate,
    hasEntered,
    canMarkEntry,
    canClaimFood,
    entryTime: existingClaim?.entryTime,
    claim: existingClaim ? {
      entryTime: existingClaim.entryTime,
      foodClaimed: isFoodClaimed,
      foodClaimedAt: existingClaim.foodClaimedAt,
      foodStaffName: (existingClaim.foodStaffId as { name?: string })?.name,
    } : null,
  })
}

