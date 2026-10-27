
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
    "/home/singularity/Downloads/pest_disease_datasets/set2/main"
)

# Put the exact class names from data.yaml here.
TARGET_CLASSES = [
    "Leaf Rust",
]

SOURCE_SPLIT = "test"
DESTINATION_SPLIT = "train"

# Percentage of matching images to allocate.
# Example: 50.0 means move 50% of matching source images.
PERCENTAGE_TO_MOVE = 85.0

# Reproducible random selection.
RANDOM_SEED = 42

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"
}


# ============================================================
# LOAD YAML AND CLASS NAMES
# ============================================================

def load_class_names(dataset_path):
    yaml_path = dataset_path / "data.yaml"

    if not yaml_path.is_file():
        yaml_path = dataset_path / "data.yml"

    if not yaml_path.is_file():
        raise FileNotFoundError(
            f"Could not find data.yaml or data.yml in {dataset_path}"
        )

    with yaml_path.open("r", encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}

    names = config.get("names")

    if isinstance(names, list):
        class_names = {
            index: str(name)
            for index, name in enumerate(names)
        }
    elif isinstance(names, dict):
        class_names = {
            int(index): str(name)
            for index, name in names.items()
        }
    else:
        raise ValueError(
            "The YAML file must define class names under 'names'."
        )

    return yaml_path, class_names


def resolve_target_class_ids(class_names, target_names):
    name_to_id = {
        name.strip().casefold(): class_id
        for class_id, name in class_names.items()
    }

    target_ids = set()
    missing_names = []

    for name in target_names:
        class_id = name_to_id.get(name.strip().casefold())

        if class_id is None:
            missing_names.append(name)
        else:
            target_ids.add(class_id)

    if missing_names:
        raise ValueError(
            "These class names were not found in data.yaml:\n  "
            + "\n  ".join(missing_names)
        )

    return target_ids


# ============================================================
# FIND SPLIT DIRECTORIES
# ============================================================

def find_split_directories(dataset_path, split):
    possible_layouts = [
        (
            dataset_path / split / "images",
            dataset_path / split / "labels",
        ),
        (
            dataset_path / "images" / split,
            dataset_path / "labels" / split,
        ),
    ]

    # Support "valid" and "val" naming interchangeably.
    aliases = [split]

    if split == "valid":
        aliases.append("val")
    elif split == "val":
        aliases.append("valid")

    for alias in aliases:
        possible_layouts.extend([
            (
                dataset_path / alias / "images",
                dataset_path / alias / "labels",
            ),
            (
                dataset_path / "images" / alias,
                dataset_path / "labels" / alias,
            ),
        ])

    for image_dir, label_dir in possible_layouts:
        if image_dir.is_dir() and label_dir.is_dir():
            return image_dir, label_dir

    raise FileNotFoundError(
        f"Could not locate image and label directories for split "
        f"'{split}' inside {dataset_path}"
    )


# ============================================================
# READ YOLO LABELS
# ============================================================

def read_yolo_labels(label_path):
    counts = Counter()

    with label_path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            fields = line.strip().split()

            if not fields:
                continue

            if len(fields) < 5:
                print(
                    f"WARNING: malformed label row "
                    f"{label_path}:{line_number}"
                )
                continue

            try:
                class_id = int(fields[0])
            except ValueError:
                print(
                    f"WARNING: invalid class ID "
                    f"{label_path}:{line_number}"
                )
                continue

            counts[class_id] += 1

    return counts


# ============================================================
# FIND MATCHING IMAGES
# ============================================================

def scan_matching_images(
    image_dir,
    label_dir,
    target_ids,
    class_names,
):
    records = []
    missing_labels = 0
    target_image_counts = Counter()
    target_instance_counts = Counter()
    cooccurring_counts = Counter()

    images = sorted(
        path
        for path in image_dir.rglob("*")
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
    )

    for image_path in images:
        relative_path = image_path.relative_to(image_dir)
        label_path = label_dir / relative_path.with_suffix(".txt")

        if not label_path.is_file():
            missing_labels += 1
            continue

        counts = read_yolo_labels(label_path)
        present_ids = set(counts)
        matching_ids = present_ids.intersection(target_ids)

        if not matching_ids:
            continue

        records.append({
            "image": image_path,
            "label": label_path,
            "relative": relative_path,
            "matching_ids": matching_ids,
            "counts": counts,
        })

        for class_id in matching_ids:
            target_image_counts[class_id] += 1
            target_instance_counts[class_id] += counts[class_id]

        # Other classes present in these images move with them too.
        for class_id in present_ids - target_ids:
            cooccurring_counts[class_id] += 1

    print("\nSOURCE DATASET SCAN")
    print("-" * 72)
    print(f"Images scanned: {len(images):,}")
    print(f"Matching images: {len(records):,}")
    print(f"Images without matching labels (skipped): {missing_labels:,}")

    print("\nMatching class statistics:")
    for class_id in sorted(target_ids):
        print(
            f"  {class_names[class_id]}: "
            f"{target_image_counts[class_id]:,} images, "
            f"{target_instance_counts[class_id]:,} instances"
        )

    if cooccurring_counts:
        print("\nOther classes that will also be moved:")
        for class_id, count in sorted(
            cooccurring_counts.items(),
            key=lambda item: class_names.get(item[0], str(item[0]))
        ):
            print(
                f"  {class_names.get(class_id, str(class_id))}: "
                f"{count:,} images"
            )

    return records


# ============================================================
# VALIDATE DESTINATION
# ============================================================

