"""
Local & Server YOLOv8 Road Damage Detection Training & Fine-Tuning Pipeline.
Trains on road damage datasets with optimal distress hyperparameters,
generates validation metrics, exports to ONNX, and can automatically deploy to ML service.
"""

import os
import sys
import argparse
import shutil
from pathlib import Path

def train(
    data_yaml: str,
    base_model: str = "yolov8s.pt",
    epochs: int = 100,
    batch_size: int = 16,
    img_size: int = 640,
    device: str = "auto",
    deploy: bool = False,
    project_dir: str = "./ml/runs/train"
):
    try:
        from ultralytics import YOLO
        import torch
    except ImportError:
        print("Error: ultralytics is required. Run: pip install ultralytics")
        sys.exit(1)

    yaml_p = Path(data_yaml).resolve()
    if not yaml_p.exists():
        print(f"Error: Dataset configuration file not found: {yaml_p}")
        sys.exit(1)

    # Determine execution device
    if device == "auto":
        target_device = 0 if torch.cuda.is_available() else "cpu"
    else:
        target_device = device

    print("=" * 60)
    print("      ROAD DAMAGE DETECTION YOLOv8 TRAINING PIPELINE")
    print("=" * 60)
    print(f"Dataset Config:     {yaml_p}")
    print(f"Base Model:         {base_model}")
    print(f"Epochs:             {epochs}")
    print(f"Batch Size:         {batch_size}")
    print(f"Image Resolution:   {img_size}x{img_size}")
    print(f"PyTorch Version:    {torch.__version__}")
    print(f"CUDA Available:     {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU Accelerator:    {torch.cuda.get_device_name(0)}")
    print(f"Target Device:      {target_device}")
    print("=" * 60 + "\n")

    # Initialize model (pre-trained COCO or fine-tuning existing RDD weights)
    print(f"[Training] Initializing model weights from: {base_model}")
    model = YOLO(base_model)

    # Execute training with road-distress-optimized hyperparameters
    print("[Training] Commencing training run...")
    results = model.train(
        data=str(yaml_p),
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=target_device,
        patience=20,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        cos_lr=True,
        # Asphalt domain augmentations
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,       # Robust to deep asphalt shadows and midday sun
        mosaic=1.0,      # Combines 4 road scenes for dense distress detection
        mixup=0.15,      # Blends road textures
        fliplr=0.5,      # Horizontal reflection
        scale=0.5,       # Multi-scale distress (near vs distant defects)
        project=project_dir,
        name="rdd_experiment",
        save=True,
        verbose=True
    )

    print("\n[Evaluation] Validating model on validation split...")
    metrics = model.val()

    print("\n" + "=" * 50)
    print("      FINAL EMPIRICAL MODEL METRICS")
    print("=" * 50)
    print(f"mAP@50:       {metrics.box.map50:.4f}")
    print(f"mAP@50-95:    {metrics.box.map:.4f}")
    print(f"Precision:    {metrics.box.mp:.4f}")
    print(f"Recall:       {metrics.box.mr:.4f}")
    print("=" * 50 + "\n")

    # Locate saved best weights
    best_pt = Path(results.save_dir) / "weights" / "best.pt"
    if not best_pt.exists():
        print(f"Warning: Could not locate weights at {best_pt}")
        return

    print(f"✓ Trained PyTorch weights saved to: {best_pt.resolve()}")

    # Export to ONNX format
    try:
        print("[Export] Exporting best model to ONNX for fast inference...")
        onnx_path = model.export(format="onnx", imgsz=img_size, dynamic=False)
        print(f"✓ Exported ONNX model saved to: {onnx_path}")
    except Exception as e:
        print(f"[Export Notice] ONNX export warning: {e}")

    # Automated deployment to ml-service if requested
    if deploy:
        weights_dir = Path(__file__).resolve().parent.parent.parent / "services" / "ml-service" / "weights"
        if weights_dir.exists():
            dest_pt = weights_dir / "rdd_yolov8.pt"
            shutil.copy2(best_pt, dest_pt)
            print(f"\n🚀 DEPLOYED: Copied {best_pt.name} to {dest_pt.resolve()}")
            print("Restart or re-run inference to use your newly trained model!")

def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 Road Damage Model")
    parser.add_argument("--data", type=str, default="./ml/data/rdd_dataset/data.yaml", help="Path to data.yaml")
    parser.add_argument("--model", type=str, default="yolov8s.pt", help="Base model (yolov8n.pt, yolov8s.pt, or path to checkpoint)")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    parser.add_argument("--device", type=str, default="auto", help="Device (auto, cpu, 0, 1)")
    parser.add_argument("--deploy", action="store_true", help="Auto-copy best.pt into services/ml-service/weights/rdd_yolov8.pt")
    args = parser.parse_args()

    train(
        data_yaml=args.data,
        base_model=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        deploy=args.deploy
    )

if __name__ == "__main__":
    main()
