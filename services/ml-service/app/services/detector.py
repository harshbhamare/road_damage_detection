import os
import time
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import cv2
from PIL import Image, ImageOps
import io

from app.config import (
    DEFAULT_PT_WEIGHTS,
    DEFAULT_ONNX_WEIGHTS,
    POTHOLE_WEIGHTS,
    CLASS_MAPPINGS,
    MODEL_VERSION,
    DEFAULT_CONF_THRESHOLD,
    DEFAULT_IOU_THRESHOLD,
    PRECISION_PRESETS
)
from app.schemas import DetectionBox, InferenceResponse, DistressMetrics
from app.services.depth_engine import depth_engine

def _box_area(box: List[float]) -> float:
    return max(0.0, box[2] - box[0]) * max(0.0, box[3] - box[1])

def _box_iou(b1: List[float], b2: List[float]) -> float:
    ix1 = max(b1[0], b2[0])
    iy1 = max(b1[1], b2[1])
    ix2 = min(b1[2], b2[2])
    iy2 = min(b1[3], b2[3])
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter == 0.0:
        return 0.0
    union = _box_area(b1) + _box_area(b2) - inter
    return inter / union if union > 0.0 else 0.0

def _box_intersection_over_min(b1: List[float], b2: List[float]) -> float:
    """Computes intersection over min area (useful for nested or unequal boxes)."""
    ix1 = max(b1[0], b2[0])
    iy1 = max(b1[1], b2[1])
    ix2 = min(b1[2], b2[2])
    iy2 = min(b1[3], b2[3])
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter == 0.0:
        return 0.0
    min_area = min(_box_area(b1), _box_area(b2))
    return inter / min_area if min_area > 0.0 else 0.0

def _box_containment(inner: List[float], outer: List[float]) -> float:
    """Returns what proportion of 'inner' is inside 'outer'."""
    ix1 = max(inner[0], outer[0])
    iy1 = max(inner[1], outer[1])
    ix2 = min(inner[2], outer[2])
    iy2 = min(inner[3], outer[3])
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    a_inner = _box_area(inner)
    return inter / a_inner if a_inner > 0.0 else 0.0

def refine_pothole_box(cv_img: np.ndarray, box: List[float], margin: int = 4) -> List[float]:
    """
    Refines and tightens the raw YOLO proposal to fit the actual pothole cavity
    using localized luminance thresholding and contour boundary detection.
    Guarantees that the detected contour is a legitimate dark depression.
    """
    img_h, img_w = cv_img.shape[:2]
    x1, y1, x2, y2 = [int(round(v)) for v in box]

    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(img_w, x2), min(img_h, y2)

    bw = x2 - x1
    bh = y2 - y1
    if bw < 16 or bh < 16:
        return box

    roi = cv_img[y1:y2, x1:x2]
    if roi.size == 0:
        return box

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Invert to detect dark crater/recession relative to asphalt
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return box

    roi_cx, roi_cy = bw / 2.0, bh / 2.0
    best_cnt = None
    best_score = -1.0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 20:
            continue
        cx, cy, cw, ch = cv2.boundingRect(cnt)
        cnt_cx = cx + cw / 2.0
        cnt_cy = cy + ch / 2.0
        dist = np.hypot(cnt_cx - roi_cx, cnt_cy - roi_cy)
        score = area / (dist + 8.0)
        if score > best_score:
            best_score = score
            best_cnt = cnt

    if best_cnt is not None:
        cx, cy, cw, ch = cv2.boundingRect(best_cnt)
        contour_area = cw * ch
        raw_area = bw * bh
        ratio = contour_area / raw_area if raw_area > 0 else 0
        if 0.18 <= ratio <= 0.92:
            mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.drawContours(mask, [best_cnt], -1, 255, -1)
            inside_mean = cv2.mean(gray, mask=mask)[0]
            outside_mean = cv2.mean(gray, mask=cv2.bitwise_not(mask))[0]
            if inside_mean <= outside_mean + 10.0:
                nx1 = max(0.0, float(x1 + cx - margin))
                ny1 = max(0.0, float(y1 + cy - margin))
                nx2 = min(float(img_w), float(x1 + cx + cw + margin))
                ny2 = min(float(img_h), float(y1 + cy + ch + margin))
                return [nx1, ny1, nx2, ny2]

    return box

