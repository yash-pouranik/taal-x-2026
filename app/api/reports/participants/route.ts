import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const participants = await Participant.find().sort({ participantId: 1 })

  const rows = [
    ['Participant ID', 'Name', 'Father Name', 'Registration Date'],
    ...participants.map(p => [
      p.participantId,
      p.name,
      p.fatherName,
      new Date(p.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ]),
  ]

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="participants.csv"',
    },
  })
}
