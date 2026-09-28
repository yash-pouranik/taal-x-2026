import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Participant from '@/models/Participant'
import { generateQRToken, hashToken, generateQRBuffer, generateQRDataURL } from '@/lib/qr'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const participant = await Participant.findById(params.id)
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  // Reuse existing qrToken if available so re-printing doesn't invalidate existing card
  let rawToken = participant.qrToken
  if (!rawToken) {
    rawToken = generateQRToken()
    const qrTokenHash = hashToken(rawToken)
    await Participant.findByIdAndUpdate(params.id, { qrToken: rawToken, qrTokenHash })
  }

  const format = req.nextUrl.searchParams.get('format') || 'png'

  if (format === 'dataurl') {
    const dataUrl = await generateQRDataURL(rawToken)
    return NextResponse.json({ dataUrl, rawToken })
  }

  const buffer = await generateQRBuffer(rawToken)
  // NextResponse expects BodyInit (Uint8Array), not Node.js Buffer directly
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${participant.participantId}.png"`,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const participant = await Participant.findById(params.id)
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  // Explicitly regenerate token — invalidates old card
  const rawToken = generateQRToken()
  const qrTokenHash = hashToken(rawToken)

  await Participant.findByIdAndUpdate(params.id, { qrToken: rawToken, qrTokenHash })

  const dataUrl = await generateQRDataURL(rawToken)

  return NextResponse.json({
    message: 'QR regenerated. Old QR is now invalid.',
    rawToken,
    dataUrl,
  })
}
