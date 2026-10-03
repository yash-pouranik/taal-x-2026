import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import Claim from '@/models/Claim'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const body = await req.json().catch(() => ({}))
  const { confirmPhrase } = body

  // Strict confirmation phrase check
  if (confirmPhrase !== 'DELETE_ALL_PARTICIPANTS') {
    return NextResponse.json(
      { error: 'सुरक्षा पुष्टिकरण गलत है (Invalid confirmation phrase)' },
      { status: 400 }
    )
  }

  // Delete all participants and their claim logs
  const [participantResult, claimResult] = await Promise.all([
    Participant.deleteMany({}),
    Claim.deleteMany({}),
  ])

  return NextResponse.json({
    success: true,
    deletedParticipants: participantResult.deletedCount,
    deletedClaims: claimResult.deletedCount,
    message: `सभी ${participantResult.deletedCount} प्रतिभागियों और संबंधित रिकॉर्ड्स को सफलतापूर्वक मिटा दिया गया।`,
  })
}
