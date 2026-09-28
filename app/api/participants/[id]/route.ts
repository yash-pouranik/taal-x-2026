import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import Claim from '@/models/Claim'
import EventConfig from '@/models/EventConfig'

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
    .sort({ distributionDate: 1 })

  // Build 9-day grid if config exists
  const config = await EventConfig.findOne()
  const dayGrid: { day: number; date: string; claimed: boolean; claimInfo?: object }[] = []
  if (config) {
    for (let i = 0; i < 9; i++) {
      const d = new Date(config.startDate)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const claim = claims.find(c => c.distributionDate === dateStr)
      dayGrid.push({
        day: i + 1,
        date: dateStr,
        claimed: !!claim,
        claimInfo: claim ? claim.toObject() : undefined,
      })
    }
  }

  return NextResponse.json({ participant, claims, dayGrid })
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
