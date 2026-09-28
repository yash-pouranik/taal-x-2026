import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

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
  const { isActive } = body

  const user = await User.findOneAndUpdate(
    { _id: params.id, role: 'staff' },
    { isActive },
    { new: true }
  ).select('-passwordHash')

  if (!user) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const deleted = await User.findOneAndDelete({ _id: params.id, role: 'staff' })
  if (!deleted) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  return NextResponse.json({ message: 'Staff deleted' })
}
