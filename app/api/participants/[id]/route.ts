import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import Claim from '@/models/Claim'
import EventConfig from '@/models/EventConfig'
import { formatDurationHindi } from '@/lib/dateUtils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const participant = await Participant.findById(params.id).select('-qrTokenHash')
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  const claims = await Claim.find({ participantId: participant._id })
    .populate('claimedByStaffId', 'name email')
    .populate('giftStaffId', 'name email')
    .populate('foodStaffId', 'name email')
    .sort({ distributionDate: 1 })

  // Build 9-day grid if config exists
  const config = await EventConfig.findOne()
  let dayGrid: {
    day: number
    date: string
    claimed: boolean
    entryWindow: { start: string; end: string }
    exitWindow: { start: string; end: string }
    entryTime?: Date
    exitTime?: Date
    hasEntered: boolean
    hasExited: boolean
    isCurrentlyInside: boolean
    durationSpent?: string
    gift: { claimed: boolean; claimedAt?: Date; staffName?: string }
    food: { claimed: boolean; claimedAt?: Date; staffName?: string }
    claimInfo?: object
  }[] = []

  if (config) {
    for (let i = 0; i < 9; i++) {
      const d = new Date(config.startDate)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const claim = claims.find(c => c.distributionDate === dateStr)
      const giftClaimed = claim ? (claim.giftClaimed ?? true) : false
      const foodClaimed = claim ? (claim.foodClaimed ?? false) : false
      const giftStaff = (claim?.giftStaffId as { name?: string })?.name || (claim?.claimedByStaffId as { name?: string })?.name
      const foodStaff = (claim?.foodStaffId as { name?: string })?.name

      const hasEntered = !!claim?.entryTime
      const hasExited = !!claim?.exitTime

      dayGrid.push({
        day: i + 1,
        date: dateStr,
        claimed: !!claim,
        entryTime: claim?.entryTime,
        exitTime: claim?.exitTime,
        hasEntered,
        hasExited,
        isCurrentlyInside: hasEntered && !hasExited,
        durationSpent: claim?.entryTime ? formatDurationHindi(claim.entryTime, claim?.exitTime) : undefined,
        entryWindow: {
          start: config.entryStartTime || '19:00',
          end: config.entryEndTime || '21:30',
        },
        exitWindow: {
          start: config.exitStartTime || '22:00',
          end: config.exitEndTime || '00:30',
        },
        gift: {
          claimed: giftClaimed,
          claimedAt: claim?.giftClaimedAt || (giftClaimed ? claim?.claimedAt : undefined),
          staffName: giftClaimed ? giftStaff : undefined,
        },
        food: {
          claimed: foodClaimed,
          claimedAt: claim?.foodClaimedAt,
          staffName: foodClaimed ? foodStaff : undefined,
        },
        claimInfo: claim ? claim.toObject() : undefined,
      })
    }
  }

  return NextResponse.json({ participant, claims, dayGrid, config })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const participant = await Participant.findByIdAndUpdate(
    params.id,
    { name: name.trim(), fatherName: fatherName.trim() },
    { new: true }
  ).select('-qrTokenHash')

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json({ participant })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const body = await req.json()
  const { status } = body

  if (!status || !['active', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Status must be active or cancelled' }, { status: 400 })
  }

  const updateData: { status: string; cancelledAt?: Date | null } = {
    status,
    cancelledAt: status === 'cancelled' ? new Date() : null,
  }

  const participant = await Participant.findByIdAndUpdate(
    params.id,
    updateData,
    { new: true }
  ).select('-qrTokenHash')

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  return NextResponse.json({ participant })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const participant = await Participant.findByIdAndDelete(params.id)
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  // Also clean up any associated claims
  await Claim.deleteMany({ participantId: params.id })

  return NextResponse.json({ success: true, message: 'Participant and claims deleted' })
}
