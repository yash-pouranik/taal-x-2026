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
  const { confirmPhrase, mode, fromCount, toCount } = body

  // Range deletion mode: Delete participants between fromCount and toCount
  if (mode === 'range') {
    if (confirmPhrase !== 'DELETE_RANGE' && confirmPhrase !== 'DELETE') {
      return NextResponse.json(
        { error: 'सुरक्षा पुष्टिकरण गलत है (Invalid confirmation phrase)' },
        { status: 400 }
      )
    }

    const from = Number(fromCount)
    const to = Number(toCount)

    if (isNaN(from) || isNaN(to) || from <= 0 || to <= 0) {
      return NextResponse.json(
        { error: 'कृपया मान्य क्रमांक रेंज दर्ज करें (Valid range required)' },
        { status: 400 }
      )
    }

    if (from > to) {
      return NextResponse.json(
        { error: 'शुरुआती क्रमांक अंतिम क्रमांक से बड़ा नहीं हो सकता (From must be <= To)' },
        { status: 400 }
      )
    }

    // Generate possible participantIds for this range (e.g. NAV-001, NAV-137)
    const paddedIds: string[] = []
    for (let i = from; i <= to; i++) {
      paddedIds.push(`NAV-${String(i).padStart(3, '0')}`)
      paddedIds.push(`NAV-${i}`)
    }

    const query = {
      $or: [
        { countNumber: { $gte: from, $lte: to } },
        { participantId: { $in: paddedIds } },
      ],
    }

    const matched = await Participant.find(query).select('_id')
    if (matched.length === 0) {
      return NextResponse.json({
        success: true,
        deletedParticipants: 0,
        deletedClaims: 0,
        message: `क्रमांक #${from} से #${to} के बीच कोई प्रतिभागी नहीं मिला।`,
      })
    }

    const idsToDelete = matched.map((p) => p._id)

    const [participantResult, claimResult] = await Promise.all([
      Participant.deleteMany({ _id: { $in: idsToDelete } }),
      Claim.deleteMany({ participantId: { $in: idsToDelete } }),
    ])

    return NextResponse.json({
      success: true,
      deletedParticipants: participantResult.deletedCount,
      deletedClaims: claimResult.deletedCount,
      message: `क्रमांक #${from} से #${to} तक के कुल ${participantResult.deletedCount} प्रतिभागियों और उनके वितरण रिकॉर्ड्स को सफलतापूर्वक मिटा दिया गया।`,
    })
  }

  // Strict confirmation phrase check for full reset
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
