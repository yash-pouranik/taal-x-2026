import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IClaim extends Document {
  participantId: Types.ObjectId
  distributionDate: string       // "2026-10-04" — IST business date as a string
  navratriDay: number            // 1–9
  claimedAt: Date                // UTC timestamp of the actual claim moment
  claimedByStaffId: Types.ObjectId
  createdAt: Date
}

const ClaimSchema = new Schema<IClaim>(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    distributionDate: {
      type: String,
      required: true,
      // Format: "YYYY-MM-DD" (IST business date)
    },
    navratriDay: {
      type: Number,
      required: true,
      min: 1,
      max: 9,
    },
    claimedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    claimedByStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

// CRITICAL: Compound unique index — prevents double claiming on same date
// This is the database-level guarantee. Even concurrent requests cannot
// both succeed for the same (participantId, distributionDate) pair.
ClaimSchema.index(
  { participantId: 1, distributionDate: 1 },
  { unique: true }
)

// Index for fast daily stats queries
ClaimSchema.index({ distributionDate: 1 })

// Index for participant history
ClaimSchema.index({ participantId: 1 })

// Prevent model re-compilation during hot reload
const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>('Claim', ClaimSchema)

export default Claim
