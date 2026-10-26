from pathlib import Path
from collections import defaultdict
import argparse
import math
import shutil

import pandas as pd
import yaml
from PIL import Image


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/filtered_dataset"
)

OUTPUT_PATH = DATASET_PATH.parent / "dataset_cleaned"

SPLITS = ("train", "valid", "test")

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff",
}

TOLERANCE = 1e-6


# ============================================================
# DIRECTORY HELPERS
# ============================================================

def find_image_dir(root, split):
    candidates = [
        root / split / "images",
        root / "images" / split,
    ]
    return next((p for p in candidates if p.is_dir()), None)


def find_label_dir(root, split, image_dir):
    if image_dir is None:
        return None

    candidates = [
        image_dir.parent / "labels",
        root / split / "labels",
        root / "labels" / split,
    ]
    return next((p for p in candidates if p.is_dir()), None)


def load_class_config():
    for filename in ("data.yaml", "data.yml"):
        path = DATASET_PATH / filename

        if path.exists():
            with open(path, encoding="utf-8") as f:
                config = yaml.safe_load(f) or {}

            names = config.get("names")

            if isinstance(names, dict):
                try:
                    names = [
                        names[k]
                        for k in sorted(names, key=lambda k: int(k))
                    ]
                except (ValueError, TypeError):
                    raise ValueError(
                        "Class names must use numeric class IDs."
                    )

            if not isinstance(names, list) or not names:
                raise ValueError(f"No valid class names found in {path}")

            print(f"Using class configuration: {path}")
            print(f"Number of classes: {len(names)}")

            return config, [str(name) for name in names]

    raise FileNotFoundError(
        f"data.yaml or data.yml not found in {DATASET_PATH}"
    )


# ============================================================
# IMAGE VALIDATION
# ============================================================

def image_error(image_path):
    try:
        with Image.open(image_path) as img:
            img.verify()

        with Image.open(image_path) as img:
            img.load()

        return None

    except Exception as exc:
        return f"Unreadable or corrupted image: {exc}"


# ============================================================
# YOLO FORMAT VALIDATION
# ============================================================

def parse_class_id(value, class_count):
    try:
        class_id = int(value)
    except (ValueError, OverflowError):
        return None

    if value not in {str(class_id), f"+{class_id}"}:
        return None

    if not 0 <= class_id < class_count:
        return None

    return class_id


def validate_detection_line(line, class_count):
    """YOLO detection: class_id x_center y_center width height."""

    parts = line.split()

    if len(parts) != 5:
        return False

    if parse_class_id(parts[0], class_count) is None:
        return False

    try:
        x, y, w, h = map(float, parts[1:])
    except (ValueError, OverflowError):
        return False

    if not all(math.isfinite(v) for v in (x, y, w, h)):
        return False

    if not (0 <= x <= 1 and 0 <= y <= 1):
        return False

    if not (0 < w <= 1 and 0 < h <= 1):
        return False

    if (
        x - w / 2 < -TOLERANCE
        or y - h / 2 < -TOLERANCE
        or x + w / 2 > 1 + TOLERANCE
        or y + h / 2 > 1 + TOLERANCE
    ):
        return False

    return True


def validate_segmentation_line(line, class_count):
    """YOLO segmentation: class_id followed by at least 3 x/y pairs."""

    parts = line.split()

    if len(parts) < 7:
        return False

    if (len(parts) - 1) % 2 != 0:
        return False

    if parse_class_id(parts[0], class_count) is None:
        return False

    try:
        coords = [float(value) for value in parts[1:]]
    except (ValueError, OverflowError):
        return False

    if not all(math.isfinite(v) for v in coords):
        return False

    return all(0 <= value <= 1 for value in coords)


def inspect_label(label_path, class_count):
    """
    Returns:
        problems, unreadable, segmentation_lines,
        detection_lines, original_text
    """

    try:
        original_text = label_path.read_text(encoding="utf-8-sig")
    except Exception as exc:
        return (
            [f"Cannot read label file: {exc}"],
            True,
            [],
            [],
            None,
        )

    problems = []
    segmentation_lines = []
    detection_lines = []

    for number, raw_line in enumerate(original_text.splitlines(), 1):
        line = raw_line.strip()

        if not line:
            continue

        if validate_detection_line(line, class_count):
            detection_lines.append(number)
        elif validate_segmentation_line(line, class_count):
            segmentation_lines.append(number)
        else:
            problems.append(
                f"Line {number}: invalid or unsupported annotation"
            )

    if not segmentation_lines and not detection_lines and not problems:
        problems.append("Empty label file")

    return (
        problems,
        False,
        segmentation_lines,
        detection_lines,
        original_text,
    )


