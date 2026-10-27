
from pathlib import Path
from collections import Counter
import argparse
import random
import re
import shutil
import uuid

import yaml


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/mainv4.5"
)

# Select a class by its exact name from data.yaml.
CLASS_TO_FILTER = "Cercospora Leaf Spot"

# Only images containing exactly this many instances of the
# selected class qualify for filtering.
TARGET_INSTANCE_COUNT = 1

# Percentage of matching image-label pairs to move.
# 100.0 means move every matching pair.
FILTER_PERCENTAGE = 50.0

# Same seed + same dataset + same settings = reproducible selection.
RANDOM_SEED = 42

# Splits to modify. Options: "train", "valid", "test".
SPLITS_TO_MODIFY = ("test",)

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff",
}

EXPECTED_LABEL_FIELDS = 5


# ============================================================
# TERMINAL OUTPUT
# ============================================================

def print_section(title):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


# ============================================================
# DATASET CONFIGURATION
# ============================================================

def load_class_names():
    yaml_candidates = [
        DATASET_PATH / "data.yaml",
        DATASET_PATH / "data.yml",
    ]

    yaml_path = next(
        (path for path in yaml_candidates if path.is_file()),
        None,
    )

    if yaml_path is None:
        raise FileNotFoundError(
            f"No data.yaml or data.yml found in {DATASET_PATH}"
        )

    with yaml_path.open("r", encoding="utf-8") as file:
        config = yaml.safe_load(file)

    if not isinstance(config, dict):
        raise ValueError("Dataset YAML must contain a valid mapping.")

    names = config.get("names")

    if isinstance(names, dict):
        try:
            names = [
                names[key]
                for key in sorted(names, key=lambda key: int(key))
            ]
        except (ValueError, TypeError):
            raise ValueError(
                "Class IDs in YAML 'names' must be numeric."
            )

    if not isinstance(names, list) or not names:
        raise ValueError(
            "The dataset YAML must define class names under 'names'."
        )

    names = [str(name) for name in names]

    print(f"Dataset configuration loaded: {yaml_path.name}")
    print(f"Number of classes: {len(names)}")

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


def slugify(value):
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_") or "class"


def resolve_target_class(class_names, target_name):
    matches = [
        class_id
        for class_id, name in enumerate(class_names)
        if name == target_name
    ]

    if not matches:
        available = ", ".join(class_names)

        raise ValueError(
            f"Class '{target_name}' was not found in data.yaml.\n"
            f"Available classes: {available}"
        )

    if len(matches) > 1:
        raise ValueError(
            f"Class name '{target_name}' occurs more than once in YAML."
        )

    return matches[0]


# ============================================================
# LABEL PARSING
# ============================================================

def parse_label_file(label_path, class_names):
    """
    Read a YOLO detection label file.

    Returns a Counter containing the number of annotations
    for each class in this image.

    Malformed annotation lines stop the script instead of
    silently producing inaccurate class totals.
    """

    try:
        content = label_path.read_text(encoding="utf-8-sig")
    except Exception as error:
        raise ValueError(
            f"Could not read a label file: {error}"
        ) from error

    class_counts = Counter()

    for line_number, raw_line in enumerate(
        content.splitlines(), start=1
    ):
        line = raw_line.strip()

        if not line:
            continue

        parts = line.split()

        if len(parts) != EXPECTED_LABEL_FIELDS:
            raise ValueError(
                f"Malformed YOLO label: expected 5 fields, "
                f"received {len(parts)}."
            )

        try:
            class_id = int(parts[0])

            if str(class_id) != parts[0]:
                raise ValueError

            coordinates = [float(value) for value in parts[1:]]

        except ValueError as error:
            raise ValueError(
                f"Malformed class ID or coordinates."
            ) from error

        if not 0 <= class_id < len(class_names):
            raise ValueError(
                f"Class ID is outside the YAML class range."
            )

        # Ensure coordinates are numeric and finite.
        import math

        if not all(math.isfinite(value) for value in coordinates):
            raise ValueError("Coordinates must be finite numbers.")

        x_center, y_center, width, height = coordinates

        if not (
            0 <= x_center <= 1
            and 0 <= y_center <= 1
            and 0 < width <= 1
            and 0 < height <= 1
        ):
            raise ValueError(
                "Coordinates must be normalized; centers must "
                "be in [0, 1], and width/height in (0, 1]."
            )

        x_min = x_center - width / 2
        x_max = x_center + width / 2
        y_min = y_center - height / 2
        y_max = y_center + height / 2

        tolerance = 1e-6

        if (
            x_min < -tolerance
            or y_min < -tolerance
            or x_max > 1 + tolerance
            or y_max > 1 + tolerance
        ):
            raise ValueError(
                "Bounding box extends outside the image."
            )

        class_counts[class_id] += 1

    return class_counts


# ============================================================
# SCANNING AND SELECTION
# ============================================================

