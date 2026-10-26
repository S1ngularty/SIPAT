
from pathlib import Path
from collections import Counter, defaultdict
import argparse
import random
import shutil
import uuid

import yaml


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/mainv4.4"
)

MAX_IMAGES_PER_CLASS = 3000

# Maximum fraction of a single instance-count bucket that can
# be removed before moving to the next bucket.
MAX_REMOVAL_FRACTION_PER_BUCKET = 0.50

# Reproducible selection. Change this to obtain another sample.
RANDOM_SEED = 42

SPLITS = ("train", "valid", "test")

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff",
}

# The reduced dataset will be created beside the original.
OUTPUT_PREFIX = "main_reduced"

# Refuse to apply if the dataset has ambiguous directory layouts.
# The script never deletes or overwrites the original dataset.


# ============================================================
# HELPERS
# ============================================================

def print_section(title):
    print("\n" + "=" * 76)
    print(title)
    print("=" * 76)


def load_class_names():
    candidates = [
        DATASET_PATH / "data.yaml",
        DATASET_PATH / "data.yml",
    ]

    yaml_path = next(
        (p for p in candidates if p.is_file()),
        None,
    )

    if yaml_path is None:
        raise FileNotFoundError(
            f"No data.yaml or data.yml found in {DATASET_PATH}"
        )

    with yaml_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    names = config.get("names")

    if isinstance(names, dict):
        names = [
            names[key]
            for key in sorted(names, key=lambda k: int(k))
        ]

    if not isinstance(names, list) or not names:
        raise ValueError("YAML must contain a non-empty 'names' list.")

    return [str(name) for name in names], yaml_path, config


def find_split_directories(split):
    image_candidates = [
        DATASET_PATH / split / "images",
        DATASET_PATH / "images" / split,
    ]

    image_dirs = [p for p in image_candidates if p.is_dir()]

    if len(image_dirs) > 1:
        raise RuntimeError(
            f"Ambiguous image directories for {split}: {image_dirs}"
        )

    if not image_dirs:
        return None, None

    image_dir = image_dirs[0]

    label_candidates = [
        image_dir.parent / "labels",
        DATASET_PATH / split / "labels",
        DATASET_PATH / "labels" / split,
    ]

    label_dirs = list(dict.fromkeys(
        p for p in label_candidates if p.is_dir()
    ))

    if len(label_dirs) > 1:
        raise RuntimeError(
            f"Ambiguous label directories for {split}: {label_dirs}"
        )

    return image_dir, label_dirs[0] if label_dirs else None


def label_path_for(image_path, image_dir, label_dir):
    if label_dir is None:
        return None

    relative = image_path.relative_to(image_dir)
    return (label_dir / relative).with_suffix(".txt")


def parse_label_file(label_path, class_count):
    """
    Returns:
      instances: Counter of valid class instances in the image
      valid: whether every non-empty annotation line was valid

    Expected detection format:
      class_id x_center y_center width height
    """
    instances = Counter()
    all_valid = True

    if label_path is None or not label_path.is_file():
        return instances, False

    try:
        lines = label_path.read_text(
            encoding="utf-8-sig"
        ).splitlines()
    except OSError:
        return instances, False

    for line in lines:
        parts = line.split()

        if not parts:
            continue

        if len(parts) != 5:
            all_valid = False
            continue

        try:
            class_id = int(parts[0])
            coords = [float(v) for v in parts[1:]]
        except (ValueError, OverflowError):
            all_valid = False
            continue

        if str(class_id) != parts[0]:
            all_valid = False
            continue

        if not 0 <= class_id < class_count:
            all_valid = False
            continue

        if not all(
            0.0 <= value <= 1.0
            for value in coords
        ):
            all_valid = False
            continue

        x_center, y_center, width, height = coords

        if width <= 0 or height <= 0:
            all_valid = False
            continue

        tolerance = 1e-6

        if (
            x_center - width / 2 < -tolerance
            or y_center - height / 2 < -tolerance
            or x_center + width / 2 > 1 + tolerance
            or y_center + height / 2 > 1 + tolerance
        ):
            all_valid = False
            continue

        instances[class_id] += 1

    return instances, all_valid


