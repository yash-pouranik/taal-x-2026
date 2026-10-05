import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IClaim extends Document {
  participantId: Types.ObjectId
  distributionDate: string       // "2026-10-04" — IST business date as a string
  navratriDay: number            // 1–9
  claimedAt: Date                // UTC timestamp of the actual claim moment
  claimedByStaffId: Types.ObjectId
  giftClaimed: boolean
  giftClaimedAt?: Date
  giftStaffId?: Types.ObjectId
  foodClaimed: boolean
  foodClaimedAt?: Date
  foodStaffId?: Types.ObjectId
  entryTime?: Date
  exitTime?: Date
  createdAt: Date
  updatedAt: Date
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
      max: 30,
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
    giftClaimed: {
      type: Boolean,
      default: false,
    },
    giftClaimedAt: {
      type: Date,
    },
    giftStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    foodClaimed: {
      type: Boolean,
      default: false,
    },
    foodClaimedAt: {
      type: Date,
    },
    foodStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    entryTime: {
      type: Date,
    },
    exitTime: {
      type: Date,
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
ClaimSchema.index({ distributionDate: 1, navratriDay: 1 })

// Index for participant history
ClaimSchema.index({ participantId: 1 })

// Prevent model re-compilation during hot reload
const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>('Claim', ClaimSchema)

export default Claim