def scan_split(split, class_names, target_class_id):
    image_dir = find_image_directory(split)

    if image_dir is None:
        print(f"\nWARNING: {split} image directory not found. Skipping.")
        return None

    label_dir = find_label_directory(split, image_dir)

    if label_dir is None:
        raise FileNotFoundError(
            f"The label directory for split '{split}' was not found."
        )

    image_paths = sorted(
        path
        for path in image_dir.rglob("*")
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
    )

    pairs = []
    missing_label_count = 0

    for image_path in image_paths:
        label_path = matching_label_path(
            image_path,
            image_dir,
            label_dir,
        )

        if label_path is None or not label_path.is_file():
            missing_label_count += 1
            continue

        class_counts = parse_label_file(label_path, class_names)

        pair = {
            "image_path": image_path,
            "label_path": label_path,
            "image_dir": image_dir,
            "label_dir": label_dir,
            "relative_image": image_path.relative_to(image_dir),
            "relative_label": label_path.relative_to(label_dir),
            "class_counts": class_counts,
        }

        pairs.append(pair)

    matching_pairs = [
        pair
        for pair in pairs
        if pair["class_counts"].get(target_class_id, 0)
        == TARGET_INSTANCE_COUNT
    ]

    # Select a percentage of matching pairs reproducibly.
    shuffled_matches = matching_pairs.copy()

    rng = random.Random(RANDOM_SEED)
    rng.shuffle(shuffled_matches)

    number_to_select = int(
        len(shuffled_matches) * FILTER_PERCENTAGE / 100.0 + 0.5
    )

    selected_pairs = shuffled_matches[:number_to_select]

    result = {
        "split": split,
        "image_dir": image_dir,
        "label_dir": label_dir,
        "all_pairs": pairs,
        "matching_pairs": matching_pairs,
        "selected_pairs": selected_pairs,
        "missing_label_count": missing_label_count,
        "total_images_found": len(image_paths),
    }

    print(f"\nScanned split: {split.upper()}")
    print(f"Images found: {len(image_paths)}")
    print(f"Eligible image-label pairs: {len(pairs)}")
    print(f"Images missing labels: {missing_label_count}")
    print(f"Pairs matching exact instance count: {len(matching_pairs)}")
    print(f"Pairs selected to move: {len(selected_pairs)}")
    print(f"Pairs remaining: {len(pairs) - len(selected_pairs)}")

    return result


# ============================================================
# SUMMARY CALCULATIONS
# ============================================================

def aggregate_class_counts(pairs):
    total = Counter()

    for pair in pairs:
        total.update(pair["class_counts"])

    return total



def print_filter_summary(
    results,
    class_names,
    target_class_id,
    output_path,
    filter_enabled,
):
    print_section("FILTER SUMMARY")

    class_name = class_names[target_class_id]

    print(f"Target class: {class_name}")
    print(f"Target instances per image: Exactly {TARGET_INSTANCE_COUNT}")
    print(f"Filter percentage: {FILTER_PERCENTAGE}%")
    print(f"Random seed: {RANDOM_SEED}")
    print(f"Mode: {'ACTUAL FILTERING' if filter_enabled else 'DRY RUN'}")

    total_before = 0
    total_to_remove = 0
    total_images_to_move = 0
    total_matching_images = 0

    for result in results:
        if result is None:
            continue

        pairs = result["all_pairs"]
        selected_pairs = result["selected_pairs"]
        matching_pairs = result["matching_pairs"]

        before = sum(
            pair["class_counts"].get(target_class_id, 0)
            for pair in pairs
        )

        to_remove = sum(
            pair["class_counts"].get(target_class_id, 0)
            for pair in selected_pairs
        )

        after = before - to_remove

        total_before += before
        total_to_remove += to_remove
        total_images_to_move += len(selected_pairs)
        total_matching_images += len(matching_pairs)

        print(f"\nSplit: {result['split'].upper()}")
        print("-" * 50)
        print(f"{class_name} instances before:  {before}")
        print(f"{class_name} instances to remove: {to_remove}")
        print(f"{class_name} instances after:   {after}")
        print(f"Matching images found:          {len(matching_pairs)}")
        print(f"Images selected to move:        {len(selected_pairs)}")
        print(
            f"Matching images not selected:   "
            f"{len(matching_pairs) - len(selected_pairs)}"
        )

    print_section("FINAL CLASS SUMMARY")

    print(f"Class: {class_name}")
    print(f"Instances before filtering: {total_before}")
    print(f"Instances to remove:        {total_to_remove}")
    print(f"Instances remaining:        {total_before - total_to_remove}")
    print(f"Images selected to move:    {total_images_to_move}")
    print(f"Total matching images:      {total_matching_images}")

    if filter_enabled:
        print(f"\nDestination: {output_path.name}")
        print("Filtering will now execute.")
    else:
        print("\nPreview only — no files have been moved.")
        print("Run with --filter to execute.")

# ============================================================
# DESTINATION AND SAFETY CHECKS
# ============================================================