# ============================================================
# SCAN DATASET
# ============================================================

def scan_dataset(class_names):
    records = []
    warnings = []

    for split in SPLITS:
        image_dir, label_dir = find_split_directories(split)

        if image_dir is None:
            print(f"WARNING: Missing image directory for {split}.")
            continue

        print(f"\nScanning {split}: {image_dir}")
        print(f"Labels: {label_dir or 'NOT FOUND'}")

        paths = sorted(
            p for p in image_dir.rglob("*")
            if p.is_file()
            and p.suffix.lower() in IMAGE_EXTENSIONS
        )

        for image_path in paths:
            relative = image_path.relative_to(image_dir)
            label_path = label_path_for(
                image_path, image_dir, label_dir
            )

            if label_path is None or not label_path.is_file():
                warnings.append(
                    f"Missing label: {split}/{relative}"
                )
                instances = Counter()
                label_valid = False
            else:
                instances, label_valid = parse_label_file(
                    label_path, len(class_names)
                )

                if not label_valid:
                    warnings.append(
                        f"Missing or invalid label data: "
                        f"{split}/{relative}"
                    )

            records.append({
                "split": split,
                "image": image_path,
                "relative": relative,
                "label": label_path,
                "instances": instances,
                "label_valid": label_valid,
            })

        print(f"Images found: {len(paths)}")

    return records, warnings


# ============================================================
# CLASS DISTRIBUTION
# ============================================================

def count_class_images(records, removed):
    counts = Counter()

    for index, record in enumerate(records):
        if index in removed:
            continue

        for class_id, count in record["instances"].items():
            if count > 0:
                counts[class_id] += 1

    return counts


def get_instance_buckets(records, removed, class_id):
    """
    Bucket images by the number of instances of this class.
    Only images containing the target class are included.
    """
    buckets = defaultdict(list)

    for index, record in enumerate(records):
        if index in removed:
            continue

        count = record["instances"].get(class_id, 0)

        if count > 0:
            buckets[count].append(index)

    return buckets


# ============================================================
# REDUCTION PLANNER
# ============================================================

