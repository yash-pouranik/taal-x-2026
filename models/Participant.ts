import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IParticipant extends Document {
  participantId: string   // "NAV-001"
  name: string
  fatherName: string
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
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
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
