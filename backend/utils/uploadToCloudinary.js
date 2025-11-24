// uploadToCloudinary.js
import cloudinary from '../config/cloudinary.js'; // your existing cloudinary config (ESM)
import streamifier from 'streamifier';

export const uploadBufferToCloudinary = (buffer, folder = 'ecoclassifier/uploads') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};