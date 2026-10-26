import sys
import json
import argparse
import os
from pathlib import Path

# Redirect noisy stderr/stdout during import
script_dir = Path(__file__).resolve().parent
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

def main():
    parser = argparse.ArgumentParser(description="Direct Road Damage Inference CLI")
    parser.add_argument("image_path", help="Path to input road image")
    parser.add_argument("--precision", choices=["high", "balanced", "sensitive"], default="balanced", help="Precision calibration mode")
    parser.add_argument("--conf", type=float, default=None, help="Explicit confidence threshold override (e.g. 0.35)")
    parser.add_argument("--iou", type=float, default=None, help="Explicit IoU threshold override (e.g. 0.40)")
    args = parser.parse_args()

    img_path = Path(args.image_path)
    if not img_path.exists():
        print(json.dumps({"error": f"Image file not found: {args.image_path}"}))
        sys.exit(1)

    try:
        from app.services.detector import detector

        with open(img_path, "rb") as f:
            img_bytes = f.read()

        result = detector.predict(
            image_bytes=img_bytes,
            conf_threshold=args.conf,
            iou_threshold=args.iou,
            precision_mode=args.precision
        )

        output = {
            "model_version": result.model_version,
            "inference_time_ms": result.inference_time_ms,
            "detections_count": result.detections_count,
            "precision_mode": result.precision_mode,
            "detections": [
                {
                    "class_id": d.class_id,
                    "class_code": d.class_code,
                    "class_name": d.class_name,
                    "confidence": d.confidence,
                    "consensus": getattr(d, "consensus", False),
                    "box_xyxy": list(d.box_xyxy),
                    "box_normalized": list(d.box_normalized),
                    "metrics": d.metrics.model_dump() if getattr(d, "metrics", None) else None
                }
                for d in result.detections
            ]
        }
        # Mark output with clear JSON delimiter
        print("___JSON_OUTPUT_START___")
        print(json.dumps(output))
        print("___JSON_OUTPUT_END___")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        print("___JSON_OUTPUT_START___")
        print(json.dumps({"error": str(e)}))
        print("___JSON_OUTPUT_END___")
        sys.exit(1)

if __name__ == "__main__":
    main()
