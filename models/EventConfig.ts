import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IEventConfig extends Document {
  startDate: string        // "2026-10-01"
  endDate: string          // "2026-10-09"
  timezone: string         // always "Asia/Kolkata"
  entryStartTime?: string  // e.g. "19:00"
  entryEndTime?: string    // e.g. "21:30"
  exitStartTime?: string   // e.g. "22:00"
  exitEndTime?: string     // e.g. "00:30"
  updatedAt: Date
  updatedByAdminId?: Types.ObjectId
}

const EventConfigSchema = new Schema<IEventConfig>(
  {
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    entryStartTime: { type: String, default: '19:00' },
    entryEndTime: { type: String, default: '21:30' },
    exitStartTime: { type: String, default: '22:00' },
    exitEndTime: { type: String, default: '00:30' },
    updatedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

// Single-document collection — always one record
const EventConfig: Model<IEventConfig> =
  mongoose.models.EventConfig ||
  mongoose.model<IEventConfig>('EventConfig', EventConfigSchema)

export default EventConfig
