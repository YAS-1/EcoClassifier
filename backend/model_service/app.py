import io
import os
import time
import logging
from flask import Flask, request, jsonify
from config import Config
from PIL import Image
import numpy as np
import requests

# ultralytics YOLO
from ultralytics import YOLO

# setup logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("model_service")

app = Flask(__name__)

# Load model at startup
MODEL = None
MODEL_LOADED = False
def load_model():
    global MODEL, MODEL_LOADED
    model_path = Config.MODEL_PATH
    log.info(f"Loading YOLO model from: {model_path}")
    try:
        MODEL = YOLO(model_path)
        # optionally warm-up once
        MODEL_LOADED = True
        log.info("Model loaded successfully.")
    except Exception as e:
        log.exception("Failed to load model:")
        MODEL_LOADED = False

# utility: download image from URL to PIL Image
def download_image_from_url(url, timeout=10):
    resp = requests.get(url, stream=True, timeout=timeout)
    resp.raise_for_status()
    img_bytes = resp.content
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")

# convert PIL -> numpy array (HWC, uint8)
def pil_to_numpy(img):
    return np.array(img)

# Decision logic; accepts raw detections list and returns final category/confidence
def decide_category(detections, config=Config):
    """
    detections: list of dict {class_id, class_name, confidence, box}
    returns: category (string), confidence (float), uncertain (bool), notes (str)
    """
    # aggregate best confidence per class
    best_per_class = {}
    for d in detections:
        name = str(d.get("class_name", "")).lower()
        conf = float(d.get("confidence", 0) or 0)
        if name not in best_per_class or conf > best_per_class[name]:
            best_per_class[name] = conf

    # ensure keys present
    paper_conf = best_per_class.get("paper", 0.0)
    plastic_conf = best_per_class.get("plastic", 0.0)

    # find top two classes sorted
    sorted_classes = sorted(best_per_class.items(), key=lambda kv: kv[1], reverse=True)
    top_name, top_conf = (sorted_classes[0] if sorted_classes else ("general", 0.0))
    second_conf = sorted_classes[1][1] if len(sorted_classes) > 1 else 0.0

    # thresholds
    margin = config.CONFIDENCE_MARGIN
    global_min = config.GLOBAL_MIN
    paper_threshold = config.PAPER_THRESHOLD
    plastic_threshold = config.PLASTIC_THRESHOLD

    # apply per-class thresholds first
    chosen = "general"
    chosen_conf = top_conf
    uncertain = False
    notes = []

    # Check for paper
    if top_name == "paper" and top_conf >= paper_threshold:
        # margin over second?
        if (top_conf - second_conf) >= margin:
            chosen = "paper"
            notes.append(f"paper>=threshold ({top_conf:.3f} >= {paper_threshold}) and margin ok")
        else:
            # margin not met -> uncertain
            uncertain = True
            notes.append(f"paper margin not met ({top_conf:.3f} - {second_conf:.3f} < {margin})")
    # Check for plastic
    elif top_name == "plastic" and top_conf >= plastic_threshold:
        if (top_conf - second_conf) >= margin:
            chosen = "plastic"
            notes.append(f"plastic>=threshold ({top_conf:.3f} >= {plastic_threshold}) and margin ok")
        else:
            uncertain = True
            notes.append(f"plastic margin not met ({top_conf:.3f} - {second_conf:.3f} < {margin})")
    else:
        # no class passed its specific threshold; if top_conf >= global_min assign top class (but mark uncertain)
        if top_conf >= global_min and top_name in ("paper", "plastic"):
            chosen = top_name
            uncertain = True
            notes.append(f"assigned by GLOBAL_MIN ({top_conf:.3f} >= {global_min}) but flagged uncertain")
        else:
            chosen = "general"
            chosen_conf = top_conf
            notes.append(f"no class met thresholds; default to general")

    # Ensure chosen_conf is a float (use top_conf)
    if chosen != "general":
        chosen_conf = top_conf
    else:
        chosen_conf = top_conf

    return chosen, float(chosen_conf), bool(uncertain), "; ".join(notes)

# helper: parse ultralytics results and return simplified detections
def parse_predictions(results):
    # results is a list for each image; we assume single image call
    out = []
    if not results:
        return out
    r = results[0]
    boxes = r.boxes
    # boxes.boxes is an ndarray (N,6): x1,y1,x2,y2,score,class
    for i, b in enumerate(boxes.data.tolist()):
        x1,y1,x2,y2,score,cls_idx = b
        cls_idx = int(cls_idx)
        # map index to class name using model.names if available
        cls_name = None
        try:
            cls_name = MODEL.names.get(cls_idx, str(cls_idx))
        except Exception:
            cls_name = str(cls_idx)
        out.append({
            "class_id": cls_idx,
            "class_name": cls_name,
            "confidence": float(score),
            "box": [float(x1), float(y1), float(x2), float(y2)]
        })
    return out

# Optional simple API key guard
def validate_api_key(req):
    key = Config.MODEL_API_KEY
    if not key:
        return True
    header = req.headers.get("X-Model-Key") or req.args.get("key")
    return header == key

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "model_loaded": MODEL_LOADED,
        "model_path": Config.MODEL_PATH
    })

@app.route("/predict", methods=["POST"])
def predict():
    if not validate_api_key(request):
        return jsonify({"success": False, "message": "Invalid API Key"}), 401

    if not MODEL_LOADED:
        return jsonify({"success": False, "message": "Model not loaded"}), 503

    data = request.get_json(silent=True)
    image_pil = None
    # accept JSON imageUrl or a file upload
    try:
        if data and data.get("imageUrl"):
            img_url = data.get("imageUrl")
            log.info(f"Fetching image from URL: {img_url}")
            image_pil = download_image_from_url(img_url)
        else:
            # try file upload
            if 'file' in request.files:
                f = request.files['file']
                image_pil = Image.open(f.stream).convert("RGB")
            else:
                return jsonify({"success": False, "message": "No image provided. Send JSON {imageUrl} or upload multipart file 'file'."}), 400
    except Exception as e:
        log.exception("Failed to get image:")
        return jsonify({"success": False, "message": f"Failed to fetch/parse image: {str(e)}"}), 400

    # convert to numpy and run prediction
    try:
        img_np = pil_to_numpy(image_pil)  # HWC uint8
        start = time.time()
        # use MODEL.predict with numpy array - return results
        results = MODEL.predict(source=img_np, imgsz=640, conf=0.05, iou=0.45, max_det=50)
        elapsed = time.time() - start
        detections = parse_predictions(results)
        log.info(f"Inference complete: {len(detections)} detections, {elapsed:.3f}s")
    except Exception as e:
        log.exception("Model inference failed:")
        return jsonify({"success": False, "message": f"Inference error: {str(e)}"}), 500

    # apply decision logic
    chosen_cat, chosen_conf, uncertain, notes = decide_category(detections)

    response = {
        "success": True,
        "category": chosen_cat,
        "confidence": float(chosen_conf),
        "uncertain": uncertain,
        "notes": notes,
        "raw_prediction": detections
    }
    return jsonify(response)

if __name__ == "__main__":
    load_model()
    app.run(host=Config.FLASK_HOST, port=Config.FLASK_PORT, debug=Config.FLASK_DEBUG)
