import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const staff = await User.find({ role: 'staff' }).select('-passwordHash').sort({ createdAt: -1 })
  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const body = await req.json()
  const { name, email, password } = body

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'staff',
    isActive: true,
  })
  await user.save()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...userObj } = user.toObject()
  return NextResponse.json({ user: userObj }, { status: 201 })
}