def plan_reduction(records, class_names):
    """
    Select images for removal without touching the filesystem.

    Strategy:
      1. Only classes above the configured capacity are targets.
      2. Process the lowest target-class instance count first.
      3. Remove at most the configured fraction of each bucket.
      4. Stop working on a class as soon as it reaches capacity.
      5. Prefer images that also contain other over-cap classes.
      6. Keep every image's labels paired with the image.

    Images containing multiple classes can affect multiple counts.
    """
    rng = random.Random(RANDOM_SEED)
    removed = set()

    initial_counts = count_class_images(records, removed)

    print_section("CLASS DISTRIBUTION BEFORE REDUCTION")

    for class_id, name in enumerate(class_names):
        print(
            f"{name}: {initial_counts[class_id]} images"
        )

    # Work on the class with the greatest excess first.
    class_order = sorted(
        range(len(class_names)),
        key=lambda cid: (
            -(initial_counts[cid] - MAX_IMAGES_PER_CLASS),
            class_names[cid].lower(),
        ),
    )

    removal_log = []

    for class_id in class_order:
        current_counts = count_class_images(records, removed)
        excess = current_counts[class_id] - MAX_IMAGES_PER_CLASS

        if excess <= 0:
            continue

        print_section(
            f"REDUCING {class_names[class_id]} "
            f"(excess: {excess})"
        )

        buckets = get_instance_buckets(
            records, removed, class_id
        )

        for instance_count in sorted(buckets):
            current_counts = count_class_images(records, removed)
            excess = (
                current_counts[class_id] - MAX_IMAGES_PER_CLASS
            )

            if excess <= 0:
                break

            candidates = [
                idx for idx in buckets[instance_count]
                if idx not in removed
            ]

            if not candidates:
                continue

            # At most 50% by default of this bucket's original
            # candidates may be removed during this class pass.
            max_removable = int(
                len(candidates) * MAX_REMOVAL_FRACTION_PER_BUCKET
            )

            if max_removable == 0:
                print(
                    f"  {instance_count} instance(s): "
                    f"{len(candidates)} available, "
                    f"retaining all (bucket cap)"
                )
                continue

            # Prefer images that help reduce multiple over-cap
            # classes, then images with fewer other class instances.
            def priority(index):
                record = records[index]
                other_over_cap = sum(
                    1
                    for other_id, other_count
                    in record["instances"].items()
                    if other_id != class_id
                    and other_count > 0
                    and current_counts[other_id] > MAX_IMAGES_PER_CLASS
                )

                return (
                    -other_over_cap,
                    sum(record["instances"].values()),
                    rng.random(),
                )

            candidates.sort(key=priority)

            # Do not remove more than needed for the target class.
            to_remove = min(excess, max_removable)

            selected = candidates[:to_remove]

            for index in selected:
                if index in removed:
                    continue

                removed.add(index)
                removal_log.append({
                    "split": records[index]["split"],
                    "image": str(records[index]["relative"]),
                    "target_class": class_names[class_id],
                    "target_instances": instance_count,
                })

            print(
                f"  {instance_count} instance(s): "
                f"removed {len(selected)} of {len(candidates)} "
                f"candidates"
            )

        final_count = count_class_images(records, removed)[class_id]

        if final_count > MAX_IMAGES_PER_CLASS:
            print(
                f"  NOTE: Could not reach capacity. "
                f"Final projected count: {final_count}"
            )
        else:
            print(
                f"  Target reached: {final_count} images"
            )

    final_counts = count_class_images(records, removed)

    return removed, initial_counts, final_counts, removal_log


# ============================================================
# PREVIEW REPORT
# ============================================================

def print_summary(
    records, class_names, removed,
    initial_counts, final_counts, warnings,
):
    print_section("REDUCTION PREVIEW")

    print(f"Original images: {len(records)}")
    print(f"Images selected for removal: {len(removed)}")
    print(f"Images retained: {len(records) - len(removed)}")
    print(f"Maximum images per class: {MAX_IMAGES_PER_CLASS}")
    print(
        "Maximum removal per instance bucket: "
        f"{MAX_REMOVAL_FRACTION_PER_BUCKET:.0%}"
    )

    print("\nClass counts (images containing each class):")

    print(
        f"{'CLASS':<30}"
        f"{'BEFORE':>10}"
        f"{'AFTER':>10}"
        f"{'CHANGE':>10}"
        f"{'STATUS':>14}"
    )

    print("-" * 74)

    for class_id, name in enumerate(class_names):
        before = initial_counts[class_id]
        after = final_counts[class_id]
        change = after - before

        if before <= MAX_IMAGES_PER_CLASS:
            status = "UNCHANGED*"
        elif after <= MAX_IMAGES_PER_CLASS:
            status = "AT TARGET"
        else:
            status = "OVER TARGET"

        print(
            f"{name:<30}"
            f"{before:>10}"
            f"{after:>10}"
            f"{change:>10}"
            f"{status:>14}"
        )

    print("\n* Classes already at or below capacity are not reduction targets.")
    print("  Multi-class images may still affect their counts.")

    print("\nImages selected per split:")

    for split in SPLITS:
        before = sum(
            1 for record in records
            if record["split"] == split
        )
        count_removed = sum(
            1 for index in removed
            if records[index]["split"] == split
        )

        print(
            f"  {split}: {before} original, "
            f"{count_removed} selected, "
            f"{before - count_removed} retained"
        )

    if warnings:
        print(f"\nWarnings: {len(warnings)}")
        for warning in warnings[:20]:
            print(f"  - {warning}")

        if len(warnings) > 20:
            print(f"  ... and {len(warnings) - 20} more")

    if any(
        final_counts[cid] > MAX_IMAGES_PER_CLASS
        for cid in range(len(class_names))
    ):
        print(
            "\nWARNING: Some classes remain over capacity. "
            "The per-bucket retention limit or multi-class "
            "constraints may prevent reaching the target."
        )


