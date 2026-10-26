# Model Weights Directory

This directory stores trained model weight files for local or containerized inference.

## Weight File Formats Supported:
1. **PyTorch YOLOv8 Weights**: `rdd_yolov8.pt` (trained in Google Colab)
2. **ONNX Export**: `rdd_yolov8.onnx` (for lightweight, CPU-optimized production inference)

## How to Deploy Model Weights:
1. Complete training in Google Colab (`ml/notebooks/02_colab_training_pipeline.ipynb`).
2. Download the resulting `best.pt` file from Colab's `runs/detect/train/weights/best.pt`.
3. Rename and place the file here: `services/ml-service/weights/rdd_yolov8.pt`.
4. (Optional) Run ONNX export: `yolo export model=services/ml-service/weights/rdd_yolov8.pt format=onnx`.

*Note*: Weight files (`.pt`, `.onnx`) are ignored by Git via the root `.gitignore`.