class RoadDamageDetector:
    def __init__(self):
        self.model = None
        self.weights_type: Optional[str] = None
        self.weights_path: Optional[Path] = None
        self.device: str = "cpu"
        self.pothole_model = None
        self._load_model()

    def _load_model(self):
        """Attempts to load trained weights (.pt or .onnx) if available."""
        if DEFAULT_PT_WEIGHTS.exists():
            try:
                from ultralytics import YOLO
                import torch
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                self.model = YOLO(str(DEFAULT_PT_WEIGHTS))
                self.weights_type = "pytorch"
                self.weights_path = DEFAULT_PT_WEIGHTS
                print(f"[Detector] Loaded PyTorch YOLO weights from {DEFAULT_PT_WEIGHTS} on {self.device}")
            except Exception as e:
                print(f"[Detector] Failed to load PyTorch weights: {e}")

        if POTHOLE_WEIGHTS.exists():
            try:
                from ultralytics import YOLO
                self.pothole_model = YOLO(str(POTHOLE_WEIGHTS))
                print(f"[Detector] Loaded specialized Pothole weights from {POTHOLE_WEIGHTS}")
            except Exception as e:
                print(f"[Detector] Failed to load specialized pothole weights: {e}")

        if self.model is not None or self.pothole_model is not None:
            if self.model is None and self.pothole_model is not None:
                self.model = self.pothole_model
                self.weights_type = "pytorch"
                self.weights_path = POTHOLE_WEIGHTS
            return

        if DEFAULT_ONNX_WEIGHTS.exists():
            try:
                import onnxruntime as ort
                self.model = ort.InferenceSession(str(DEFAULT_ONNX_WEIGHTS))
                self.weights_type = "onnx"
                self.weights_path = DEFAULT_ONNX_WEIGHTS
                self.device = "cpu"
                print(f"[Detector] Loaded ONNX weights from {DEFAULT_ONNX_WEIGHTS}")
                return
            except Exception as e:
                print(f"[Detector] Failed to load ONNX weights: {e}")

        print("[Detector] No trained weights found. Real inference will require model weights.")

    @property
    def is_ready(self) -> bool:
        return self.model is not None or self.pothole_model is not None

    def predict(
        self,
        image_bytes: bytes,
        conf_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
        precision_mode: str = "balanced",
        imgsz: Optional[int] = None
    ) -> InferenceResponse:
        """
        Runs high-precision computer vision inference with:
        1. Calibrated confidence thresholds & precision presets (high, balanced, sensitive)
        2. Crack-pothole semantic disambiguation (prevents single-class pothole model from masking cracks)
        3. Distress-adaptive confidence floors (allows subtle road cracks to be detected without false alarms)
        4. Contiguous crack segment stitching (unifies fragmented cracks into full fissure proposals)
        5. Multi-model consensus boosting for confirmed potholes
        6. Road horizon & vehicle hood boundary exclusion
        7. Aspect ratio & micro-noise geometric sanity checks
        8. Cross-class NMS and contour cavity snapping
        """
        if not self.is_ready:
            raise RuntimeError(
                "Model weights are not installed. Ensure pothole_peterhdd.pt or rdd_yolov8.pt "
                "is in services/ml-service/weights/"
            )

        start_time = time.time()
        raw_image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(raw_image).convert("RGB")
        img_w, img_h = image.size
        total_img_area = img_w * img_h
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # Calibrate effective thresholds based on precision_mode and user override
        mode_config = PRECISION_PRESETS.get(precision_mode, PRECISION_PRESETS["balanced"])
        effective_conf = conf_threshold if (conf_threshold is not None and conf_threshold > 0.0) else mode_config["conf"]
        effective_iou = iou_threshold if (iou_threshold is not None and iou_threshold > 0.0) else mode_config["iou"]

        # Scale inference resolution (multiple of 32)
        raw_target = imgsz if imgsz else max(640, min(1280, max(img_w, img_h)))
        target_imgsz = int(round(raw_target / 32.0)) * 32

        raw_candidates: List[Dict[str, Any]] = []

        if self.weights_type == "pytorch":
            # 1. Specialized Pothole Model Pass
            if self.pothole_model is not None:
                try:
                    p_res = self.pothole_model.predict(
                        source=image,
                        conf=0.18,
                        iou=effective_iou,
                        device=self.device,
                        verbose=False
                    )
                    for r in p_res:
                        for b in r.boxes:
                            raw_candidates.append({
                                "cls": 3,
                                "code": "D40",
                                "name": "Pothole",
                                "conf": float(b.conf[0].item()),
                                "xyxy": b.xyxy[0].tolist(),
                                "source": "pothole_model",
                                "consensus": False
                            })
                except Exception as ex:
                    print(f"[Detector] Pothole model inference error: {ex}")

            # 2. RDD Multiclass Model Pass (Longitudinal D00, Transverse D10, Alligator D20, Pothole D40)
            if self.model is not None and self.model is not self.pothole_model:
                try:
                    rdd_res = self.model.predict(
                        source=image,
                        conf=0.14,
                        iou=effective_iou,
                        imgsz=target_imgsz,
                        device=self.device,
                        verbose=False
                    )
                    for r in rdd_res:
                        for b in r.boxes:
                            cls_id = int(b.cls[0].item())
                            c_info = CLASS_MAPPINGS.get(cls_id, {"code": f"D{cls_id}", "name": f"Class_{cls_id}"})
                            raw_candidates.append({
                                "cls": cls_id,
                                "code": c_info["code"],
                                "name": c_info["name"],
                                "conf": float(b.conf[0].item()),
                                "xyxy": b.xyxy[0].tolist(),
                                "source": "rdd_model",
                                "consensus": False
                            })
                except Exception as ex:
                    print(f"[Detector] RDD model inference error: {ex}")

            # 3. Crack-Pothole Semantic Disambiguation:
            # pothole_model is a single-class binary model. When it sees a dark fissure/crack,
            # it mistakenly predicts 'D40 (Pothole)'. If an RDD multiclass proposal predicts
            # a crack (D00, D10, D20) overlapping this proposal, reclassify it as the crack!
            for p in raw_candidates:
                if p["source"] == "pothole_model" and p["code"] == "D40":
                    for r in raw_candidates:
                        if r["source"] == "rdd_model" and r["code"] in ("D00", "D10", "D20"):
                            ix1 = max(p["xyxy"][0], r["xyxy"][0])
                            iy1 = max(p["xyxy"][1], r["xyxy"][1])
                            ix2 = min(p["xyxy"][2], r["xyxy"][2])
                            iy2 = min(p["xyxy"][3], r["xyxy"][3])
                            if ix2 > ix1 and iy2 > iy1:
                                inter = (ix2 - ix1) * (iy2 - iy1)
                                min_a = min(_box_area(p["xyxy"]), _box_area(r["xyxy"]))
                                if min_a > 0 and (inter / min_a) >= 0.15:
                                    p["code"] = r["code"]
                                    p["name"] = r["name"]
                                    p["cls"] = r["cls"]
                                    p["source"] = "reclassified_fissure"
                                    break

            # 4. Dual-Model Consensus Detection & Boost for genuine potholes
            pothole_candidates = [c for c in raw_candidates if c["code"] == "D40" and c["source"] == "pothole_model"]
            rdd_potholes = [c for c in raw_candidates if c["code"] == "D40" and c["source"] == "rdd_model"]
            non_potholes = [c for c in raw_candidates if c["code"] != "D40"]

            merged_potholes: List[Dict[str, Any]] = []
            used_rdd_indices = set()

            for p_cand in pothole_candidates:
                matched_rdd_idx = None
                best_iou = 0.0
                for idx, r_cand in enumerate(rdd_potholes):
                    if idx in used_rdd_indices:
                        continue
                    iou = _box_iou(p_cand["xyxy"], r_cand["xyxy"])
                    iom = _box_intersection_over_min(p_cand["xyxy"], r_cand["xyxy"])
                    if (iou >= 0.25 or iom >= 0.40) and iou > best_iou:
                        best_iou = iou
                        matched_rdd_idx = idx

                if matched_rdd_idx is not None:
                    r_cand = rdd_potholes[matched_rdd_idx]
                    used_rdd_indices.add(matched_rdd_idx)
                    w1, w2 = p_cand["conf"], r_cand["conf"]
                    merged_box = [
                        (p_cand["xyxy"][i] * w1 + r_cand["xyxy"][i] * w2) / (w1 + w2)
                        for i in range(4)
                    ]
                    boosted_conf = min(0.98, max(w1, w2) + 0.12)
                    merged_potholes.append({
                        "cls": 3,
                        "code": "D40",
                        "name": "Pothole",
                        "conf": boosted_conf,
                        "xyxy": merged_box,
                        "source": "ensemble_consensus",
                        "consensus": True
                    })
                else:
                    merged_potholes.append(p_cand)

            for idx, r_cand in enumerate(rdd_potholes):
                if idx not in used_rdd_indices:
                    merged_potholes.append(r_cand)

            combined_candidates = merged_potholes + non_potholes

            # 5. Distress-Adaptive Thresholding & Road Geometry Filtering
            # Potholes naturally have high contrast (conf floor = effective_conf)
            # Cracks have subtle diffuse edges (conf floor = calibrated for cracks)
            if precision_mode == "high":
                crack_conf_floor = min(effective_conf, 0.22)
            elif precision_mode == "balanced":
                crack_conf_floor = min(effective_conf, 0.18)
            else:
                crack_conf_floor = 0.15

            pothole_conf_floor = effective_conf

            clean_candidates: List[Dict[str, Any]] = []
            for item in combined_candidates:
                bx1, by1, bx2, by2 = item["xyxy"]
                bw = bx2 - bx1
                bh = by2 - by1
                area = bw * bh
                b_center_y = by1 + (bh / 2.0)

                # A. Giant Outlandish Box Filter: cannot cover >60% of photo or >92% of dimension
                if area > 0.60 * total_img_area or bw > 0.92 * img_w or bh > 0.92 * img_h:
                    continue

                # B. Micro-Noise Specks: boxes < 18x16 or < 260px area are rejected (removes camera artifacts)
                if bw < 18 or bh < 16 or area < 260:
                    continue

                # C. Horizon / Sky Filter: upper 12% of photo
                if precision_mode != "sensitive":
                    if b_center_y < (0.12 * img_h) and by2 < (0.22 * img_h):
                        continue
                    if by1 < (0.05 * img_h) and by2 < (0.16 * img_h):
                        continue

                    # D. Vehicle Hood Filter: only drops tiny strip right on bottom edge (<5% height)
                    if by1 > (0.95 * img_h) and bh < (0.05 * img_h):
                        continue

                # Distant Pothole vs Crack Verification:
                # Distant dark specks in top 38% of image require higher confidence or consensus
                if item["code"] == "D40" and not item.get("consensus"):
                    if b_center_y < (0.38 * img_h) and item["conf"] < 0.45:
                        continue
                    if area < 400 and item["conf"] < 0.38:
                        continue

                # E. Aspect Ratio Sanity:
                aspect = bw / max(1.0, bh)
                if item["code"] == "D40":
                    if aspect > 6.0 or aspect < 0.16:
                        continue
                else:
                    if aspect > 22.0 or aspect < 0.04:
                        continue

                # F. Confidence Threshold Verification:
                if item["code"] == "D40":
                    min_acceptable = (pothole_conf_floor - 0.05) if item.get("consensus") else pothole_conf_floor
                else:
                    min_acceptable = crack_conf_floor

                if item["conf"] < min_acceptable:
                    continue

                clean_candidates.append(item)

            # Sort descending by confidence
            clean_candidates.sort(key=lambda x: x["conf"], reverse=True)

            # 6. Continuous Crack Stitching & Same-Class Fusion
            # Merges fragmented crack segments along the same trajectory without altering genuine class labels
            cracks = [it for it in clean_candidates if it["code"] in ("D00", "D10", "D20")]
            potholes = [it for it in clean_candidates if it["code"] == "D40"]

            merged_cracks: List[Dict[str, Any]] = []
            for c in cracks:
                merged = False
                for m in merged_cracks:
                    # ONLY merge if they are the exact same distress class!
                    if m["code"] != c["code"]:
                        continue

                    ix1 = max(m["xyxy"][0], c["xyxy"][0])
                    iy1 = max(m["xyxy"][1], c["xyxy"][1])
                    ix2 = min(m["xyxy"][2], c["xyxy"][2])
                    iy2 = min(m["xyxy"][3], c["xyxy"][3])
                    overlap = (ix2 > ix1 and iy2 > iy1)

                    should_merge = False
                    if overlap:
                        should_merge = True
                    elif m["code"] == "D00":
                        # Longitudinal crack runs vertically: require horizontal alignment and small vertical gap
                        h_overlap = (min(m["xyxy"][2], c["xyxy"][2]) - max(m["xyxy"][0], c["xyxy"][0])) > -8
                        v_gap = max(0, max(m["xyxy"][1], c["xyxy"][1]) - min(m["xyxy"][3], c["xyxy"][3]))
                        if h_overlap and v_gap < 35:
                            should_merge = True
                    elif m["code"] == "D10":
                        # Transverse crack runs horizontally: require vertical alignment and small horizontal gap
                        v_overlap = (min(m["xyxy"][3], c["xyxy"][3]) - max(m["xyxy"][1], c["xyxy"][1])) > -8
                        h_gap = max(0, max(m["xyxy"][0], c["xyxy"][0]) - min(m["xyxy"][2], c["xyxy"][2]))
                        if v_overlap and h_gap < 35:
                            should_merge = True
                    elif m["code"] == "D20":
                        # Alligator crack: merge overlapping fatigue mesh clusters
                        iou = _box_iou(m["xyxy"], c["xyxy"])
                        iom = _box_intersection_over_min(m["xyxy"], c["xyxy"])
                        if iou >= 0.20 or iom >= 0.35:
                            should_merge = True

                    if should_merge:
                        merged = True
                        m["xyxy"] = [
                            min(m["xyxy"][0], c["xyxy"][0]),
                            min(m["xyxy"][1], c["xyxy"][1]),
                            max(m["xyxy"][2], c["xyxy"][2]),
                            max(m["xyxy"][3], c["xyxy"][3])
                        ]
                        m["conf"] = max(m["conf"], c["conf"])
                        m["consensus"] = m.get("consensus", False) or c.get("consensus", False)
                        break
                if not merged:
                    merged_cracks.append(c)

            # Same-class weighted box fusion for potholes
            fused_potholes: List[Dict[str, Any]] = []
            for p in potholes:
                matched = False
                for f in fused_potholes:
                    iou = _box_iou(p["xyxy"], f["xyxy"])
                    iom = _box_intersection_over_min(p["xyxy"], f["xyxy"])
                    if iou >= 0.35 or iom >= 0.55:
                        matched = True
                        w1 = p["conf"]
                        w2 = f["conf"]
                        f["xyxy"] = [
                            (p["xyxy"][i] * w1 + f["xyxy"][i] * w2) / (w1 + w2)
                            for i in range(4)
                        ]
                        f["conf"] = max(f["conf"], p["conf"])
                        f["consensus"] = f.get("consensus", False) or p.get("consensus", False)
                        break
                if not matched:
                    fused_potholes.append(p)

            fused_same_class = merged_cracks + fused_potholes

            # 7. Cross-Class NMS (Conflict Resolution between different distress classes)
            resolved_classes: List[Dict[str, Any]] = []
            for item in fused_same_class:
                suppressed = False
                for r in resolved_classes:
                    if item["code"] != r["code"]:
                        iou = _box_iou(item["xyxy"], r["xyxy"])
                        iom = _box_intersection_over_min(item["xyxy"], r["xyxy"])
                        if iou >= 0.25 or iom >= 0.45:
                            # If one is a crack and the other is a pothole:
                            is_item_crack = item["code"] in ("D00", "D10", "D20")
                            is_r_crack = r["code"] in ("D00", "D10", "D20")
                            if is_item_crack and not is_r_crack:
                                # Crack takes precedence over pothole on crack-like or verified crack
                                r["suppress_flag"] = True
                            elif is_r_crack and not is_item_crack:
                                # Previous crack takes precedence over new pothole proposal
                                suppressed = True
                                break
                            elif r["conf"] >= item["conf"] * 1.15:
                                suppressed = True
                                break
                            elif item["conf"] >= r["conf"] * 1.15:
                                r["suppress_flag"] = True
                            else:
                                suppressed = True
                                break
                if not suppressed:
                    resolved_classes.append(item)

            resolved_classes = [it for it in resolved_classes if not it.get("suppress_flag", False)]

            # 8. Enclosure / Containment Suppression (IoM > 0.65)
            enclosure_filtered: List[Dict[str, Any]] = []
            for i, big in enumerate(resolved_classes):
                is_enclosing = False
                area_big = _box_area(big["xyxy"])
                for j, small in enumerate(resolved_classes):
                    if i == j:
                        continue
                    area_small = _box_area(small["xyxy"])
                    if area_big > 1.8 * area_small:
                        c = _box_containment(small["xyxy"], big["xyxy"])
                        if c > 0.65:
                            is_enclosing = True
                            break
                if not is_enclosing:
                    enclosure_filtered.append(big)

            # 9. Pothole Boundary Snapping (only for genuine potholes)
            final_boxes: List[Dict[str, Any]] = []
            for item in enclosure_filtered:
                if item["code"] == "D40":
                    tight_box = refine_pothole_box(cv_img, item["xyxy"])
                    item["xyxy"] = tight_box
                final_boxes.append(item)

            # 10. Compute Depth, Geometric Scale, Volumetric & Material Takeoff Metrics
            detections: List[DetectionBox] = []
            for item in final_boxes:
                cls_id = item["cls"]
                conf = item["conf"]
                xmin, ymin, xmax, ymax = item["xyxy"]
                box_w = xmax - xmin
                box_h = ymax - ymin
                x_center = xmin + (box_w / 2.0)
                y_center = ymin + (box_h / 2.0)

                norm_box = (
                    round(x_center / img_w, 4),
                    round(y_center / img_h, 4),
                    round(box_w / img_w, 4),
                    round(box_h / img_h, 4)
                )

                # Compute photometric depth, real dimensions, volume, and repair materials
                try:
                    metrics_data = depth_engine.compute_metrics(cv_img, item["xyxy"], item["code"])
                    metrics_obj = DistressMetrics(**metrics_data)
                except Exception as m_err:
                    print(f"[Detector] Depth metrics calculation notice: {m_err}")
                    metrics_obj = None

                detections.append(
                    DetectionBox(
                        class_id=cls_id,
                        class_code=item["code"],
                        class_name=item["name"],
                        confidence=round(conf, 4),
                        box_xyxy=(round(xmin, 1), round(ymin, 1), round(xmax, 1), round(ymax, 1)),
                        box_normalized=norm_box,
                        consensus=bool(item.get("consensus", False)),
                        metrics=metrics_obj
                    )
                )

        inference_time_ms = round((time.time() - start_time) * 1000, 2)

        return InferenceResponse(
            model_version=MODEL_VERSION,
            inference_time_ms=inference_time_ms,
            detections_count=len(detections),
            precision_mode=precision_mode,
            detections=detections
        )

detector = RoadDamageDetector()
