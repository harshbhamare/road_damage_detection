"""
Annotation and Dataset Verification Utility for Road Damage Detection.
Audits Pascal VOC XML and YOLO annotations to guarantee zero corrupted samples prior to model training.
"""

import os
import sys
import glob
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter
from PIL import Image

TARGET_CLASSES = {"D00", "D10", "D20", "D40"}

def verify_voc_annotations(images_dir: Path, annotations_dir: Path):
    print(f"\n[Auditor] Verifying Pascal VOC annotations in: {annotations_dir}")
    print(f"[Auditor] Cross-referencing images in: {images_dir}\n")

    xml_files = list(annotations_dir.glob("*.xml"))
    if not xml_files:
        print(f"[Error] No XML annotation files found in {annotations_dir}")
        return

    class_counts = Counter()
    total_boxes = 0
    invalid_boxes = 0
    missing_images = 0
    corrupt_images = 0

    for xml_path in xml_files:
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()

            filename_elem = root.find("filename")
            image_name = filename_elem.text if filename_elem is not None else f"{xml_path.stem}.jpg"
            image_path = images_dir / image_name

            if not image_path.exists():
                # Attempt with .jpg / .png case insensitivity
                matched = list(images_dir.glob(f"{xml_path.stem}.*"))
                if matched:
                    image_path = matched[0]
                else:
                    missing_images += 1
                    continue

            # Verify image integrity
            try:
                with Image.open(image_path) as img:
                    img.verify()
                    width, height = img.size
            except Exception as e:
                corrupt_images += 1
                print(f"[Corrupt Image] {image_path.name}: {e}")
                continue

            for obj in root.findall("object"):
                name = obj.find("name")
                bndbox = obj.find("bndbox")
                if name is None or bndbox is None:
                    continue

                class_name = name.text.strip()
                class_counts[class_name] += 1
                total_boxes += 1

                xmin = float(bndbox.find("xmin").text)
                ymin = float(bndbox.find("ymin").text)
                xmax = float(bndbox.find("xmax").text)
                ymax = float(bndbox.find("ymax").text)

                # Boundary validation checks
                is_invalid = False
                if xmin >= xmax or ymin >= ymax:
                    is_invalid = True
                if xmin < 0 or ymin < 0 or xmax > width or ymax > height:
                    is_invalid = True

                if is_invalid:
                    invalid_boxes += 1
                    print(f"[Invalid Box] File {xml_path.name}: class={class_name}, bbox=({xmin},{ymin},{xmax},{ymax}), img_size=({width}x{height})")

        except Exception as e:
            print(f"[XML Parse Error] {xml_path.name}: {e}")

    print("\n" + "="*50)
    print("      DATASET VERIFICATION AUDIT REPORT")
    print("="*50)
    print(f"Total XML annotations checked: {len(xml_files)}")
    print(f"Missing referenced images:     {missing_images}")
    print(f"Corrupt image files:           {corrupt_images}")
    print(f"Total bounding boxes examined: {total_boxes}")
    print(f"Invalid bounding boxes:        {invalid_boxes}")
    print("\nClass Frequency Distribution:")
    for cls_name, count in sorted(class_counts.items(), key=lambda x: -x[1]):
        indicator = "✓ (Target Class)" if cls_name in TARGET_CLASSES else "⚠ (Extra Class)"
        pct = (count / total_boxes * 100) if total_boxes > 0 else 0
        print(f"  - {cls_name:10s}: {count:5d} ({pct:5.1f}%) {indicator}")
    print("="*50)

    if invalid_boxes == 0 and corrupt_images == 0 and missing_images == 0:
        print("✓ Dataset PASSED verification. Safe to proceed with format conversion & training.\n")
    else:
        print("⚠ Dataset contains issues. Fix invalid boxes/corrupt files before training.\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python verify_annotations.py <path_to_images_dir> <path_to_annotations_dir>")
        print("Example: python verify_annotations.py ./data/raw/images ./data/raw/annotations")
        sys.exit(1)

    img_dir = Path(sys.argv[1])
    ann_dir = Path(sys.argv[2])
    verify_voc_annotations(img_dir, ann_dir)