# ============================================================
# APPLY: CREATE A SEPARATE REDUCED DATASET
# ============================================================

def apply_reduction(records, removed, yaml_path, config):
    output_path = DATASET_PATH.parent / (
        f"{OUTPUT_PREFIX}_{uuid.uuid4().hex[:8]}"
    )

    if output_path.exists():
        raise FileExistsError(
            f"Output already exists: {output_path}"
        )

    print_section("APPLYING REDUCTION")

    print(f"Original: {DATASET_PATH}")
    print(f"Output:   {output_path}")

    # Do not silently overwrite anything.
    output_path.mkdir(parents=True, exist_ok=False)

    try:
        for index, record in enumerate(records):
            if index in removed:
                continue

            split = record["split"]
            relative = record["relative"]

            destination_image = (
                output_path / split / "images" / relative
            )
            destination_image.parent.mkdir(
                parents=True, exist_ok=True
            )
            shutil.copy2(record["image"], destination_image)

            source_label = record["label"]

            if source_label is not None and source_label.is_file():
                destination_label = (
                    output_path / split / "labels"
                    / relative.with_suffix(".txt")
                )
                destination_label.parent.mkdir(
                    parents=True, exist_ok=True
                )
                shutil.copy2(source_label, destination_label)

        # Keep the dataset YAML and its class names.
        destination_yaml = output_path / yaml_path.name
        shutil.copy2(yaml_path, destination_yaml)

        # Normalize split paths for the new output layout.
        config["train"] = "train/images"
        config["val"] = "valid/images"
        config["test"] = "test/images"

        with destination_yaml.open("w", encoding="utf-8") as f:
            yaml.safe_dump(
                config,
                f,
                sort_keys=False,
                allow_unicode=True,
            )

    except Exception:
        # Never delete the source. Leave any partial output for
        # inspection rather than risk deleting user data.
        print(
            "\nERROR: Copying was interrupted. "
            f"Inspect the partial output at {output_path}"
        )
        raise

    print("\nReduced dataset created successfully.")
    print(f"Location: {output_path}")
    print("Original dataset was not modified.")
    print("Review the output YAML before training.")


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Reduce overrepresented YOLO classes by prioritizing "
            "images with fewer instances of each target class."
        )
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create the reduced dataset copy. Without this, preview only.",
    )

    args = parser.parse_args()

    print_section("YOLO DATASET CLASS-AWARE REDUCTION")

    if not DATASET_PATH.is_dir():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {DATASET_PATH}"
        )

    if MAX_IMAGES_PER_CLASS < 1:
        raise ValueError("MAX_IMAGES_PER_CLASS must be at least 1.")

    if not 0 <= MAX_REMOVAL_FRACTION_PER_BUCKET <= 1:
        raise ValueError(
            "MAX_REMOVAL_FRACTION_PER_BUCKET must be between 0 and 1."
        )

    class_names, yaml_path, config = load_class_names()

    print(f"Dataset: {DATASET_PATH}")
    print(f"Classes: {len(class_names)}")
    print(f"Target capacity: {MAX_IMAGES_PER_CLASS}")
    print(f"Mode: {'APPLY' if args.apply else 'PREVIEW ONLY'}")

    records, warnings = scan_dataset(class_names)

    if not records:
        raise RuntimeError("No images were found in the dataset splits.")

    removed, before, after, removal_log = plan_reduction(
        records, class_names
    )

    print_summary(
        records,
        class_names,
        removed,
        before,
        after,
        warnings,
    )

    if not args.apply:
        print_section("PREVIEW COMPLETE")
        print("No files were copied, moved, or deleted.")
        print("Run with --apply to create the reduced dataset.")
        return

    apply_reduction(
        records,
        removed,
        yaml_path,
        config,
    )


if __name__ == "__main__":
    main()
