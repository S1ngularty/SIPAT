
from pathlib import Path
from collections import Counter, defaultdict
import hashlib
import math

import yaml
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/main"
)

OUTPUT_PATH = DATASET_PATH / "analytics_report"

SPLITS = ("train", "valid", "test")

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff"
}

EXPECTED_LABEL_FIELDS = 5
BOUNDARY_TOLERANCE = 1e-6


# ============================================================
# CONFIGURATION HELPERS
# ============================================================

def print_section(title):
    print("\n" + "=" * 75)
    print(title)
    print("=" * 75)


def load_class_names():
    yaml_candidates = [
        DATASET_PATH / "data.yaml",
        DATASET_PATH / "data.yml",
    ]

    yaml_path = next(
        (path for path in yaml_candidates if path.exists()),
        None,
    )

    if yaml_path is None:
        raise FileNotFoundError(
            f"No data.yaml or data.yml found in {DATASET_PATH}"
        )

    with open(yaml_path, "r", encoding="utf-8") as file:
        config = yaml.safe_load(file)

    names = config.get("names")

    if isinstance(names, dict):
        names = [
            names[key]
            for key in sorted(names, key=lambda key: int(key))
        ]

    if not isinstance(names, list) or not names:
        raise ValueError(
            "The dataset YAML must define class names under 'names'."
        )

    names = [str(name) for name in names]

    print(f"Dataset configuration: {yaml_path}")
    print(f"Number of classes: {len(names)}")

    for class_id, name in enumerate(names):
        print(f"  {class_id}: {name}")

    return names


def find_image_directory(split):
    candidates = [
        DATASET_PATH / split / "images",
        DATASET_PATH / "images" / split,
    ]

    return next(
        (path for path in candidates if path.is_dir()),
        None,
    )


def find_label_directory(split, image_dir):
    if image_dir is None:
        return None

    candidates = [
        image_dir.parent / "labels",
        DATASET_PATH / split / "labels",
        DATASET_PATH / "labels" / split,
    ]

    return next(
        (path for path in candidates if path.is_dir()),
        None,
    )


def matching_label_path(image_path, image_dir, label_dir):
    if label_dir is None:
        return None

    relative_path = image_path.relative_to(image_dir)
    return (label_dir / relative_path).with_suffix(".txt")


def sha256_file(path):
    digest = hashlib.sha256()

    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


# ============================================================
# YOLO DETECTION LABEL VALIDATION
# ============================================================

def validate_yolo_detection_line(parts, class_count):
    """
    Expected YOLO detection format:

    class_id x_center y_center width height

    Coordinates must be normalized between 0 and 1.
    """

    if len(parts) != EXPECTED_LABEL_FIELDS:
        return False, (
            f"Expected 5 fields, received {len(parts)}"
        ), None

    try:
        class_id = int(parts[0])

        if str(class_id) != parts[0]:
            return False, "Class ID must be an integer", None

        x_center, y_center, width, height = map(
            float, parts[1:]
        )

    except (ValueError, OverflowError):
        return False, "Malformed or non-numeric annotation", None

    coordinates = [x_center, y_center, width, height]

    if not all(math.isfinite(value) for value in coordinates):
        return False, "Coordinates must be finite", None

    if not 0 <= class_id < class_count:
        return False, f"Invalid class ID: {class_id}", None

    if not all(
        -BOUNDARY_TOLERANCE <= value <= 1 + BOUNDARY_TOLERANCE
        for value in (x_center, y_center)
    ):
        return False, "Center coordinates outside [0, 1]", None

    if not 0 < width <= 1 + BOUNDARY_TOLERANCE:
        return False, "Width must be greater than 0 and at most 1", None

    if not 0 < height <= 1 + BOUNDARY_TOLERANCE:
        return False, "Height must be greater than 0 and at most 1", None

    x_min = x_center - width / 2
    x_max = x_center + width / 2
    y_min = y_center - height / 2
    y_max = y_center + height / 2

    if (
        x_min < -BOUNDARY_TOLERANCE
        or y_min < -BOUNDARY_TOLERANCE
        or x_max > 1 + BOUNDARY_TOLERANCE
        or y_max > 1 + BOUNDARY_TOLERANCE
    ):
        return False, "Bounding box extends outside image", None

    return True, "Valid", {
        "class_id": class_id,
        "x_center": x_center,
        "y_center": y_center,
        "width": width,
        "height": height,
        "area": width * height,
    }


