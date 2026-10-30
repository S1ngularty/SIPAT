
from pathlib import Path
from collections import Counter
import argparse
import math
import random
import shutil
import yaml


# ============================================================
# CONFIGURATION — EDIT THESE VALUES
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/mainv4.5"
)

# Exact class names from data.yaml.
TARGET_CLASSES = [
    "Cercospora Leaf Spot",
]

# Percentage of images containing any selected class to reduce.
# 0 = no changes; 50 = reduce half; 100 = reduce all.
PERCENTAGE_TO_REDUCE = 100.0

# Splits to process. Use [] to process no splits.
# Supported names: train, valid, val, test.
SPLITS_TO_PROCESS = [
    "train",
    "valid",
    "test",
]

RANDOM_SEED = 42

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"
}


# ============================================================
# LOAD YAML
# ============================================================

def load_class_names(dataset_path):
    yaml_path = dataset_path / "data.yaml"

    if not yaml_path.is_file():
        yaml_path = dataset_path / "data.yml"

    if not yaml_path.is_file():
        raise FileNotFoundError(
            f"Cannot find data.yaml or data.yml in {dataset_path}"
        )

    with yaml_path.open("r", encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}

    names = config.get("names")

    if isinstance(names, list):
        class_names = {
            i: str(name) for i, name in enumerate(names)
        }
    elif isinstance(names, dict):
        class_names = {
            int(i): str(name) for i, name in names.items()
        }
    else:
        raise ValueError(
            "The YAML file must define class names under 'names'."
        )

    if not class_names:
        raise ValueError("No classes were found in the YAML file.")

    return yaml_path, class_names


def resolve_target_ids(class_names, target_names):
    lookup = {
        name.strip().casefold(): class_id
        for class_id, name in class_names.items()
    }

    target_ids = set()
    missing = []

    for name in target_names:
        class_id = lookup.get(name.strip().casefold())

        if class_id is None:
            missing.append(name)
        else:
            target_ids.add(class_id)

    if missing:
        raise ValueError(
            "Unknown class names:\n  " + "\n  ".join(missing)
        )

    if not target_ids:
        raise ValueError("TARGET_CLASSES cannot be empty.")

    return target_ids


# ============================================================
# FIND SPLIT DIRECTORIES
# ============================================================

def find_split_directories(dataset_path, split):
    aliases = [split]

    if split == "valid":
        aliases.append("val")
    elif split == "val":
        aliases.append("valid")

    for alias in aliases:
        layouts = [
            (
                dataset_path / alias / "images",
                dataset_path / alias / "labels",
            ),
            (
                dataset_path / "images" / alias,
                dataset_path / "labels" / alias,
            ),
        ]

        for image_dir, label_dir in layouts:
            if image_dir.is_dir() and label_dir.is_dir():
                return image_dir, label_dir

    raise FileNotFoundError(
        f"Could not find image/label directories for '{split}'."
    )


# ============================================================
# LABEL UTILITIES
# ============================================================

def get_class_id(line):
    fields = line.strip().split()

    if not fields:
        return None

    try:
        return int(fields[0])
    except ValueError:
        return None


def read_label(label_path):
    with label_path.open("r", encoding="utf-8") as file:
        return file.readlines()


def split_label_rows(lines, target_ids):
    """
    Return retained rows, removed target rows, and present IDs.

    Other classes' rows are preserved exactly as read.
    """
    kept = []
    removed = []
    present_ids = set()

    for line in lines:
        class_id = get_class_id(line)

        if class_id is None:
            # Do not silently discard malformed or blank rows.
            kept.append(line)
            continue

        present_ids.add(class_id)

        if class_id in target_ids:
            removed.append(line)
        else:
            kept.append(line)

    return kept, removed, present_ids


# ============================================================
# SCAN DATASET
# ============================================================

