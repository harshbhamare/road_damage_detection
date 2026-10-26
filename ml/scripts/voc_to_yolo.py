"""
Pascal VOC to YOLO Format Converter for Road Damage Dataset.
Converts XML bounding boxes into normalized txt format: <class_id> <x_center> <y_center> <width> <height>
"""

import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

CLASS_TO_ID = {
    "D00": 0, # Longitudinal Crack
    "D10": 1, # Transverse Crack
    "D20": 2, # Alligator Crack
    "D40": 3  # Pothole
}

def convert_voc_to_yolo(xml_dir: Path, img_dir: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    xml_files = list(xml_dir.glob("*.xml"))
    print(f"[Converter] Converting {len(xml_files)} VOC XML annotations to YOLO format...")

    converted_count = 0
    box_count = 0

    for xml_file in xml_files:
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()

            # Find corresponding image dimensions
            size_elem = root.find("size")
            if size_elem is not None:
                img_w = float(size_elem.find("width").text)
                img_h = float(size_elem.find("height").text)
            else:
                img_path = img_dir / f"{xml_file.stem}.jpg"
                if not img_path.exists():
                    continue
                with Image.open(img_path) as img:
                    img_w, img_h = img.size

            yolo_lines = []

            for obj in root.findall("object"):
                name = obj.find("name").text.strip()
                if name not in CLASS_TO_ID:
                    continue # Skip extraneous non-damage classes

                cls_id = CLASS_TO_ID[name]
                bndbox = obj.find("bndbox")
                xmin = float(bndbox.find("xmin").text)
                ymin = float(bndbox.find("ymin").text)
                xmax = float(bndbox.find("xmax").text)
                ymax = float(bndbox.find("ymax").text)

                # Clamp to image boundaries
                xmin = max(0, min(xmin, img_w))
                xmax = max(0, min(xmax, img_w))
                ymin = max(0, min(ymin, img_h))
                ymax = max(0, min(ymax, img_h))

                box_w = xmax - xmin
                box_h = ymax - ymin
                if box_w <= 0 or box_h <= 0:
                    continue

                x_center = (xmin + (box_w / 2.0)) / img_w
                y_center = (ymin + (box_h / 2.0)) / img_h
                norm_w = box_w / img_w
                norm_h = box_h / img_h

                yolo_lines.append(f"{cls_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
                box_count += 1

            # Write YOLO txt file
            out_file = output_dir / f"{xml_file.stem}.txt"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write("\n".join(yolo_lines))

            converted_count += 1

        except Exception as e:
            print(f"[Converter Error] Failed on {xml_file.name}: {e}")

    print(f"✓ Successfully converted {converted_count} files ({box_count} bounding boxes) into {output_dir}\n")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python voc_to_yolo.py <path_to_xml_dir> <path_to_img_dir> <path_to_output_labels_dir>")
        sys.exit(1)

    xml_p = Path(sys.argv[1])
    img_p = Path(sys.argv[2])
    out_p = Path(sys.argv[3])
    convert_voc_to_yolo(xml_p, img_p, out_p)
