import { config } from 'dotenv'
import { resolve } from 'path'

// Next.js uses .env.local — load it explicitly for this script
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') }) // fallback
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Load env manually for script context
const MONGODB_URI = process.env.MONGODB_URI
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing required env vars: MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD')
  process.exit(1)
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

const EventConfigSchema = new mongoose.Schema({
  startDate: String,
  endDate: String,
  timezone: { type: String, default: 'Asia/Kolkata' },
}, { timestamps: true })

const EventConfig = mongoose.models.EventConfig || mongoose.model('EventConfig', EventConfigSchema)

async function seed() {
  console.log('🔗 Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI!)

  // Create admin if not exists
  const existing = await User.findOne({ email: ADMIN_EMAIL!.toLowerCase() })
  if (existing) {
    console.log(`ℹ️  Admin already exists: ${existing.email}`)
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12)
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL!.toLowerCase(),
      passwordHash,
      role: 'admin',
      isActive: true,
    })
    console.log(`✅ Admin created: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`   ⚠️  Change this password after first login!`)
  }

  // Seed default event config if not exists
  const config = await EventConfig.findOne()
  if (!config) {
    await EventConfig.create({
      startDate: '2026-10-01',
      endDate: '2026-10-09',
      timezone: 'Asia/Kolkata',
    })
    console.log('✅ Default event config created: Oct 1 – Oct 9, 2026')
  } else {
    console.log(`ℹ️  Event config exists: ${config.startDate} – ${config.endDate}`)
  }

  await mongoose.disconnect()
  console.log('✅ Seeding complete.')
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
