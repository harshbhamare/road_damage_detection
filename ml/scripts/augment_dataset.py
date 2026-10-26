"""
Road Distress Data Augmentation Engine.
Multiplies road damage training data by generating realistic asphalt distress variations:
1. Tree & Bridge Shadow Projections (reduces shadow-induced crack false positives)
2. Wet Asphalt Specular Reflections & Puddle Glare
3. Vehicle Vibration & Motion Blur
4. Photometric Contrast & Overcast Lighting Shifts
5. Horizontal Flips with correct YOLO coordinate inversion
"""

import os
import sys
import argparse
import random
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple

def apply_shadow(img: np.ndarray) -> np.ndarray:
    """Casts irregular or diagonal shadow strips across the pavement."""
    h, w = img.shape[:2]
    mask = np.ones((h, w), dtype=np.float32)

    num_shadows = random.randint(1, 3)
    for _ in range(num_shadows):
        # Generate random polygon for tree/bridge shadow
        x1 = random.randint(0, w)
        y1 = 0
        x2 = random.randint(0, w)
        y2 = h
        dx = random.randint(30, 200)

        pts = np.array([
            [x1, y1],
            [x1 + dx, y1],
            [x2 + dx, y2],
            [x2, y2]
        ], dtype=np.int32)

        shadow_intensity = random.uniform(0.40, 0.70)
        cv2.fillPoly(mask, [pts], shadow_intensity)

    # Blur mask boundary for realistic penumbra
    mask = cv2.GaussianBlur(mask, (31, 31), 0)
    out = img.astype(np.float32)
    for c in range(3):
        out[:, :, c] = np.clip(out[:, :, c] * mask, 0, 255)
    return out.astype(np.uint8)

def apply_wet_road_glare(img: np.ndarray) -> np.ndarray:
    """Simulates specular road surface wetness and water reflection."""
    h, w = img.shape[:2]
    out = img.copy().astype(np.float32)

    # Darken pavement base (water absorption)
    out = out * 0.85

    # Add localized specular highlights
    num_glares = random.randint(1, 2)
    for _ in range(num_glares):
        cx = random.randint(int(0.2 * w), int(0.8 * w))
        cy = random.randint(int(0.4 * h), int(0.9 * h))
        axes = (random.randint(40, 150), random.randint(20, 60))
        angle = random.randint(-30, 30)

        glare_mask = np.zeros((h, w), dtype=np.float32)
        cv2.ellipse(glare_mask, (cx, cy), axes, angle, 0, 360, 1.0, -1)
        glare_mask = cv2.GaussianBlur(glare_mask, (51, 51), 0)

        for c in range(3):
            out[:, :, c] += glare_mask * random.randint(40, 80)

    return np.clip(out, 0, 255).astype(np.uint8)

def apply_motion_blur(img: np.ndarray) -> np.ndarray:
    """Simulates vehicle camera vibration."""
    size = random.choice([3, 5])
    kernel = np.zeros((size, size))
    kernel[int((size - 1) / 2), :] = np.ones(size)
    kernel = kernel / size
    return cv2.filter2D(img, -1, kernel)

def apply_horizontal_flip(img: np.ndarray, bboxes: List[str]) -> Tuple[np.ndarray, List[str]]:
    """Flips image horizontally and inverts YOLO x_center: x_new = 1.0 - x_old."""
    flipped_img = cv2.flip(img, 1)
    new_bboxes = []
    for line in bboxes:
        parts = line.strip().split()
        if len(parts) >= 5:
            cid = parts[0]
            cx, cy, bw, bh = map(float, parts[1:5])
            new_cx = max(0.0, min(1.0, 1.0 - cx))
            new_bboxes.append(f"{cid} {new_cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
    return flipped_img, new_bboxes

def augment_dataset(
    dataset_dir: Path,
    multiplier: int = 3,
    target_split: str = "train"
):
    """
    Reads the target split of a YOLO dataset, applies road augmentations,
    and multiplies the training data.
    """
    img_dir = dataset_dir / "images" / target_split
    lbl_dir = dataset_dir / "labels" / target_split

    if not img_dir.exists() or not lbl_dir.exists():
        print(f"Error: Target directory not found: {img_dir}")
        sys.exit(1)

    img_files = [p for p in img_dir.glob("*") if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]]
    print(f"\n[Augmenter] Found {len(img_files)} original images in '{target_split}' split.")
    print(f"[Augmenter] Generating {multiplier}x augmented distress variants...")

    generated_count = 0

    for img_p in img_files:
        lbl_p = lbl_dir / f"{img_p.stem}.txt"
        if not lbl_p.exists():
            continue

        with open(lbl_p, "r", encoding="utf-8") as f:
            bboxes = [l.strip() for l in f if l.strip()]

        if not bboxes:
            continue

        raw_img = cv2.imread(str(img_p))
        if raw_img is None:
            continue

        for i in range(multiplier):
            aug_img = raw_img.copy()
            cur_bboxes = list(bboxes)

            aug_type = random.choice(["shadow", "wet", "blur", "flip_shadow", "flip_wet"])

            if "flip" in aug_type:
                aug_img, cur_bboxes = apply_horizontal_flip(aug_img, cur_bboxes)

            if "shadow" in aug_type:
                aug_img = apply_shadow(aug_img)
            elif "wet" in aug_type:
                aug_img = apply_wet_road_glare(aug_img)
            elif "blur" in aug_type:
                aug_img = apply_motion_blur(aug_img)

            # Save augmented image and label
            aug_name = f"{img_p.stem}_aug{i+1}_{aug_type}"
            out_img_path = img_dir / f"{aug_name}{img_p.suffix}"
            out_lbl_path = lbl_dir / f"{aug_name}.txt"

            cv2.imwrite(str(out_img_path), aug_img)
            with open(out_lbl_path, "w", encoding="utf-8") as f:
                f.write("\n".join(cur_bboxes) + "\n")

            generated_count += 1

    print(f"✓ Augmentation complete! Generated {generated_count} new synthetic training samples.")
    print(f"✓ Total training images now: {len(list(img_dir.glob('*.*')))}\n")

def main():
    parser = argparse.ArgumentParser(description="Road Distress Data Augmentation Engine")
    parser.add_argument("--dataset", type=str, default="./ml/data/rdd_dataset", help="Path to YOLO dataset root (containing data.yaml)")
    parser.add_argument("--multiplier", type=int, default=3, help="How many augmented variants to create per image")
    parser.add_argument("--split", type=str, default="train", help="Which split to augment (default: train)")
    args = parser.parse_args()

    augment_dataset(
        dataset_dir=Path(args.dataset),
        multiplier=args.multiplier,
        target_split=args.split
    )

if __name__ == "__main__":
    main()
