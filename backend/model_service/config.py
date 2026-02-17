import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5001))
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() in ("1","true","yes")

    MODEL_PATH = os.getenv("MODEL_PATH", "./models/best.pt")

    # thresholds
    PAPER_THRESHOLD = float(os.getenv("PAPER_THRESHOLD", 0.30))
    PLASTIC_THRESHOLD = float(os.getenv("PLASTIC_THRESHOLD", 0.30))
    GLOBAL_MIN = float(os.getenv("GLOBAL_MIN", 0.25))
    CONFIDENCE_MARGIN = float(os.getenv("CONFIDENCE_MARGIN", 0.08))

    MODEL_API_KEY = os.getenv("MODEL_API_KEY", "")  # optional
