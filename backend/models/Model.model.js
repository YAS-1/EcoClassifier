import mongoose from 'mongoose';

const { Schema } = mongoose;

const ModelSchema = new Schema({
  name: { type: String, required: true, trim: true },            // e.g., "yolov8n_finetuned"
  version: { type: String, required: true, trim: true },         // e.g., "v1.0"
  artifactUrl: { type: String, trim: true },                     // Cloudinary / S3 / HTTP URL to model file (.pt/.onnx/.tflite)
  framework: { type: String, default: 'yolov8', trim: true },    // e.g., 'yolov8', 'tflite', 'onnx'
  classes: [{ type: String, trim: true }],                       // array of class names in this model
  inputSize: { type: Number, default: 640 },                     // typical YOLO input size (optional)
  metrics: {                                                     // evaluation metrics summary
    mAP: { type: Number },
    precision: { type: Number },
    recall: { type: Number },
    loss: { type: Number }
  },
  deployed: { type: Boolean, default: false },                   // whether this model is currently active
  notes: { type: String },                                       // human notes / changelog
  uploadedBy: { type: String, trim: true },                      // username or id of uploader
  uploadedAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  versionKey: false
});

// Keep updatedAt in sync when saving
ModelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for queries
ModelSchema.index({ deployed: 1, uploadedAt: -1 });
ModelSchema.index({ name: 1, version: 1 }, { unique: true });

const Model = mongoose.model('Model', ModelSchema);

export default Model;