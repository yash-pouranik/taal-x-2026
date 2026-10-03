import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IParticipant extends Document {
  participantId: string   // "NAV-001"
  countNumber?: number    // Sequence / count number
  name: string
  motherName?: string
  fatherName: string
  phone?: string
  address?: string
  category?: 'general' | 'obc' | 'sc' | 'st'
  status: 'active' | 'cancelled'
  cancelledAt?: Date
  qrToken?: string        // Raw token stored to allow re-printing without changing the QR
  qrTokenHash: string     // SHA-256 for fast unique lookup on scan
  createdAt: Date
  updatedAt: Date
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    participantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    countNumber: {
      type: Number,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    motherName: {
      type: String,
      trim: true,
      default: '',
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['general', 'obc', 'sc', 'st'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
    cancelledAt: {
      type: Date,
    },
    qrToken: {
      type: String,
      trim: true,
    },
    qrTokenHash: {
      type: String,
      required: true,
      unique: true,    // enforces one token per participant and prevents hash collisions
    },
  },
  { timestamps: true }
)

// Text index for name search
ParticipantSchema.index({ name: 'text', fatherName: 'text' })

// Prevent model re-compilation during hot reload
const Participant: Model<IParticipant> =
  mongoose.models.Participant ||
  mongoose.model<IParticipant>('Participant', ParticipantSchema)

export default Participant