def scan_split(image_dir, label_dir, target_ids, class_names):
    records = []
    missing_labels = 0
    scanned = 0
    target_image_counts = Counter()
    target_instance_counts = Counter()
    other_class_counts = Counter()

    for image_path in sorted(image_dir.rglob("*")):
        if (
            not image_path.is_file()
            or image_path.suffix.lower() not in IMAGE_EXTENSIONS
        ):
            continue

        scanned += 1
        relative = image_path.relative_to(image_dir)
        label_path = label_dir / relative.with_suffix(".txt")

        if not label_path.is_file():
            missing_labels += 1
            continue

        lines = read_label(label_path)
        kept, removed, present_ids = split_label_rows(
            lines, target_ids
        )

        matched_ids = {
            get_class_id(line)
            for line in removed
            if get_class_id(line) is not None
        }

        if not matched_ids:
            continue

        records.append({
            "image": image_path,
            "label": label_path,
            "relative": relative,
            "original_lines": lines,
            "kept_lines": kept,
            "removed_lines": removed,
            "matched_ids": matched_ids,
            "present_ids": present_ids,
        })

        for class_id in matched_ids:
            target_image_counts[class_id] += 1

        for line in removed:
            class_id = get_class_id(line)
            if class_id is not None:
                target_instance_counts[class_id] += 1

        for class_id in present_ids - target_ids:
            other_class_counts[class_id] += 1

    print(f"\nImages scanned: {scanned:,}")
    print(f"Matching images: {len(records):,}")
    print(f"Images without labels (skipped): {missing_labels:,}")

    print("\nTarget class counts before reduction:")
    for class_id in sorted(target_ids):
        print(
            f"  {class_names[class_id]}: "
            f"{target_image_counts[class_id]:,} images, "
            f"{target_instance_counts[class_id]:,} instances"
        )

    return records


# ============================================================
# REDUCE A SPLIT
# ============================================================