def validate_destinations(
    records,
    destination_image_dir,
    destination_label_dir,
):
    conflicts = []

    for record in records:
        relative_path = record["relative"]

        destination_image = destination_image_dir / relative_path
        destination_label = (
            destination_label_dir / relative_path.with_suffix(".txt")
        )

        if destination_image.exists():
            conflicts.append(destination_image)

        if destination_label.exists():
            conflicts.append(destination_label)

    if conflicts:
        print("\nERROR: Destination conflicts detected.")

        for path in conflicts[:20]:
            print(f"  {path}")

        raise FileExistsError(
            "Destination files already exist. No allocation was started. "
            "Resolve conflicts before retrying."
        )


# ============================================================
# ALLOCATION
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Allocate a percentage of images containing selected classes "
            "from one YOLO split to another."
        )
    )

    parser.add_argument(
        "--dataset",
        type=Path,
        default=DATASET_PATH,
        help="Dataset root directory.",
    )

    parser.add_argument(
        "--source",
        default=SOURCE_SPLIT,
        help="Source split. Defaults to SOURCE_SPLIT.",
    )

    parser.add_argument(
        "--destination",
        default=DESTINATION_SPLIT,
        help="Destination split. Defaults to DESTINATION_SPLIT.",
    )

    parser.add_argument(
        "--percentage",
        type=float,
        default=PERCENTAGE_TO_MOVE,
        help="Percentage of matching images to allocate.",
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=RANDOM_SEED,
        help="Random seed for reproducible selection.",
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually move the selected images and labels.",
    )

    args = parser.parse_args()

    dataset_path = args.dataset.expanduser().resolve()

    if not dataset_path.is_dir():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {dataset_path}"
        )

    if args.source == args.destination:
        raise ValueError("Source and destination splits must be different.")

    if not 0 < args.percentage <= 100:
        raise ValueError("Percentage must be greater than 0 and at most 100.")

    yaml_path, class_names = load_class_names(dataset_path)

    target_ids = resolve_target_class_ids(
        class_names,
        TARGET_CLASSES,
    )

    source_image_dir, source_label_dir = find_split_directories(
        dataset_path,
        args.source,
    )

    destination_image_dir, destination_label_dir = find_split_directories(
        dataset_path,
        args.destination,
    )

    print("=" * 72)
    print("YOLO DATASET SPLIT ALLOCATOR")
    print("=" * 72)
    print(f"Dataset:      {dataset_path}")
    print(f"YAML:         {yaml_path}")
    print(f"Source split: {args.source}")
    print(f"Target split: {args.destination}")
    print(f"Percentage:   {args.percentage:g}%")
    print(f"Mode:         {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"Classes:      {', '.join(TARGET_CLASSES)}")

    records = scan_matching_images(
        source_image_dir,
        source_label_dir,
        target_ids,
        class_names,
    )

    if not records:
        print("\nNo matching images found. Nothing to allocate.")
        return

    # Select a percentage of the matching image set.
    move_count = math.ceil(len(records) * args.percentage / 100)

    rng = random.Random(args.seed)
    selected_records = rng.sample(records, move_count)

    validate_destinations(
        selected_records,
        destination_image_dir,
        destination_label_dir,
    )

    selected_image_counts = Counter()
    selected_instance_counts = Counter()

    for record in selected_records:
        for class_id in record["matching_ids"]:
            selected_image_counts[class_id] += 1
            selected_instance_counts[class_id] += record["counts"][class_id]

    print("\nPLANNED ALLOCATION")
    print("-" * 72)
    print(f"Matching images: {len(records):,}")
    print(f"Percentage:      {args.percentage:g}%")
    print(f"Selected images: {len(selected_records):,}")
    print(f"Source images:   {source_image_dir}")
    print(f"Target images:   {destination_image_dir}")

    print("\nSelected target-class counts:")
    for class_id in sorted(target_ids):
        print(
            f"  {class_names[class_id]}: "
            f"{selected_image_counts[class_id]:,} images, "
            f"{selected_instance_counts[class_id]:,} instances"
        )

    if not args.apply:
        print("\nDRY RUN COMPLETE — no files were changed.")
        print("Run again with --apply to perform the allocation.")
        return

    moved_images = 0
    moved_labels = 0

    try:
        # Check again immediately before starting.
        validate_destinations(
            selected_records,
            destination_image_dir,
            destination_label_dir,
        )

        for record in selected_records:
            relative_path = record["relative"]

            source_image = record["image"]
            source_label = record["label"]

            target_image = destination_image_dir / relative_path
            target_label = (
                destination_label_dir / relative_path.with_suffix(".txt")
            )

            target_image.parent.mkdir(parents=True, exist_ok=True)
            target_label.parent.mkdir(parents=True, exist_ok=True)

            # Move image, then matching label. Roll back the current image
            # if moving its label fails.
            shutil.move(str(source_image), str(target_image))
            moved_images += 1

            try:
                shutil.move(str(source_label), str(target_label))
                moved_labels += 1
            except Exception:
                if target_image.exists() and not source_image.exists():
                    source_image.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(target_image), str(source_image))
                    moved_images -= 1
                raise

        print("\nALLOCATION COMPLETE")
        print(f"Images moved: {moved_images:,}")
        print(f"Labels moved: {moved_labels:,}")
        print(f"From: {args.source}")
        print(f"To:   {args.destination}")

    except Exception as error:
        print("\nERROR DURING ALLOCATION")
        print(error)
        print(
            "Earlier files may already have moved. Inspect both splits "
            "before retrying."
        )
        raise


if __name__ == "__main__":
    main()
