import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import Participant from '@/models/Participant'
import EventConfig from '@/models/EventConfig'
import { getCurrentIndiaDate } from '@/lib/dateUtils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const todayDate = getCurrentIndiaDate()
  const config = await EventConfig.findOne()
  const totalParticipants = await Participant.countDocuments()

  const todayClaims = await Claim.countDocuments({ distributionDate: todayDate })

  // Per-day breakdown
  const perDay: { day: number; date: string; collected: number }[] = []
  if (config) {
    for (let i = 0; i < 9; i++) {
      const d = new Date(config.startDate + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const count = await Claim.countDocuments({ distributionDate: dateStr })
      perDay.push({ day: i + 1, date: dateStr, collected: count })
    }
  }

  return NextResponse.json({
    todayDate,
    totalParticipants,
    todayCollected: todayClaims,
    todayPending: totalParticipants - todayClaims,
    collectionRate: totalParticipants > 0 ? ((todayClaims / totalParticipants) * 100).toFixed(1) : '0.0',
    perDay,
    config,
  })
}