# ============================================================
# SPLIT SCANNING
# ============================================================

def scan_split(split, class_names):
    print_section(f"SCANNING {split.upper()}")

    image_dir = find_image_directory(split)

    if image_dir is None:
        print(f"WARNING: Image directory for '{split}' not found.")

        return {
            "split": split,
            "image_dir": None,
            "label_dir": None,
            "images": [],
            "summary": {
                "split": split,
                "image_count": 0,
                "valid_annotations": 0,
                "invalid_annotations": 0,
                "empty_label_files": 0,
                "missing_label_files": 0,
                "unreadable_images": 0,
            },
            "annotations": [],
            "invalid_lines": [],
            "empty_labels": [],
            "missing_labels": [],
            "unreadable_images": [],
            "class_counts": {},
            "class_image_counts": {},
        }

    label_dir = find_label_directory(split, image_dir)

    print(f"Image directory: {image_dir}")
    print(f"Label directory: {label_dir or 'NOT FOUND'}")

    image_paths = sorted(
        path for path in image_dir.rglob("*")
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
    )

    annotations = []
    invalid_lines = []
    empty_labels = []
    missing_labels = []
    unreadable_images = []
    image_hashes = []

    # Counts every valid bounding-box annotation.
    class_counts = Counter()

    # Counts images containing each class, once per class per image.
    class_image_counts = Counter()

    for image_path in image_paths:
        relative_path = str(image_path.relative_to(image_dir))

        try:
            with Image.open(image_path) as image:
                image_width, image_height = image.size
                image.verify()

            image_hashes.append({
                "split": split,
                "image": str(image_path),
                "relative_path": relative_path,
                "sha256": sha256_file(image_path),
            })

        except Exception as error:
            unreadable_images.append({
                "split": split,
                "image": str(image_path),
                "error": str(error),
            })
            continue

        label_path = matching_label_path(
            image_path, image_dir, label_dir
        )

        if label_path is None or not label_path.exists():
            missing_labels.append({
                "split": split,
                "image": str(image_path),
                "label": str(label_path) if label_path else "",
            })
            continue

        try:
            label_text = label_path.read_text(
                encoding="utf-8-sig"
            )
        except Exception as error:
            invalid_lines.append({
                "split": split,
                "image": str(image_path),
                "label": str(label_path),
                "line_number": 0,
                "line": "",
                "reason": f"Could not read label: {error}",
            })
            continue

        nonempty_lines = [
            (line_number, line.strip())
            for line_number, line in enumerate(
                label_text.splitlines(), start=1
            )
            if line.strip()
        ]

        if not nonempty_lines:
            empty_labels.append({
                "split": split,
                "image": str(image_path),
                "label": str(label_path),
            })
            continue

        # Unique class IDs present in this image.
        image_classes = set()

        for line_number, line in nonempty_lines:
            parts = line.split()

            valid, reason, parsed = validate_yolo_detection_line(
                parts, len(class_names)
            )

            if not valid:
                invalid_lines.append({
                    "split": split,
                    "image": str(image_path),
                    "label": str(label_path),
                    "line_number": line_number,
                    "line": line,
                    "reason": reason,
                })
                continue

            class_id = parsed["class_id"]
            class_name = class_names[class_id]

            class_counts[class_id] += 1
            image_classes.add(class_id)

            annotations.append({
                "split": split,
                "image": str(image_path),
                "label": str(label_path),
                "line_number": line_number,
                "class_id": class_id,
                "class_name": class_name,
                "x_center": parsed["x_center"],
                "y_center": parsed["y_center"],
                "width": parsed["width"],
                "height": parsed["height"],
                "area": parsed["area"],
                "image_width": image_width,
                "image_height": image_height,
            })

        # Count this image once for each class it contains.
        for class_id in image_classes:
            class_image_counts[class_id] += 1

    summary = {
        "split": split,
        "image_count": len(image_paths),
        "label_directory_found": label_dir is not None,
        "valid_annotations": len(annotations),
        "invalid_annotations": len(invalid_lines),
        "empty_label_files": len(empty_labels),
        "missing_label_files": len(missing_labels),
        "unreadable_images": len(unreadable_images),
    }

    print(f"\nImages: {summary['image_count']}")
    print(f"Valid annotations: {summary['valid_annotations']}")
    print(f"Invalid annotation lines: {summary['invalid_annotations']}")
    print(f"Empty label files: {summary['empty_label_files']}")
    print(f"Missing label files: {summary['missing_label_files']}")
    print(f"Unreadable images: {summary['unreadable_images']}")

    print("\nImage count per class:")

    for class_id, class_name in enumerate(class_names):
        print(
            f"  {class_name}: "
            f"{class_image_counts[class_id]} images, "
            f"{class_counts[class_id]} annotations"
        )

    return {
        "split": split,
        "image_dir": image_dir,
        "label_dir": label_dir,
        "images": image_hashes,
        "summary": summary,
        "annotations": annotations,
        "invalid_lines": invalid_lines,
        "empty_labels": empty_labels,
        "missing_labels": missing_labels,
        "unreadable_images": unreadable_images,
        "class_counts": dict(class_counts),
        "class_image_counts": dict(class_image_counts),
    }


