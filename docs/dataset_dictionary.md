# Dataset Dictionary: Road Damage Detection (RDD) Benchmark

This document establishes the official dataset taxonomy, annotation specifications, and ground-truth validation rules for the Road Damage Detection and Mapping Platform.

---

## 1. Official Taxonomy (IEEE Global Road Damage Detection Challenge)

The system aligns with the **RDD2020 / RDD2022** international benchmark datasets created by Sekilab / University of Tokyo.

| Damage Code | Class Name | Physical Description | Visual Characteristics | Severity Indicators |
| :--- | :--- | :--- | :--- | :--- |
| **`D00`** | Longitudinal Crack | Cracks running parallel to the direction of vehicle travel. | Typically found along wheel paths or road construction joints. Continuous linear line. | Width > 3mm, length > 1m |
| **`D10`** | Transverse Crack | Cracks running perpendicular to the direction of vehicle travel. | Stretches across the lane width, caused by thermal contraction or sub-base shrinkage. | Extends across entire lane or partial lane |
| **`D20`** | Alligator Crack | Interconnected series of cracks forming multi-sided polygon meshes. | Caused by fatigue failure of the asphalt under repeated traffic load. Looks like crocodile/alligator skin. | Area coverage and mesh block size |
| **`D40`** | Pothole | Bowl-shaped depression or cavity in the road pavement. | Structural loss of asphalt material creating sharp edges with depth, water pooling, or exposed gravel. | Diameter > 150mm, depth > 25mm |

*Note on excluded categories*: In some RDD subsets, additional classes such as `D43` (crosswalk blur) or `D44` (lane line blur) exist. For our core platform, we focus strictly on physical pavement distresses (`D00`, `D10`, `D20`, `D40`).

---

## 2. Annotation Formats

### 2.1 Pascal VOC (XML Format)
Original RDD2020/2022 raw annotations are provided as Pascal VOC XML files:
```xml
<annotation>
    <folder>images</folder>
    <filename>India_000123.jpg</filename>
    <size>
        <width>720</width>
        <height>720</height>
        <depth>3</depth>
    </size>
    <object>
        <name>D40</name>
        <bndbox>
            <xmin>150</xmin>
            <ymin>320</ymin>
            <xmax>310</xmax>
            <ymax>480</ymax>
        </bndbox>
    </object>
</annotation>
```

### 2.2 YOLOv8 Format (Normalized `.txt`)
For training in Google Colab with Ultralytics YOLOv8, annotations must be converted to normalized coordinates:
```text
<class_id> <x_center> <y_center> <width> <height>
```
Where:
- `class_id`: 0 (`D00`), 1 (`D10`), 2 (`D20`), 3 (`D40`)
- `x_center = ((xmin + xmax) / 2) / image_width`
- `y_center = ((ymin + ymax) / 2) / image_height`
- `width = (xmax - xmin) / image_width`
- `height = (ymax - ymin) / image_height`

---

## 3. Dataset Preprocessing & Quality Assurance Protocol

Before any model training:
1. **Corrupt File Verification**: Ensure all image files can be parsed by `PIL.Image.verify()` and `cv2.imread()`.
2. **Annotation Boundary Check**: Verify that `xmin < xmax` and `ymin < ymax`, and that all coordinates are strictly within `[0, image_width]` and `[0, image_height]`.
3. **Empty Annotation Handling**: Filter or isolate images with zero annotations to be used only as background negative samples in controlled ratios (typically 5-10%).
4. **Class Imbalance Audit**: Report the class frequency distribution. In typical RDD datasets, `D00` and `D20` are abundant, while `D40` (potholes) is more scarce, requiring weighted loss functions or targeted augmentation.
