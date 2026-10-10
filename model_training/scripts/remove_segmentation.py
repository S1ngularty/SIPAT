
from pathlib import Path
from collections import Counter
import argparse
import shutil


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_DIR = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/filtered_dataset"
)

SPLITS = ("train", "valid", "test")

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp"
}

# YOLO OBB: class + 8 coordinates = 9 fields
OBB_FIELD_COUNT = 9

QUARANTINE_DIR = DATASET_DIR / "_segmentation_quarantine"


# ============================================================
# CLASSIFICATION
# ============================================================

def classify_annotation(line):
    """
    Returns:
        'obb'          - structurally OBB-shaped (9 fields)
        'segmentation' - likely polygon segmentation
        'invalid'      - malformed or unrecognized

    IMPORTANT:
    A 9-field segmentation polygon is indistinguishable from
    OBB based on field count alone.
    """

    parts = line.split()

    if not parts:
        return "empty"

    try:
        class_id = int(parts[0])
    except ValueError:
        return "invalid"

    if class_id < 0:
        return "invalid"

    # Standard YOLO OBB format
    if len(parts) == OBB_FIELD_COUNT:
        try:
            coords = [float(value) for value in parts[1:]]
        except ValueError:
            return "invalid"

        if not all(map(lambda n: n == n and abs(n) != float("inf"), coords)):
            return "invalid"

        return "obb"

    # Likely YOLO segmentation:
    # class ID + 6 or more coordinate values,
    # an even number of coordinate values,
    # and therefore an odd total number of fields.
    if len(parts) > OBB_FIELD_COUNT and len(parts) % 2 == 1:
        try:
            coords = [float(value) for value in parts[1:]]
        except ValueError:
            return "invalid"

        if not all(map(lambda n: n == n and abs(n) != float("inf"), coords)):
            return "invalid"

        if len(coords) >= 6:
            return "segmentation"

    return "invalid"


# ============================================================
# IMAGE MATCHING
# ============================================================

def find_images(images_dir):
    """
    Index images by relative path without extension.
    This avoids accidentally matching identical filenames
    located in different subdirectories.
    """

    images = {}

    for path in images_dir.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            key = path.relative_to(images_dir).with_suffix("").as_posix()
            images.setdefault(key, []).append(path)

    return images


# ============================================================
# MAIN
# ============================================================

def main(apply_changes=False):
    if not DATASET_DIR.is_dir():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {DATASET_DIR}"
        )

    print("=" * 70)
    print("YOLO SEGMENTATION ANNOTATION CLEANER")
    print("=" * 70)
    print(f"Dataset: {DATASET_DIR}")
    print(f"Mode: {'APPLY CHANGES' if apply_changes else 'DRY RUN'}")
    print(f"Quarantine: {QUARANTINE_DIR}")
    print()

    totals = Counter()

    for split in SPLITS:
        images_dir = DATASET_DIR / split / "images"
        labels_dir = DATASET_DIR / split / "labels"

        if not images_dir.is_dir() or not labels_dir.is_dir():
            print(f"[SKIP] {split}: images/ or labels/ directory missing")
            continue

        print(f"\nScanning {split.upper()}...")

        image_index = find_images(images_dir)

        for label_path in sorted(labels_dir.rglob("*.txt")):
            totals["label_files_scanned"] += 1

            key = label_path.relative_to(labels_dir).with_suffix("").as_posix()
            matching_images = image_index.get(key, [])

            if not matching_images:
                totals["labels_without_images"] += 1
                print(f"[WARN] No matching image: {label_path}")
                continue

            if len(matching_images) > 1:
                totals["ambiguous_image_matches"] += 1
                print(f"[WARN] Multiple images match: {label_path}")
                continue

            image_path = matching_images[0]

            original_lines = label_path.read_text(
                encoding="utf-8-sig"
            ).splitlines()

            obb_lines = []
            segmentation_lines = []
            invalid_lines = []

            for line in original_lines:
                if not line.strip():
                    continue

                kind = classify_annotation(line)

                if kind == "obb":
                    obb_lines.append(line)
                elif kind == "segmentation":
                    segmentation_lines.append(line)
                else:
                    invalid_lines.append(line)

            if not segmentation_lines:
                continue

            totals["files_with_segmentation"] += 1
            totals["segmentation_lines_found"] += len(segmentation_lines)

            print(
                f"[FOUND] {split}/{key}: "
                f"{len(segmentation_lines)} segmentation-like line(s), "
                f"{len(obb_lines)} OBB line(s), "
                f"{len(invalid_lines)} unrecognized line(s)"
            )

            # Only quarantine the image if no OBB annotations remain
            # and there are no unrecognized lines requiring inspection.
            segmentation_only = (
                len(obb_lines) == 0
                and len(invalid_lines) == 0
            )

            if segmentation_only:
                totals["images_to_quarantine"] += 1

                if apply_changes:
                    relative_image = image_path.relative_to(DATASET_DIR)
                    relative_label = label_path.relative_to(DATASET_DIR)

                    target_image = QUARANTINE_DIR / relative_image
                    target_label = QUARANTINE_DIR / relative_label

                    target_image.parent.mkdir(parents=True, exist_ok=True)
                    target_label.parent.mkdir(parents=True, exist_ok=True)

                    if target_image.exists() or target_label.exists():
                        raise FileExistsError(
                            "Quarantine destination already exists. "
                            f"Nothing overwritten for {key}"
                        )

                    shutil.move(str(image_path), str(target_image))
                    shutil.move(str(label_path), str(target_label))

                    totals["image_label_pairs_quarantined"] += 1
                    print("       -> Image and label moved to quarantine")

                else:
                    print("       -> Would quarantine image and label")

            else:
                # Preserve OBB annotations and quarantine the original
                # label file before modifying it.
                totals["label_files_to_clean"] += 1

                if apply_changes:
                    relative_label = label_path.relative_to(DATASET_DIR)
                    backup_path = QUARANTINE_DIR / "original_labels" / relative_label
                    backup_path.parent.mkdir(parents=True, exist_ok=True)

                    if backup_path.exists():
                        raise FileExistsError(
                            f"Backup already exists: {backup_path}"
                        )

                    shutil.copy2(label_path, backup_path)

                    remaining_lines = obb_lines + invalid_lines
                    content = (
                        "\n".join(remaining_lines) + "\n"
                        if remaining_lines else ""
                    )

                    label_path.write_text(content, encoding="utf-8")
                    totals["label_files_cleaned"] += 1

                    print("       -> Removed segmentation lines; kept other lines")
                else:
                    print("       -> Would remove segmentation lines")

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    for name, count in totals.items():
        print(f"{name.replace('_', ' ').title():35}: {count}")

    if not apply_changes:
        print("\nDRY RUN ONLY: no files were modified.")
        print("Review the results, then run:")
        print(f'python "{Path(__file__).name}" --apply')
    else:
        print("\nChanges applied.")
        print(f"Quarantined files are under: {QUARANTINE_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes. Without this flag, only preview them."
    )
    args = parser.parse_args()

    main(apply_changes=args.apply)