# ============================================================
# OUTPUT HELPERS
# ============================================================

def copy_image(image_path, image_dir, output_image_dir):
    relative = image_path.relative_to(image_dir)
    destination = output_image_dir / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(image_path, destination)


def write_detection_label(
    label_path,
    label_dir,
    output_label_dir,
    original_text,
    segmentation_line_numbers,
):
    """
    Write a cleaned label containing only non-segmentation lines.
    Called only when valid detection labels exist and the label
    contains no other invalid annotation lines.
    """

    relative = label_path.relative_to(label_dir)
    destination = output_label_dir / relative
    destination.parent.mkdir(parents=True, exist_ok=True)

    lines = original_text.splitlines()

    kept_lines = [
        line.strip()
        for number, line in enumerate(lines, 1)
        if line.strip()
        and number not in set(segmentation_line_numbers)
    ]

    destination.write_text(
        "\n".join(kept_lines) + "\n",
        encoding="utf-8",
    )


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Validate a YOLO dataset and create a cleaned copy "
            "without invalid or segmentation-only image-label pairs."
        )
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Create the cleaned dataset. Without this flag, "
            "perform a dry run only."
        ),
    )

    parser.add_argument(
        "--include-unlabeled",
        action="store_true",
        help=(
            "Copy images that have missing or empty labels. "
            "By default, these images are excluded from the cleaned dataset."
        ),
    )

    args = parser.parse_args()

    if not DATASET_PATH.is_dir():
        raise FileNotFoundError(DATASET_PATH)

    if args.apply and OUTPUT_PATH.exists():
        raise FileExistsError(
            f"Output already exists: {OUTPUT_PATH}\n"
            "Rename or remove it yourself before running again. "
            "The script will not overwrite an existing output dataset."
        )

    config, class_names = load_class_config()
    class_count = len(class_names)

    print("\nMode:", "CREATE CLEANED DATASET" if args.apply else "DRY RUN")
    print("Original dataset:", DATASET_PATH)
    print("Output dataset:", OUTPUT_PATH)

    reports = []
    counts = defaultdict(int)

    def record(split, image, label, status, reason, action):
        reports.append({
            "split": split,
            "image": str(image) if image else "",
            "label": str(label) if label else "",
            "status": status,
            "reason": reason,
            "action": action,
        })
        counts[status] += 1

    for split in SPLITS:
        print(f"\nScanning {split}...")

        image_dir = find_image_dir(DATASET_PATH, split)

        if image_dir is None:
            record(
                split, None, None, "SKIPPED",
                "Image directory not found",
                "No action",
            )
            continue

        label_dir = find_label_dir(DATASET_PATH, split, image_dir)

        if label_dir is None:
            print("  Label directory not found.")

        output_image_dir = OUTPUT_PATH / split / "images"
        output_label_dir = OUTPUT_PATH / split / "labels"

        images = sorted(
            p for p in image_dir.rglob("*")
            if p.is_file()
            and p.suffix.lower() in IMAGE_EXTENSIONS
        )

        seen_labels = set()

        for image_path in images:
            relative = image_path.relative_to(image_dir)

            label_path = (
                label_dir / relative
            ).with_suffix(".txt") if label_dir else None

            if label_path is not None and label_path.exists():
                seen_labels.add(label_path.resolve())

            img_problem = image_error(image_path)

            if img_problem:
                record(
                    split, image_path, label_path,
                    "INVALID_IMAGE", img_problem,
                    "Excluded" if args.apply else "Would exclude",
                )
                continue

            if label_path is None or not label_path.exists():
                if args.include_unlabeled:
                    if args.apply:
                        copy_image(
                            image_path, image_dir, output_image_dir
                        )

                    record(
                        split, image_path, label_path,
                        "MISSING_LABEL",
                        "No matching label; copied image without label",
                        "Copied image only" if args.apply else "Would copy image only",
                    )
                else:
                    record(
                        split, image_path, label_path,
                        "MISSING_LABEL",
                        "No matching label file",
                        "Excluded" if args.apply else "Would exclude",
                    )
                continue

            (
                problems,
                unreadable_label,
                segmentation_lines,
                detection_lines,
                original_text,
            ) = inspect_label(label_path, class_count)

            # ------------------------------------------------
            # CASE 1: MIXED FILE WITH DETECTION + SEGMENTATION
            # ------------------------------------------------
            if (
                not unreadable_label
                and segmentation_lines
                and detection_lines
                and not problems
            ):
                if args.apply:
                    copy_image(
                        image_path, image_dir, output_image_dir
                    )

                    write_detection_label(
                        label_path,
                        label_dir,
                        output_label_dir,
                        original_text,
                        segmentation_lines,
                    )

                record(
                    split, image_path, label_path,
                    "MIXED_LABEL_CLEANED",
                    (
                        f"Removed segmentation lines {segmentation_lines}; "
                        f"preserved detection lines {detection_lines}"
                    ),
                    "Cleaned label and copied image"
                    if args.apply else "Would clean label and copy image",
                )
                continue

            # ------------------------------------------------
            # CASE 2: SEGMENTATION-ONLY FILE
            # Exclude image AND label from output.
            # ------------------------------------------------
            if (
                not unreadable_label
                and segmentation_lines
                and not detection_lines
                and not problems
            ):
                record(
                    split, image_path, label_path,
                    "SEGMENTATION_ONLY",
                    "Only segmentation polygons; excluded image and label",
                    "Excluded" if args.apply else "Would exclude",
                )
                continue

            # ------------------------------------------------
            # CASE 3: EMPTY LABEL
            # ------------------------------------------------
            if (
                not unreadable_label
                and problems
                and all(p == "Empty label file" for p in problems)
            ):
                if args.include_unlabeled:
                    if args.apply:
                        copy_image(
                            image_path, image_dir, output_image_dir
                        )
                        destination = (
                            output_label_dir
                            / label_path.relative_to(label_dir)
                        )
                        destination.parent.mkdir(
                            parents=True, exist_ok=True
                        )
                        destination.write_text("", encoding="utf-8")

                    record(
                        split, image_path, label_path,
                        "EMPTY_LABEL",
                        "Empty label retained by --include-unlabeled",
                        "Copied image and empty label"
                        if args.apply else "Would copy image and empty label",
                    )
                else:
                    record(
                        split, image_path, label_path,
                        "EMPTY_LABEL",
                        "Empty label; excluded by default",
                        "Excluded" if args.apply else "Would exclude",
                    )
                continue

            # ------------------------------------------------
            # CASE 4: INVALID OR UNREADABLE LABEL
            # ------------------------------------------------
            if problems or unreadable_label:
                record(
                    split, image_path, label_path,
                    "INVALID_LABEL",
                    "; ".join(problems),
                    "Excluded" if args.apply else "Would exclude",
                )
                continue

            # ------------------------------------------------
            # CASE 5: STANDARD DETECTION-ONLY FILE
            # ------------------------------------------------
            if args.apply:
                copy_image(
                    image_path, image_dir, output_image_dir
                )

                relative_label = label_path.relative_to(label_dir)
                destination = output_label_dir / relative_label
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(label_path, destination)

            record(
                split, image_path, label_path,
                "VALID",
                "Standard detection labels passed validation",
                "Copied" if args.apply else "Would copy",
            )

        # ----------------------------------------------------
        # ORPHAN LABELS
        # ----------------------------------------------------
        if label_dir is not None:
            for label_path in sorted(label_dir.rglob("*.txt")):
                if label_path.resolve() in seen_labels:
                    continue

                relative = label_path.relative_to(label_dir)
                possible_image = image_dir / relative

                if any(
                    possible_image.with_suffix(ext).exists()
                    for ext in IMAGE_EXTENSIONS
                ):
                    continue

                record(
                    split, None, label_path,
                    "ORPHAN_LABEL",
                    "Label has no matching image",
                    "Excluded" if args.apply else "Would exclude",
                )

        print(f"  Images scanned: {len(images)}")

    # --------------------------------------------------------
    # WRITE REPORT AND DATA YAML TO OUTPUT
    # --------------------------------------------------------

    report_destination = (
        OUTPUT_PATH / "analytics_report" / "cleanup_report.csv"
        if args.apply else
        DATASET_PATH / "analytics_report" / "cleanup_report.csv"
    )

    report_destination.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(reports).to_csv(report_destination, index=False)

    if args.apply:
        yaml_destination = OUTPUT_PATH / "data.yaml"

        with open(yaml_destination, "w", encoding="utf-8") as f:
            yaml.safe_dump(
                config,
                f,
                sort_keys=False,
                allow_unicode=True,
            )

    print("\n" + "=" * 65)
    print("CLEANUP SUMMARY")
    print("=" * 65)

    for status, count in sorted(counts.items()):
        print(f"{status}: {count}")

    print(f"\nReport: {report_destination}")

    if args.apply:
        print(f"Cleaned dataset created at: {OUTPUT_PATH}")
        print("Original dataset was not modified.")
    else:
        print("\nDRY RUN: no images or labels were copied or changed.")
        print("Review the report before running with --apply.")


if __name__ == "__main__":
    main()