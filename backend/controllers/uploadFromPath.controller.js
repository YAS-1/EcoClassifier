// controllers/uploadFromPath.controller.js
import fs from "fs/promises";
import path from "path";
import Event from "../models/Event.model.js";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary.js";
import { predictFromImageUrl } from "../utils/modelClient.js";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB - limit server-read file size for safety

export const uploadFromPath = async (req, res) => {
  try {
    const { path: requestedPath } = req.body;
    if (!requestedPath) {
      return res.status(400).json({ success: false, message: "Missing 'path' in request body." });
    }

    // Resolve and enforce allowed base directory
    const allowedBase = process.env.SAMPLE_UPLOAD_DIR
      ? path.resolve(process.env.SAMPLE_UPLOAD_DIR)
      : path.resolve("/mnt/data");

    const resolved = path.resolve(requestedPath);

    if (!resolved.startsWith(allowedBase)) {
      return res.status(403).json({ success: false, message: "Access to the requested path is forbidden." });
    }

    // Ensure file exists and is a file
    let stats;
    try {
      stats = await fs.stat(resolved);
    } catch (err) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    if (!stats.isFile()) {
      return res.status(400).json({ success: false, message: "Requested path is not a file." });
    }

    if (stats.size > MAX_BYTES) {
      return res.status(400).json({
        success: false,
        message: `File exceeds maximum allowed size (${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
      });
    }

    // Read file buffer
    const fileBuffer = await fs.readFile(resolved);

    // Upload buffer to Cloudinary (re-uses your existing util)
    const uploadResult = await uploadBufferToCloudinary(fileBuffer, "ecoclassifier/demo");
    const imageUrl = uploadResult.secure_url;

    // Call model (your existing stub)
    const prediction = await predictFromImageUrl(imageUrl);
    const category = prediction?.category || "general";
    const confidence = typeof prediction?.confidence === "number" ? prediction.confidence : 0;

    // Save to DB (same shape as uploadAndClassify)
    const record = await Event.create({
      filename: path.basename(resolved),
      imageUrl,
      category,
      confidence,
      raw_prediction: prediction,
      deviceId: "server-sample",
      location: "Demo (server)",
    });

    return res.json({ success: true, record });
  } catch (err) {
    console.error("uploadFromPath err", err);
    return res.status(500).json({ success: false, message: err.message || "Internal error" });
  }
};