import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import Participant from '@/models/Participant'
import EventConfig from '@/models/EventConfig'
import { getTodayIST, getEventTotalDays } from '@/lib/dateUtils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const config = await EventConfig.findOne()
  const todayIST = getTodayIST()

  // Generate dynamic event days list
  let availableDates: { day: number; date: string; isToday: boolean }[] = []
  let defaultDate = todayIST

  if (config) {
    const totalDays = getEventTotalDays(config)
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(config.startDate + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      availableDates.push({
        day: i + 1,
        date: dateStr,
        isToday: dateStr === todayIST,
      })
    }

    // If today is within event, use today, otherwise use Day 1 if available
    const hasToday = availableDates.some(ad => ad.date === todayIST)
    if (!hasToday && availableDates.length > 0) {
      defaultDate = availableDates[0].date
    }
  }

  const selectedDate = req.nextUrl.searchParams.get('date') || defaultDate
  const currentDayInfo = availableDates.find(d => d.date === selectedDate)
  const selectedDay = currentDayInfo ? currentDayInfo.day : 1

  // Fetch active participants count
  const totalParticipants = await Participant.countDocuments({ status: { $ne: 'cancelled' } })

  // Fetch claims for selectedDate
  const claims = await Claim.find({ distributionDate: selectedDate })
    .populate('participantId', 'name fatherName participantId status')
    .populate('claimedByStaffId', 'name')
    .populate('giftStaffId', 'name')
    .populate('foodStaffId', 'name')
    .sort({ claimedAt: -1 })

  let giftDistributed = 0
  let foodDistributed = 0
  let currentlyInside = 0
  let exitedCount = 0

  const scans = claims.map(c => {
    const p = c.participantId as unknown as {
      _id: string
      name: string
      fatherName: string
      participantId: string
      status: string
    } | null

    const isGift = !!c.giftClaimed
    const isFood = !!c.foodClaimed
    const hasEntered = !!c.entryTime
    const hasExited = !!c.exitTime
    const isInside = hasEntered && !hasExited

    if (isGift) giftDistributed++
    if (isFood) foodDistributed++
    if (isInside) currentlyInside++
    if (hasExited) exitedCount++

    const fallbackStaff = (c.claimedByStaffId as unknown as { name?: string })?.name || 'Staff'
    const giftStaff = (c.giftStaffId as unknown as { name?: string })?.name || fallbackStaff
    const foodStaff = (c.foodStaffId as unknown as { name?: string })?.name || fallbackStaff

    // Calculate time duration
    let timeSpent = ''
    if (hasEntered) {
      const now = new Date()
      const end = hasExited ? c.exitTime : now
      const startMs = new Date(c.entryTime!).getTime()
      const endMs = new Date(end!).getTime()
      const diffMins = Math.max(0, Math.floor((endMs - startMs) / 60000))
      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60

      if (hours === 0) {
        timeSpent = `${mins} मिनट`
      } else if (mins === 0) {
        timeSpent = `${hours} घंटे`
      } else {
        timeSpent = `${hours} घंटे ${mins} मिनट`
      }
    }

    return {
      _id: c._id.toString(),
      participant: p ? {
        id: p._id?.toString(),
        participantId: p.participantId,
        name: p.name,
        fatherName: p.fatherName,
        status: p.status,
      } : {
        participantId: 'UNKNOWN',
        name: 'हटाया गया प्रतिभागी',
        fatherName: '-',
        status: 'cancelled',
      },
      navratriDay: c.navratriDay,
      distributionDate: c.distributionDate,
      hasEntered,
      hasExited,
      isInside,
      entryTime: c.entryTime,
      exitTime: c.exitTime,
      timeSpent,
      giftClaimed: isGift,
      giftClaimedAt: c.giftClaimedAt || (isGift ? c.claimedAt : undefined),
      giftStaffName: isGift ? giftStaff : undefined,
      foodClaimed: isFood,
      foodClaimedAt: c.foodClaimedAt,
      foodStaffName: isFood ? foodStaff : undefined,
      claimedAt: c.claimedAt,
    }
  })

  const turnout = claims.length
  const pendingTurnout = Math.max(0, totalParticipants - turnout)
  const pendingGift = Math.max(0, totalParticipants - giftDistributed)
  const pendingFood = Math.max(0, totalParticipants - foodDistributed)

  return NextResponse.json({
    selectedDate,
    selectedDay,
    availableDates,
    config: config ? {
      startDate: config.startDate,
      endDate: config.endDate,
      entryStartTime: config.entryStartTime || '19:00',
      entryEndTime: config.entryEndTime || '21:30',
      exitStartTime: config.exitStartTime || '22:00',
      exitEndTime: config.exitEndTime || '00:30',
    } : null,
    summary: {
      totalParticipants,
      turnout,
      currentlyInside,
      exitedCount,
      giftDistributed,
      foodDistributed,
      pendingTurnout,
      pendingGift,
      pendingFood,
    },
    scans,
  })
}