def reduce_split(
    image_dir,
    label_dir,
    target_ids,
    class_names,
    percentage,
    rng,
    apply,
):
    records = scan_split(
        image_dir, label_dir, target_ids, class_names
    )

    if not records:
        print("No matching images. Nothing to reduce.")
        return

    # 0% must always select zero images.
    # Any positive percentage selects at least one if matches exist.
    selected_count = (
        0 if percentage == 0
        else math.ceil(len(records) * percentage / 100)
    )

    selected = rng.sample(records, selected_count)

    images_to_delete = []
    labels_to_delete = []
    labels_to_update = []

    for record in selected:
        if not record["kept_lines"]:
            # All valid annotations belonged to selected classes.
            # Delete the image and its label together.
            images_to_delete.append(record)
            labels_to_delete.append(record)
        else:
            # Preserve the image and all non-target annotations.
            labels_to_update.append(record)

    print("\nREDUCTION PLAN")
    print("-" * 60)
    print(f"Percentage:             {percentage:g}%")
    print(f"Selected images:        {len(selected):,}")
    print(f"Images to delete:       {len(images_to_delete):,}")
    print(f"Labels to delete:       {len(labels_to_delete):,}")
    print(f"Labels to edit:         {len(labels_to_update):,}")
    print(f"Image directory:        {image_dir}")
    print(f"Label directory:        {label_dir}")

    removed_counts = Counter()

    for record in selected:
        for line in record["removed_lines"]:
            class_id = get_class_id(line)
            if class_id is not None:
                removed_counts[class_id] += 1

    print("\nTarget annotations planned for removal:")
    for class_id in sorted(target_ids):
        print(
            f"  {class_names[class_id]}: "
            f"{removed_counts[class_id]:,}"
        )

    if not apply:
        print("\nDRY RUN — no files changed.")
        return

    # Prepare replacement label files before modifying anything.
    # Store original contents in memory for rollback if an error occurs.
    updated_labels = []

    for record in labels_to_update:
        label_path = record["label"]
        temp_path = label_path.with_name(
            label_path.name + ".reduce_tmp"
        )

        if temp_path.exists():
            raise FileExistsError(
                f"Temporary file already exists: {temp_path}"
            )

        updated_labels.append({
            "record": record,
            "path": label_path,
            "temp": temp_path,
        })

    written_temps = []
    updated_originals = []
    deleted_files = []

    try:
        for item in updated_labels:
            with item["temp"].open(
                "w", encoding="utf-8"
            ) as file:
                file.writelines(item["record"]["kept_lines"])
            written_temps.append(item["temp"])

        # Replace labels only after all temporary files were written.
        for item in updated_labels:
            item["path"].replace(item["temp"])
            updated_originals.append(item)

        # Remove paired files. If a deletion fails, restore previously
        # removed files from a temporary backup outside the dataset.
        # Backups are kept until the operation finishes.
        backup_dir = image_dir.parent / (
            f".{image_dir.parent.name}_reduction_backup"
        )

        for record in images_to_delete:
            for source in (record["image"], record["label"]):
                relative_to_split = (
                    source.relative_to(image_dir.parent)
                    if source.is_relative_to(image_dir.parent)
                    else Path("labels") / source.name
                )
                backup = backup_dir / relative_to_split

                if backup.exists():
                    raise FileExistsError(
                        f"Backup conflict: {backup}"
                    )

        for record in images_to_delete:
            for source in (record["image"], record["label"]):
                relative_to_split = (
                    source.relative_to(image_dir.parent)
                    if source.is_relative_to(image_dir.parent)
                    else Path("labels") / source.name
                )
                backup = backup_dir / relative_to_split
                backup.parent.mkdir(parents=True, exist_ok=True)

                shutil.move(str(source), str(backup))
                deleted_files.append((source, backup))

        print("\nREDUCTION COMPLETE")
        print(f"Images removed from dataset: {len(images_to_delete):,}")
        print(f"Labels removed from dataset: {len(labels_to_delete):,}")
        print(f"Labels edited: {len(labels_to_update):,}")

        if deleted_files:
            print(f"Recovery backup: {backup_dir}")
            print("Deleted image/label pairs were moved into the backup.")

    except Exception:
        print("\nERROR — attempting rollback.")

        for source, backup in reversed(deleted_files):
            if backup.exists():
                source.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(backup), str(source))

        for item in reversed(updated_originals):
            item["path"].write_text(
                "".join(item["record"]["original_lines"]),
                encoding="utf-8",
            )

        for temp_path in written_temps:
            if temp_path.exists():
                temp_path.unlink()

        raise


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Reduce selected YOLO classes by percentage while "
            "preserving other classes' annotations."
        )
    )

    parser.add_argument(
        "--dataset",
        type=Path,
        default=DATASET_PATH,
    )
    parser.add_argument(
        "--percentage",
        type=float,
        default=PERCENTAGE_TO_REDUCE,
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=RANDOM_SEED,
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes. Without this flag, only preview.",
    )

    args = parser.parse_args()

    dataset_path = args.dataset.expanduser().resolve()

    if not dataset_path.is_dir():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {dataset_path}"
        )

    if not 0 <= args.percentage <= 100:
        raise ValueError("Percentage must be between 0 and 100.")

    if not TARGET_CLASSES:
        raise ValueError("Configure at least one target class.")

    if not SPLITS_TO_PROCESS:
        raise ValueError("Configure at least one dataset split.")

    yaml_path, class_names = load_class_names(dataset_path)
    target_ids = resolve_target_ids(class_names, TARGET_CLASSES)

    print("=" * 72)
    print("YOLO CLASS REDUCTION TOOL")
    print("=" * 72)
    print(f"Dataset:     {dataset_path}")
    print(f"YAML:        {yaml_path}")
    print(f"Classes:     {', '.join(TARGET_CLASSES)}")
    print(f"Percentage:  {args.percentage:g}%")
    print(f"Splits:      {', '.join(SPLITS_TO_PROCESS)}")
    print(f"Mode:        {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"Random seed: {args.seed}")

    rng = random.Random(args.seed)

    for split in SPLITS_TO_PROCESS:
        print(f"\n{'=' * 72}")
        print(f"PROCESSING SPLIT: {split}")
        print("=" * 72)

        image_dir, label_dir = find_split_directories(
            dataset_path, split
        )

        reduce_split(
            image_dir=image_dir,
            label_dir=label_dir,
            target_ids=target_ids,
            class_names=class_names,
            percentage=args.percentage,
            rng=rng,
            apply=args.apply,
        )


if __name__ == "__main__":
    main()
