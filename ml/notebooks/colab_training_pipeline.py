"""
Google Colab Road Damage Detection Training Pipeline
Target Model: YOLOv8 Small (Ultralytics)
Classes: D00 (Longitudinal), D10 (Transverse), D20 (Alligator), D40 (Pothole)

Run this script directly in Google Colab with GPU runtime:
  !pip install ultralytics
  !python colab_training_pipeline.py --epochs 100 --batch 16 --data ./rdd_data.yaml
"""

import os
import argparse
import yaml
from pathlib import Path

def create_dataset_yaml(data_dir: str, output_path: str = "rdd_data.yaml"):
    """Generates the Ultralytics data.yaml configuration."""
    base = Path(data_dir).resolve()
    config = {
        "path": str(base),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {
            0: "D00_Longitudinal_Crack",
            1: "D10_Transverse_Crack",
            2: "D20_Alligator_Crack",
            3: "D40_Pothole"
        }
    }
    with open(output_path, "w") as f:
        yaml.dump(config, f, sort_keys=False)
    print(f"[Config] Generated YOLO data config at {output_path}")
    return output_path

def train_model(data_yaml: str, epochs: int = 100, batch_size: int = 16, img_size: int = 640):
    from ultralytics import YOLO
    import torch

    print(f"[Training] PyTorch Version: {torch.__version__}")
    print(f"[Training] CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"[Training] GPU: {torch.cuda.get_device_name(0)}")

    # Initialize YOLOv8 Small model pretrained on COCO
    model = YOLO("yolov8s.pt")

    # Train model
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        patience=20,
        save=True,
        device=0 if torch.cuda.is_available() else "cpu",
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        # Data augmentations specialized for wet roads, shadows, and dense potholes
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,       # Robust to dark asphalt, shadows, and water glare
        mosaic=1.0,      # Merges multiple road views for dense distress detection
        mixup=0.15,      # Blends textures to learn muddy water puddle boundaries
        fliplr=0.5,      # Horizontal flips
        scale=0.5,       # Multi-scale distress from close-up to distant
        project="road_damage_experiments",
        name="yolov8s_rdd"
    )

    print("\n[Evaluation] Validating trained model on validation split...")
    metrics = model.val()

    print("\n" + "="*50)
    print("        REAL EMPIRICAL EVALUATION METRICS")
    print("="*50)
    print(f"mAP@50:      {metrics.box.map50:.4f}")
    print(f"mAP@50-95:   {metrics.box.map:.4f}")
    print(f"Precision:   {metrics.box.mp:.4f}")
    print(f"Recall:      {metrics.box.mr:.4f}")
    print("="*50)

    # Export best model to ONNX format for efficient CPU production inference
    print("\n[Export] Exporting best model to ONNX...")
    best_pt = Path(results.save_dir) / "weights" / "best.pt"
    if best_pt.exists():
        exported_onnx = model.export(format="onnx", imgsz=img_size, dynamic=False)
        print(f"✓ Saved PyTorch best weights to: {best_pt}")
        print(f"✓ Saved ONNX exported weights to: {exported_onnx}")
        print("\nDeploy by copying best.pt to services/ml-service/weights/rdd_yolov8.pt")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Colab YOLOv8 Road Damage Training Pipeline")
    parser.add_argument("--data_dir", type=str, default="./rdd_dataset", help="Path to processed dataset root")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    args = parser.parse_args()

    yaml_path = create_dataset_yaml(args.data_dir)
    train_model(yaml_path, epochs=args.epochs, batch_size=args.batch, img_size=args.imgsz)
