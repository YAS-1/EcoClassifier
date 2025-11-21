import mongoose from 'mongoose';

const { Schema } = mongoose;

const EventSchema = new Schema({
  filename: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  category: { type: String, trim: true, index: true }, // e.g., 'plastic_cup' or 'paper'
  confidence: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
  deviceId: { type: String, default: 'demo-web' },
  location: { type: String, default: 'Demo' },
  raw_prediction: { type: Schema.Types.Mixed } // store full model output if needed
}, {
  versionKey: false,
  timestamps: false
});

// Compound index for faster category + time-range queries (useful for stats)
EventSchema.index({ category: 1, timestamp: -1 });

const Event = mongoose.model('Event', EventSchema);

export default Event;