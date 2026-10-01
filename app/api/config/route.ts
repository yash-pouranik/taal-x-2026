import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import EventConfig from '@/models/EventConfig'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const config = await EventConfig.findOne()
  return NextResponse.json({ config })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const body = await req.json()
  const { startDate, endDate, entryStartTime, entryEndTime, exitStartTime, exitEndTime } = body

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

  if (startDate > endDate) {
    return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 })
  }

  const config = await EventConfig.findOneAndUpdate(
    {},
    {
      startDate,
      endDate,
      timezone: 'Asia/Kolkata',
      entryStartTime: entryStartTime || '19:00',
      entryEndTime: entryEndTime || '21:30',
      exitStartTime: exitStartTime || '22:00',
      exitEndTime: exitEndTime || '00:30',
      updatedByAdminId: session.user.id,
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ config })
}