def make_output_directory_name():
    base_name = (
        f"{slugify(CLASS_TO_FILTER)}_instance_"
        f"{TARGET_INSTANCE_COUNT}_filtered_out"
    )

    candidate = DATASET_PATH / base_name

    if not candidate.exists():
        return candidate

    # Avoid overwriting the results of an earlier filtering run.
    return DATASET_PATH / f"{base_name}_{uuid.uuid4().hex[:8]}"


def destination_paths(pair, output_path, split):
    return (
        output_path / split / "images" / pair["relative_image"],
        output_path / split / "labels" / pair["relative_label"],
    )


def preflight_moves(results, output_path):
    """
    Check all source and destination paths before moving anything.
    Refuse to run if the output folder already exists.
    """

    if output_path.exists():
        raise FileExistsError(
            "Destination folder already exists. Refusing to overwrite."
        )

    planned_destinations = set()

    for result in results:
        if result is None:
            continue

        split = result["split"]

        for pair in result["selected_pairs"]:
            image_destination, label_destination = destination_paths(
                pair, output_path, split
            )

            for source, destination in (
                (pair["image_path"], image_destination),
                (pair["label_path"], label_destination),
            ):
                if not source.is_file():
                    raise FileNotFoundError(
                        "A source file disappeared after scanning."
                    )

                if destination.exists():
                    raise FileExistsError(
                        "A destination file already exists."
                    )

                if destination in planned_destinations:
                    raise RuntimeError(
                        "Multiple files resolve to the same destination."
                    )

                planned_destinations.add(destination)


# ============================================================
# MOVING FILES
# ============================================================

def move_selected_pairs(results, output_path):
    preflight_moves(results, output_path)

    moved_pairs = 0
    output_path.mkdir(parents=True, exist_ok=False)

    try:
        for result in results:
            if result is None:
                continue

            split = result["split"]

            for pair in result["selected_pairs"]:
                image_source = pair["image_path"]
                label_source = pair["label_path"]

                image_destination, label_destination = destination_paths(
                    pair,
                    output_path,
                    split,
                )

                image_destination.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )
                label_destination.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )

                # Move image first, then label. Roll back the image if
                # moving its label fails.
                shutil.move(str(image_source), str(image_destination))

                try:
                    shutil.move(
                        str(label_source),
                        str(label_destination),
                    )
                except Exception:
                    if image_destination.exists():
                        image_source.parent.mkdir(
                            parents=True,
                            exist_ok=True,
                        )
                        shutil.move(
                            str(image_destination),
                            str(image_source),
                        )
                    raise

                moved_pairs += 1

    except Exception:
        print(
            "\nERROR: Moving stopped before completion. "
            "Some earlier pairs may already have been moved."
        )
        print("Check the destination folder and original dataset.")
        raise

    print_section("FILTERING COMPLETED")
    print(f"Image-label pairs moved: {moved_pairs}")
    print(f"Destination folder: {output_path}")


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Filter YOLO image-label pairs by the exact number of "
            "instances of one selected class."
        )
    )

    parser.add_argument(
        "--filter",
        action="store_true",
        help="Actually move selected image-label pairs. "
             "Without this flag, only preview the results.",
    )

    args = parser.parse_args()

    if not DATASET_PATH.is_dir():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {DATASET_PATH}"
        )

    if not 0 <= FILTER_PERCENTAGE <= 100:
        raise ValueError("FILTER_PERCENTAGE must be between 0 and 100.")

    if TARGET_INSTANCE_COUNT < 0:
        raise ValueError("TARGET_INSTANCE_COUNT cannot be negative.")

    valid_splits = {"train", "valid", "test"}

    if not SPLITS_TO_MODIFY:
        raise ValueError("SPLITS_TO_MODIFY cannot be empty.")

    if len(set(SPLITS_TO_MODIFY)) != len(SPLITS_TO_MODIFY):
        raise ValueError("SPLITS_TO_MODIFY contains duplicate splits.")

    invalid_splits = set(SPLITS_TO_MODIFY) - valid_splits

    if invalid_splits:
        raise ValueError(
            f"Unsupported splits: {sorted(invalid_splits)}"
        )

    print_section("YOLO DATASET CLASS FILTER")

    class_names = load_class_names()

    target_class_id = resolve_target_class(
        class_names,
        CLASS_TO_FILTER,
    )

    print(f"Selected class: {CLASS_TO_FILTER} (ID {target_class_id})")

    results = []

    for split in SPLITS_TO_MODIFY:
        result = scan_split(
            split,
            class_names,
            target_class_id,
        )

        if result is not None:
            results.append(result)

    if not results:
        raise RuntimeError("No dataset splits could be scanned.")

    output_path = make_output_directory_name()

    # Print all counts before executing any move.
    print_filter_summary(
        results,
        class_names,
        target_class_id,
        output_path,
        args.filter,
    )

    if not args.filter:
        return

    # Check every planned source and destination before moving.
    preflight_moves(results, output_path)

    move_selected_pairs(results, output_path)


if __name__ == "__main__":
    main()
