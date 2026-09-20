from pathlib import Path
from collections import defaultdict
import re
import yaml


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_DIR = Path("/home/singularity/Downloads/main_dataset")

DATA_YAML = DATASET_DIR / "data.yaml"

TRACKER_FILE = Path(
    "/home/singularity/Desktop/SIPAT/model_training/"
    "pest_disease_model_improvement_list.txt"
)


# ============================================================
# LOAD CLASS NAMES
# ============================================================

with open(DATA_YAML, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

names = data["names"]

if isinstance(names, dict):
    class_names = {
        int(class_id): class_name
        for class_id, class_name in names.items()
    }
else:
    class_names = {
        class_id: class_name
        for class_id, class_name in enumerate(names)
    }


# ============================================================
# STORAGE
# ============================================================

# Total annotations per class
annotation_counts = defaultdict(int)

# Unique images containing each class
image_counts = defaultdict(int)

# Per-split annotation counts
split_annotation_counts = {
    "train": defaultdict(int),
    "valid": defaultdict(int),
    "test": defaultdict(int),
}

# Per-split image counts
split_image_counts = {
    "train": defaultdict(int),
    "valid": defaultdict(int),
    "test": defaultdict(int),
}

invalid_lines = 0


# ============================================================
# SCAN DATASET
# ============================================================

for split in ["train", "valid", "test"]:

    labels_dir = DATASET_DIR / split / "labels"

    if not labels_dir.exists():
        print(f"[WARNING] Missing labels directory: {labels_dir}")
        continue

    print(f"\nScanning {split.upper()}...")

    label_files = list(labels_dir.glob("*.txt"))

    for label_file in label_files:

        # Classes present in this image
        classes_in_image = set()

        with open(label_file, "r", encoding="utf-8") as f:

            for line_number, line in enumerate(f, start=1):

                line = line.strip()

                if not line:
                    continue

                parts = line.split()

                # Detection:
                # class x y width height
                #
                # Segmentation:
                # class x1 y1 x2 y2 ...
                #
                # We only need the class ID.
                if len(parts) < 2:

                    print(
                        f"[WARNING] Invalid label: "
                        f"{label_file}:{line_number}"
                    )

                    invalid_lines += 1
                    continue

                try:
                    class_id = int(parts[0])

                except ValueError:

                    print(
                        f"[WARNING] Invalid class ID: "
                        f"{label_file}:{line_number}"
                    )

                    invalid_lines += 1
                    continue

                if class_id not in class_names:

                    print(
                        f"[WARNING] Unknown class {class_id}: "
                        f"{label_file}:{line_number}"
                    )

                    invalid_lines += 1
                    continue

                # --------------------------------------------
                # Annotation count
                # --------------------------------------------

                annotation_counts[class_id] += 1

                split_annotation_counts[split][class_id] += 1

                # --------------------------------------------
                # Mark class as present in this image
                # --------------------------------------------

                classes_in_image.add(class_id)

        # --------------------------------------------
        # Image count
        #
        # One image is counted once per class, regardless
        # of how many annotations of that class it contains.
        # --------------------------------------------

        for class_id in classes_in_image:

            image_counts[class_id] += 1

            split_image_counts[split][class_id] += 1


# ============================================================
# PRINT OVERALL RESULTS
# ============================================================

print("\n" + "=" * 90)
print("YOLO CLASS DATASET STATISTICS")
print("=" * 90)

print(
    f"{'ID':>3}  "
    f"{'CLASS':<35} "
    f"{'IMAGES':>10} "
    f"{'ANNOTATIONS':>15}"
)

print("-" * 90)

for class_id in sorted(class_names):

    print(
        f"{class_id:>3}  "
        f"{class_names[class_id]:<35} "
        f"{image_counts[class_id]:>10,} "
        f"{annotation_counts[class_id]:>15,}"
    )


# ============================================================
# SPLIT BREAKDOWN
# ============================================================

print("\n" + "=" * 90)
print("SPLIT BREAKDOWN")
print("=" * 90)

for split in ["train", "valid", "test"]:

    print(f"\n{split.upper()}")

    print(
        f"{'ID':>3}  "
        f"{'CLASS':<35} "
        f"{'IMAGES':>10} "
        f"{'ANNOTATIONS':>15}"
    )

    print("-" * 90)

    for class_id in sorted(class_names):

        print(
            f"{class_id:>3}  "
            f"{class_names[class_id]:<35} "
            f"{split_image_counts[split][class_id]:>10,} "
            f"{split_annotation_counts[split][class_id]:>15,}"
        )


# ============================================================
# UPDATE TXT TRACKER
# ============================================================

print("\n" + "=" * 90)
print("UPDATING TRACKER")
print("=" * 90)


if TRACKER_FILE.exists():

    with open(TRACKER_FILE, "r", encoding="utf-8") as f:
        tracker_lines = f.readlines()

else:

    print("[INFO] Tracker does not exist. Creating a new one.")

    tracker_lines = []


updated_lines = []
found_classes = set()


# ============================================================
# UPDATE EXISTING CLASS LINES
# ============================================================

for line in tracker_lines:

    stripped = line.strip()

    if not stripped:

        updated_lines.append(line)
        continue

    updated = False

    for class_id, class_name in class_names.items():

        if stripped.lower().startswith(class_name.lower()):

            # --------------------------------------------
            # Preserve target number
            #
            # Supports:
            #
            # Early Blight - 250/1000
            #
            # --------------------------------------------

            target_match = re.search(
                r"/\s*(\d+)",
                stripped
            )

            if target_match:

                target = target_match.group(1)

                new_line = (
                    f"{class_name} - "
                    f"{image_counts[class_id]} images / "
                    f"{annotation_counts[class_id]} annotations / "
                    f"{target} target\n"
                )

            else:

                new_line = (
                    f"{class_name} - "
                    f"{image_counts[class_id]} images / "
                    f"{annotation_counts[class_id]} annotations\n"
                )

            updated_lines.append(new_line)

            found_classes.add(class_id)

            updated = True

            break

    if not updated:

        updated_lines.append(line)


# ============================================================
# ADD CLASSES NOT ALREADY IN TRACKER
# ============================================================

missing_classes = [
    class_id
    for class_id in sorted(class_names)
    if class_id not in found_classes
]

if missing_classes:

    if updated_lines and not updated_lines[-1].endswith("\n"):
        updated_lines[-1] += "\n"

    updated_lines.append("\n")
    updated_lines.append("# Classes not previously listed\n")

    for class_id in missing_classes:

        updated_lines.append(
            f"{class_names[class_id]} - "
            f"{image_counts[class_id]} images / "
            f"{annotation_counts[class_id]} annotations\n"
        )


# ============================================================
# WRITE TRACKER
# ============================================================

with open(TRACKER_FILE, "w", encoding="utf-8") as f:
    f.writelines(updated_lines)


# ============================================================
# FINAL STATUS
# ============================================================

print(f"[OK] Tracker updated:")
print(f"     {TRACKER_FILE}")

print(f"\nInvalid label lines: {invalid_lines}")

print("\nDone.")