# ============================================================
# DUPLICATE DETECTION
# ============================================================

def analyze_duplicates(results):
    print_section("DUPLICATE IMAGE ANALYSIS")

    hash_groups = defaultdict(list)

    for result in results:
        for image in result["images"]:
            hash_groups[image["sha256"]].append(image)

    duplicate_groups = []
    cross_split_groups = []

    for digest, group in hash_groups.items():
        if len(group) < 2:
            continue

        splits_present = sorted({
            item["split"] for item in group
        })

        record = {
            "sha256": digest,
            "duplicate_count": len(group),
            "splits": ", ".join(splits_present),
            "images": " | ".join(
                item["image"] for item in group
            ),
        }

        duplicate_groups.append(record)

        if len(splits_present) > 1:
            cross_split_groups.append(record)

    print(f"Exact duplicate groups: {len(duplicate_groups)}")
    print(f"Cross-split duplicate groups: {len(cross_split_groups)}")

    return duplicate_groups, cross_split_groups


# ============================================================
# CSV EXPORTS
# ============================================================

def save_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)

    if rows:
        pd.DataFrame(rows).to_csv(path, index=False)
    else:
        pd.DataFrame().to_csv(path, index=False)


def export_reports(results, class_names, duplicate_groups,
                   cross_split_groups):
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

    all_annotations = [
        item
        for result in results
        for item in result["annotations"]
    ]

    all_invalid = [
        item
        for result in results
        for item in result["invalid_lines"]
    ]

    all_empty = [
        item
        for result in results
        for item in result["empty_labels"]
    ]

    all_missing = [
        item
        for result in results
        for item in result["missing_labels"]
    ]

    all_unreadable = [
        item
        for result in results
        for item in result["unreadable_images"]
    ]

    # --------------------------------------------------------
    # Split summary
    # --------------------------------------------------------

    save_csv(
        OUTPUT_PATH / "split_summary.csv",
        [result["summary"] for result in results],
    )

    # --------------------------------------------------------
    # Annotation-level reports
    # --------------------------------------------------------

    save_csv(
        OUTPUT_PATH / "valid_annotations.csv",
        all_annotations,
    )

    save_csv(
        OUTPUT_PATH / "invalid_annotations.csv",
        all_invalid,
    )

    save_csv(
        OUTPUT_PATH / "empty_label_files.csv",
        all_empty,
    )

    save_csv(
        OUTPUT_PATH / "missing_label_files.csv",
        all_missing,
    )

    save_csv(
        OUTPUT_PATH / "unreadable_images.csv",
        all_unreadable,
    )

    save_csv(
        OUTPUT_PATH / "duplicate_images.csv",
        duplicate_groups,
    )

    save_csv(
        OUTPUT_PATH / "cross_split_duplicates.csv",
        cross_split_groups,
    )

    # --------------------------------------------------------
    # Image count and annotation count per class
    # --------------------------------------------------------

    class_rows = []

    for class_id, class_name in enumerate(class_names):
        row = {
            "class_id": class_id,
            "class_name": class_name,
        }

        total_image_occurrences = 0
        total_annotations = 0

        for split in SPLITS:
            result = next(
                (
                    item for item in results
                    if item["split"] == split
                ),
                None,
            )

            if result is None:
                image_count = 0
                annotation_count = 0
            else:
                image_count = result["class_image_counts"].get(
                    class_id, 0
                )

                annotation_count = result["class_counts"].get(
                    class_id, 0
                )

            row[f"{split}_image_count"] = image_count
            row[f"{split}_annotation_count"] = annotation_count

            total_image_occurrences += image_count
            total_annotations += annotation_count

        row["total_image_count"] = total_image_occurrences
        row["total_annotation_count"] = total_annotations

        class_rows.append(row)

    save_csv(
        OUTPUT_PATH / "class_distribution.csv",
        class_rows,
    )

    print_section("REPORTS EXPORTED")

    print(f"Output directory: {OUTPUT_PATH}")

    for path in sorted(OUTPUT_PATH.glob("*.csv")):
        print(f"  {path.name}")


