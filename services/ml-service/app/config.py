import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WEIGHTS_DIR = BASE_DIR / "weights"

# Default model weights path (checks for .pt, then .onnx)
DEFAULT_PT_WEIGHTS = WEIGHTS_DIR / "rdd_yolov8.pt"
DEFAULT_ONNX_WEIGHTS = WEIGHTS_DIR / "rdd_yolov8.onnx"
POTHOLE_WEIGHTS = WEIGHTS_DIR / "pothole_peterhdd.pt"

# Inference defaults (calibrated for high precision inspection)
DEFAULT_CONF_THRESHOLD = float(os.getenv("DEFAULT_CONF_THRESHOLD", "0.22"))
DEFAULT_IOU_THRESHOLD = float(os.getenv("DEFAULT_IOU_THRESHOLD", "0.40"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "v2.0.0-final-calibrated")

# Precision Presets
PRECISION_PRESETS = {
    "high": {
        "conf": 0.32,
        "iou": 0.35,
        "description": "High Precision (Audits & Enforcement - strictly eliminates false positives)"
    },
    "balanced": {
        "conf": 0.22,
        "iou": 0.40,
        "description": "Balanced (Standard municipal surveys - optimal precision & recall trade-off)"
    },
    "sensitive": {
        "conf": 0.15,
        "iou": 0.45,
        "description": "Sensitive (High Recall - flags nascent cracks and subtle distress)"
    }
}

# RDD Class Mapping (Class ID to Code and Description)
CLASS_MAPPINGS = {
    0: {"code": "D00", "name": "Longitudinal Crack"},
    1: {"code": "D10", "name": "Transverse Crack"},
    2: {"code": "D20", "name": "Alligator Crack"},
    3: {"code": "D40", "name": "Pothole"}
}

