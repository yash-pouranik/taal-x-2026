import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IEventConfig extends Document {
  startDate: string        // "2026-10-01"
  endDate: string          // "2026-10-09"
  timezone: string         // always "Asia/Kolkata"
  updatedAt: Date
  updatedByAdminId?: Types.ObjectId
}

const EventConfigSchema = new Schema<IEventConfig>(
  {
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    updatedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

// Single-document collection — always one record
const EventConfig: Model<IEventConfig> =
  mongoose.models.EventConfig ||
  mongoose.model<IEventConfig>('EventConfig', EventConfigSchema)

export default EventConfig