# ============================================================
# VISUALIZATIONS
# ============================================================

def create_charts(results, class_names):
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

    all_annotations = [
        annotation
        for result in results
        for annotation in result["annotations"]
    ]

    if not all_annotations:
        print("No valid annotations available for charts.")
        return

    class_ids = range(len(class_names))

    # --------------------------------------------------------
    # 1. Annotation count per class
    # --------------------------------------------------------

    annotation_counts = Counter(
        item["class_id"] for item in all_annotations
    )

    plt.figure(figsize=(12, 6))
    plt.bar(
        class_names,
        [annotation_counts[class_id] for class_id in class_ids],
    )
    plt.title("Annotation Count Per Class")
    plt.xlabel("Class")
    plt.ylabel("Bounding-Box Annotation Count")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(
        OUTPUT_PATH / "class_annotation_counts.png",
        dpi=160,
    )
    plt.close()

    # --------------------------------------------------------
    # 2. Image count per class across train, valid and test
    # --------------------------------------------------------

    x = list(range(len(class_names)))
    width = 0.25

    plt.figure(figsize=(13, 6))

    for index, split in enumerate(SPLITS):
        result = next(
            (item for item in results if item["split"] == split),
            None,
        )

        counts = (
            result["class_image_counts"]
            if result is not None else {}
        )

        values = [counts.get(class_id, 0) for class_id in class_ids]

        offsets = [
            value + (index - 1) * width for value in x
        ]

        plt.bar(offsets, values, width=width, label=split)

    plt.title("Number of Images Containing Each Class")
    plt.xlabel("Class")
    plt.ylabel("Image Count")
    plt.xticks(x, class_names, rotation=45, ha="right")
    plt.legend()
    plt.tight_layout()
    plt.savefig(
        OUTPUT_PATH / "class_image_counts_by_split.png",
        dpi=160,
    )
    plt.close()

    # --------------------------------------------------------
    # 3. Bounding-box area distribution
    # --------------------------------------------------------

    areas = [item["area"] for item in all_annotations]

    plt.figure(figsize=(9, 5))
    plt.hist(areas, bins=40)
    plt.title("Normalized Bounding-Box Area Distribution")
    plt.xlabel("Normalized Area (width × height)")
    plt.ylabel("Annotation Count")
    plt.tight_layout()
    plt.savefig(
        OUTPUT_PATH / "bbox_area_distribution.png",
        dpi=160,
    )
    plt.close()

    # --------------------------------------------------------
    # 4. Bounding-box width vs height
    # --------------------------------------------------------

    widths = [item["width"] for item in all_annotations]
    heights = [item["height"] for item in all_annotations]

    plt.figure(figsize=(8, 7))
    plt.scatter(widths, heights, alpha=0.4)
    plt.title("Bounding-Box Width vs Height")
    plt.xlabel("Normalized Width")
    plt.ylabel("Normalized Height")
    plt.tight_layout()
    plt.savefig(
        OUTPUT_PATH / "bbox_width_vs_height.png",
        dpi=160,
    )
    plt.close()

    # --------------------------------------------------------
    # 5. Valid vs invalid annotation lines by split
    # --------------------------------------------------------

    split_names = [result["split"] for result in results]

    valid_counts = [
        result["summary"]["valid_annotations"]
        for result in results
    ]

    invalid_counts = [
        result["summary"]["invalid_annotations"]
        for result in results
    ]

    x_positions = list(range(len(split_names)))

    plt.figure(figsize=(8, 5))
    plt.bar(x_positions, valid_counts, label="Valid annotations")
    plt.bar(
        x_positions,
        invalid_counts,
        bottom=valid_counts,
        label="Invalid annotations",
    )
    plt.title("Annotation Validation by Split")
    plt.xlabel("Split")
    plt.ylabel("Annotation Line Count")
    plt.xticks(x_positions, split_names)
    plt.legend()
    plt.tight_layout()
    plt.savefig(
        OUTPUT_PATH / "annotation_health.png",
        dpi=160,
    )
    plt.close()

    print("\nCharts generated:")
    for path in sorted(OUTPUT_PATH.glob("*.png")):
        print(f"  {path.name}")


