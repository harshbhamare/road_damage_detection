# Road Damage Detection (RDD) Machine Learning & Training Workspace

This workspace contains the complete machine learning pipeline for high-precision roadway defect detection, automated data preparation, synthetic domain augmentation, and YOLOv8 training.

---

## 🎯 Model Precision Tuning & False Positive Elimination

The inference engine in `services/ml-service/app/services/detector.py` incorporates 6 post-processing stages to ensure high precision in municipal and highway audits:

1. **Calibrated Confidence Presets**:
   - **`high` (0.35 threshold)**: Strict enforcement for municipal repair tenders and claims. Eliminates phantom crack specks and shadow reflections.
   - **`balanced` (0.25 threshold)**: Standard baseline for automated municipal surveys.
   - **`sensitive` (0.15 threshold)**: Diagnostic mode to catch hairline or nascent distress.

2. **Cross-Class NMS (Inter-Class Conflict Resolution)**:
   - When different distress classes predict the same area (e.g. D40 Pothole vs D20 Alligator Crack at IoU $\ge 0.28$ or Containment $\ge 0.50$):
   - Confident pothole detections ($\ge 0.40$ conf) override crack ghost boxes.
   - Otherwise, the higher confidence prediction suppresses the lower confidence box.
   - **Guarantees zero duplicate conflicting labels on the same pavement surface.**

3. **Dual-Model Ensemble Agreement Boost**:
   - Cross-references the specialized pothole detector (`pothole_peterhdd.pt`) with the multiclass RDD model (`rdd_yolov8.pt`).
   - When both agree on D40 (IoU $\ge 0.25$), confidence is boosted by **$+0.12$** and flagged as `consensus: true` (displayed as `★ Ensemble Verified` in UI).

4. **Road Horizon & Vehicle Hood Exclusion**:
   - Upper 12% of the dashcam image (sky, trees, highway signs, oncoming truck cabs) is filtered out.
   - Bottom 3% of the image (car hood edges, windshield wiper tips) is filtered out.

5. **Geometric & Aspect Ratio Sanity Filters**:
   - Potholes (D40) must have aspect ratio $w/h \in [0.15, 7.0]$. Thin wires, lane shadow strips, or curb joins are suppressed.
   - Cracks with aspect ratio $> 16.0$ are suppressed.
   - Micro-noise specks ($< 16 \times 16$ px or $< 250$ px²) are filtered out unless confidence $\ge 0.70$.

6. **Cavity Boundary Snapping (`refine_pothole_box`)**:
   - OpenCV Otsu luminance and contour analysis checks that the interior is darker than the surrounding road before snapping to the cavity rim.

---

## 📂 Workspace Structure

- **`scripts/`**:
  - **`download_and_prep_data.py`**: Scans raw datasets (VOC XML or YOLO format), verifies image integrity, filters corrupt JPEGs, and generates 70/20/10 stratified train/val/test splits with `data.yaml`.
  - **`augment_dataset.py`**: Multiplies training data $3\times$ to $5\times$ using synthetic tree shadows, wet road specular glare, motion blur, and horizontal flip coordinate inversions.
  - **`train_yolo.py`**: Automated local or server YOLOv8 training script with AdamW, cosine LR, early stopping, ONNX export, and 1-click deployment.
  - **`verify_annotations.py`**: Audits Pascal VOC or YOLO annotation files for boundary errors or out-of-bounds coordinates.
  - **`voc_to_yolo.py`**: Pascal VOC XML to YOLO format converter.
- **`notebooks/`**:
  - **`02_colab_training_pipeline.ipynb`**: Complete Google Colab GPU notebook for 1-click training on free T4/V100/A100 GPUs.
- **`data/`**: Staging directory for local dataset splits (ignored by git).

---

## 🚀 How to Train on More Road Damage Data

### Method 1: Google Colab GPU Training (Recommended - 100% Free GPU)

1. Open [Google Colab](https://colab.research.google.com).
2. Click **File -> Upload notebook** and select [`ml/notebooks/02_colab_training_pipeline.ipynb`](file:///e:/Road%20Damage/ml/notebooks/02_colab_training_pipeline.ipynb).
3. Set runtime to GPU: **Runtime -> Change runtime type -> Hardware accelerator: T4 GPU**.
4. Run all cells:
   - Downloads/prepares IEEE RDD2020/2022 dataset.
   - Synthesizes wet pavement and shadow augmentations.
   - Trains YOLOv8s with AdamW and cosine learning rate.
   - Generates empirical validation metrics and PR curves.
5. The notebook automatically downloads `best.pt`.
6. Copy `best.pt` to `services/ml-service/weights/rdd_yolov8.pt` in this project.

---

### Method 2: Local GPU / CPU Training

#### Step 1: Prepare & Split Dataset
Place raw road images and annotations into `./ml/data/raw/` and run:
```bash
# Using the project's Python environment
services\ml-service\.venv\Scripts\python.exe ml/scripts/download_and_prep_data.py --source ./ml/data/raw --output ./ml/data/rdd_dataset
```

#### Step 2: Augment Training Data (Multiply 3x - 5x)
```bash
services\ml-service\.venv\Scripts\python.exe ml/scripts/augment_dataset.py --dataset ./ml/data/rdd_dataset --multiplier 3
```

#### Step 3: Run YOLOv8 Training
```bash
services\ml-service\.venv\Scripts\python.exe ml/scripts/train_yolo.py --data ./ml/data/rdd_dataset/data.yaml --model yolov8s.pt --epochs 50 --batch 16 --deploy
```
*(Passing `--deploy` will automatically copy the resulting `best.pt` directly into `services/ml-service/weights/rdd_yolov8.pt`!)*

---

## 📚 Recommended Datasets to Expand Training

1. **IEEE BigData Global Road Damage Detection Challenge (RDD2020 / RDD2022)**:
   - Covers 26,000+ dashcam roadway images from India, Japan, Czech Republic, and USA.
   - Classes: D00 (Longitudinal), D10 (Transverse), D20 (Alligator), D40 (Pothole).
   - [Official Challenge Portal](https://github.com/sekilab/RoadDamageDetector)
2. **Kaggle Pothole Detection Dataset**:
   - High-resolution road depressions and craters in varying weather conditions.
3. **CRACK500 Benchmark**:
   - 500 high-resolution road pavement crack images with dense pixel annotations.
4. **Roboflow Road Distress Universe**:
   - Ready-to-use YOLOv8 formatted road defect datasets.
