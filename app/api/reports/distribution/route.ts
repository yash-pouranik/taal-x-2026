import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import { toISTString } from '@/lib/dateUtils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const claims = await Claim.find()
    .populate('participantId', 'name fatherName participantId')
    .populate('claimedByStaffId', 'name email')
    .sort({ distributionDate: 1, claimedAt: 1 })

  const rows = [
    ['Participant ID', 'Name', 'Father Name', 'Navratri Day', 'Distribution Date', 'Claimed At (IST)', 'Distributed By'],
    ...claims.map(c => {
      const p = c.participantId as { participantId?: string; name?: string; fatherName?: string }
      const s = c.claimedByStaffId as { name?: string; email?: string }
      return [
        p?.participantId || '',
        p?.name || '',
        p?.fatherName || '',
        `Day ${c.navratriDay}`,
        c.distributionDate,
        toISTString(c.claimedAt),
        s?.name || s?.email || '',
      ]
    }),
  ]

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="distribution-report.csv"',
    },
  })
}