# ============================================================
# MAIN
# ============================================================

def main():
    print_section("YOLO26 OBJECT DETECTION DATASET ANALYTICS")

    if not DATASET_PATH.is_dir():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {DATASET_PATH}"
        )

    class_names = load_class_names()

    results = [
        scan_split(split, class_names)
        for split in SPLITS
    ]

    duplicate_groups, cross_split_groups = analyze_duplicates(
        results
    )

    export_reports(
        results,
        class_names,
        duplicate_groups,
        cross_split_groups,
    )

    create_charts(results, class_names)

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------

    print_section("FINAL SUMMARY")

    total_images = sum(
        result["summary"]["image_count"]
        for result in results
    )

    total_valid = sum(
        result["summary"]["valid_annotations"]
        for result in results
    )

    total_invalid = sum(
        result["summary"]["invalid_annotations"]
        for result in results
    )

    total_empty = sum(
        result["summary"]["empty_label_files"]
        for result in results
    )

    total_missing = sum(
        result["summary"]["missing_label_files"]
        for result in results
    )

    total_unreadable = sum(
        result["summary"]["unreadable_images"]
        for result in results
    )

    print(f"Total images:                 {total_images}")
    print(f"Valid annotations:            {total_valid}")
    print(f"Invalid annotation lines:     {total_invalid}")
    print(f"Empty label files:            {total_empty}")
    print(f"Missing label files:          {total_missing}")
    print(f"Unreadable images:            {total_unreadable}")
    print(f"Exact duplicate groups:       {len(duplicate_groups)}")
    print(f"Cross-split duplicate groups: {len(cross_split_groups)}")

    print("\nImage count per class across all splits:")

    for class_id, class_name in enumerate(class_names):
        image_total = sum(
            result["class_image_counts"].get(class_id, 0)
            for result in results
        )

        annotation_total = sum(
            result["class_counts"].get(class_id, 0)
            for result in results
        )

        print(
            f"  {class_name}: "
            f"{image_total} image-class occurrences, "
            f"{annotation_total} annotations"
        )

    print(f"\nReports saved to: {OUTPUT_PATH}")

    if total_invalid:
        print(
            "\nWARNING: Invalid annotations exist. "
            "Review invalid_annotations.csv."
        )

    if total_missing:
        print(
            "WARNING: Some images have no matching label file. "
            "Review missing_label_files.csv."
        )

    if cross_split_groups:
        print(
            "WARNING: Exact duplicate images cross dataset splits. "
            "Review cross_split_duplicates.csv."
        )

    print("\nAnalytics complete.")


if __name__ == "__main__":
    main()