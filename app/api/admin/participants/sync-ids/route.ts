import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'अनधिकृत (Forbidden) - केवल व्यवस्थापक ही यह कर सकते हैं।' }, { status: 403 })
  }

  await connectDB()

  let dryRun = true
  try {
    const body = await req.json()
    if (typeof body.dryRun === 'boolean') {
      dryRun = body.dryRun
    }
  } catch {
    // Default to dry-run if body is empty or malformed
  }

  const allDocs = await Participant.find({}).lean()

  interface MismatchItem {
    _id: string
    name: string
    fatherName: string
    currentId: string
    targetId: string
    currentCount?: number
    targetCount: number
  }

  const mismatches: MismatchItem[] = []
  const targetIdCounts = new Map<string, string>()

  for (const doc of allDocs) {
    let targetCount = doc.countNumber
    const currentId = doc.participantId || ''

    if (typeof targetCount !== 'number' || isNaN(targetCount) || targetCount <= 0) {
      const match = currentId.match(/^NAV-(\d+)$/i)
      if (match) {
        targetCount = parseInt(match[1], 10)
      } else {
        continue
      }
    }

    const targetId = `NAV-${String(targetCount).padStart(3, '0')}`

    const existingDocId = targetIdCounts.get(targetId)
    if (existingDocId) {
      return NextResponse.json(
        {
          error: `टकराव (Conflict): दस्तावेज़ ${doc._id} और ${existingDocId} दोनों का लक्ष्य कोड ${targetId} है।`,
          conflict: { docA: doc._id, docB: existingDocId, targetId },
        },
        { status: 409 }
      )
    }
    targetIdCounts.set(targetId, doc._id.toString())

    const idMismatch = currentId !== targetId
    const countMismatch = doc.countNumber !== targetCount

    if (idMismatch || countMismatch) {
      mismatches.push({
        _id: doc._id.toString(),
        name: doc.name,
        fatherName: doc.fatherName,
        currentId,
        targetId,
        currentCount: doc.countNumber,
        targetCount,
      })
    }
  }

  if (dryRun || mismatches.length === 0) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      message: mismatches.length === 0
        ? 'डेटाबेस के सभी रिकॉर्ड्स पहले से ही अपने क्रमांक के साथ 1:1 सिंक हैं।'
        : `ड्राई रन: ${mismatches.length} रिकॉर्ड्स री-अलाइन किए जाने की आवश्यकता है।`,
      totalChecked: allDocs.length,
      mismatchesCount: mismatches.length,
      mismatches,
    })
  }

  // Two-Phase Safe Execution
  // Phase 1: Temporary Unique ID
  for (const m of mismatches) {
    await Participant.findByIdAndUpdate(m._id, {
      $set: { participantId: `TEMP-NAV-${m._id}`, countNumber: m.targetCount },
    })
  }

  // Phase 2: Final Target ID
  for (const m of mismatches) {
    await Participant.findByIdAndUpdate(m._id, {
      $set: { participantId: m.targetId, countNumber: m.targetCount },
    })
  }

  return NextResponse.json({
    success: true,
    dryRun: false,
    message: `सफलतापूर्वक ${mismatches.length} रिकॉर्ड्स को उनके सही NAV कोड पर सिंक कर दिया गया है।`,
    totalChecked: allDocs.length,
    updatedCount: mismatches.length,
    mismatches,
  })
}
