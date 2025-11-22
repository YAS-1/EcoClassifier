// upload.routes.js
import express from 'express';
import upload from '../middleware/uploadMulter.js'; // your Multer memory storage middleware (ESM export)
import { uploadAndClassify } from '../controllers/upload.controller.js';

const Uploadrouter = express.Router();

// field name 'image' should match frontend form input
Uploadrouter.post('/upload', upload.single('image'), uploadAndClassify);

export default Uploadrouter;