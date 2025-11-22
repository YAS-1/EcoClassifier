// upload.controller.js
import Event from '../models/Event.model.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';
import { predictFromImageUrl } from '../utils/modelClient.js';

export const uploadAndClassify = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // Upload buffer to Cloudinary
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'ecoclassifier/demo');
    const imageUrl = uploadResult.secure_url;

    // Call model (stub for now) - using imageUrl for simplicity
    const prediction = await predictFromImageUrl(imageUrl);
    const category = prediction.category || 'general';
    const confidence = typeof prediction.confidence === 'number' ? prediction.confidence : 0;

    // Save event to DB
    const record = await Event.create({
      filename: req.file.originalname,
      imageUrl,
      category,
      confidence,
      raw_prediction: prediction,
      deviceId: 'demo-web',
      location: 'Demo'
    });

    return res.json({ success: true, record });
  } catch (err) {
    console.error('uploadAndClassify err', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};