// modelClient.js
/**
 * Temporary model client stub.
 * Replace this later with a real HTTP call to your model service (Flask/FastAPI).
 *
 * Expected return format:
 * { category: 'plastic', confidence: 0.92, boxes: [...] }  // boxes optional for detection
 */

export const predictFromImageUrl = async (imageUrl) => {
  // Simple deterministic stub based on filename heuristics (useful for demo)
  // e.g., if filename contains 'cup' then plastic, etc.
  try {
    const lower = (imageUrl || '').toLowerCase();
    if (lower.includes('cup') || lower.includes('juice')) {
      return { category: 'plastic', confidence: 0.95 };
    }
    if (lower.includes('bottle') || lower.includes('soda')) {
      return { category: 'plastic', confidence: 0.94 };
    }
    if (lower.includes('paper') || lower.includes('bag') || lower.includes('book') || lower.includes('napkin') || lower.includes('tissue')) {
      return { category: 'paper', confidence: 0.93 };
    }
    // default fallback
    return { category: 'general', confidence: 0.6 };
  } catch (err) {
    return { category: 'general', confidence: 0.5 };
  }
};

/**
 * Later you will replace predictFromImageUrl with a function that:
 *  - sends image buffer or image URL to the model service URL in process.env.MODEL_SERVICE_URL
 *  - e.g., axios.post(MODEL_SERVICE_URL, { imageUrl }) or multipart/form-data
 *  - and returns the parsed JSON prediction.
 */
