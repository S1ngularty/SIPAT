from pathlib import Path
from collections import Counter
import shutil

# ============================================================
# CONFIGURATION
# ============================================================

INPUT_DATASET = Path("/home/singularity/Downloads/Smart Agriculture.v3-v2.yolov8-obb")
OUTPUT_DATASET = Path("/home/singularity/Downloads/filtered_dataset")

# Classes you WANT to keep.
# Format:
#   "original_class_name": new_class_id
#
# Example:
#   If your original dataset has:
#       0 = tomato
#       1 = eggplant
#       2 = bacterial_spot
#       3 = early_blight
#
#   and you only want tomato + early_blight:
#
#       "tomato": 0,
#       "early_blight": 1,
#
# IMPORTANT:
# The names here must match your original data.yaml classes.

KEEP_CLASSES = {
   "cercospora"  : 0,
 "healthy": 1,
 "leaf curl": 2,
 "mosaic" :3,
}

# Original class names.
# Change this to match your dataset's data.yaml.
#
# Example:
# names:
#   0: tomato
#   1: eggplant
#   2: bacterial_spot
#   3: early_blight

ORIGINAL_CLASSES = [
    "cercospora",
    "healthy",
    "leaf curl",
    "mosaic" ,
    "xanthomonas"
]


# ============================================================
# SUPPORTED IMAGE TYPES
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ============================================================
# STATISTICS
# ============================================================

total_images = 0
kept_images = 0
removed_images = 0

total_annotations = 0
kept_annotations = 0
removed_annotations = 0

images_with_filtered_annotations = 0
images_with_only_unwanted_classes = 0
images_with_no_annotations = 0

class_annotation_count = Counter()
class_image_count = Counter()


# ============================================================
# VALIDATION
# ============================================================

print("=" * 70)
print("YOLO DATASET CLASS FILTER")
print("=" * 70)

print("\nClasses to KEEP:")

for class_name, new_id in KEEP_CLASSES.items():
    print(f"  {new_id}: {class_name}")

print("\nOriginal classes:")

for class_id, class_name in enumerate(ORIGINAL_CLASSES):
    print(f"  {class_id}: {class_name}")


# Make sure requested classes actually exist
for class_name in KEEP_CLASSES:
    if class_name not in ORIGINAL_CLASSES:
        raise ValueError(
            f"\nERROR: '{class_name}' does not exist in ORIGINAL_CLASSES."
        )


# Create mapping:
#
# original ID -> new ID
#
# Example:
# original:
#   2 = bacterial_spot
#   3 = early_blight
#
# new:
#   0 = bacterial_spot
#   1 = early_blight
#
class_id_mapping = {}

for class_name, new_id in KEEP_CLASSES.items():

    original_id = ORIGINAL_CLASSES.index(class_name)

    class_id_mapping[original_id] = new_id


print("\nClass ID mapping:")

for original_id, new_id in class_id_mapping.items():

    class_name = ORIGINAL_CLASSES[original_id]

    print(
        f"  {original_id} ({class_name}) "
        f"-> {new_id} ({class_name})"
    )


# ============================================================
# PROCESS SPLIT
# ============================================================

def process_split(split_name):

    global total_images
    global kept_images
    global removed_images

    global total_annotations
    global kept_annotations
    global removed_annotations

    global images_with_filtered_annotations
    global images_with_only_unwanted_classes
    global images_with_no_annotations

    input_images_dir = INPUT_DATASET / split_name / "images"
    input_labels_dir = INPUT_DATASET / split_name / "labels"

    output_images_dir = OUTPUT_DATASET / split_name / "images"
    output_labels_dir = OUTPUT_DATASET / split_name / "labels"

    if not input_images_dir.exists():

        print(
            f"\n[{split_name.upper()}] "
            f"Images directory does not exist. Skipping."
        )

        return

    if not input_labels_dir.exists():

        print(
            f"\n[{split_name.upper()}] "
            f"Labels directory does not exist. Skipping."
        )

        return

    output_images_dir.mkdir(parents=True, exist_ok=True)
    output_labels_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "-" * 70)
    print(f"PROCESSING: {split_name.upper()}")
    print("-" * 70)

    images = [
        file
        for file in input_images_dir.iterdir()
        if file.is_file()
        and file.suffix.lower() in IMAGE_EXTENSIONS
    ]

    split_total = 0
    split_kept = 0
    split_removed = 0

    for image_path in images:

        total_images += 1
        split_total += 1

        label_path = input_labels_dir / f"{image_path.stem}.txt"

        # ----------------------------------------------------
        # Missing label
        # ----------------------------------------------------

        if not label_path.exists():

            print(
                f"[WARNING] Missing label: "
                f"{image_path.name}"
            )

            images_with_no_annotations += 1

            continue

        # ----------------------------------------------------
        # Read label
        # ----------------------------------------------------

        try:

            with open(label_path, "r", encoding="utf-8") as file:

                lines = [
                    line.strip()
                    for line in file
                    if line.strip()
                ]

        except Exception as error:

            print(
                f"[ERROR] Could not read label "
                f"{label_path}: {error}"
            )

            continue

        # ----------------------------------------------------
        # Process annotations
        # ----------------------------------------------------

        new_annotations = []

        had_unwanted = False

        for line in lines:

            parts = line.split()

            if len(parts) < 5:

                print(
                    f"[WARNING] Invalid annotation "
                    f"in {label_path.name}: {line}"
                )

                continue

            try:

                original_class_id = int(parts[0])

            except ValueError:

                print(
                    f"[WARNING] Invalid class ID "
                    f"in {label_path.name}: {parts[0]}"
                )

                continue

            total_annotations += 1

            # ------------------------------------------------
            # KEEP CLASS
            # ------------------------------------------------

            if original_class_id in class_id_mapping:

                new_class_id = class_id_mapping[original_class_id]

                # Replace original class ID
                parts[0] = str(new_class_id)

                new_line = " ".join(parts)

                new_annotations.append(new_line)

                kept_annotations += 1

                class_name = ORIGINAL_CLASSES[
                    original_class_id
                ]

                class_annotation_count[class_name] += 1

            # ------------------------------------------------
            # REMOVE CLASS
            # ------------------------------------------------

            else:

                removed_annotations += 1
                had_unwanted = True

        # ----------------------------------------------------
        # No wanted annotations
        # ----------------------------------------------------

        if not new_annotations:

            removed_images += 1
            split_removed += 1

            images_with_only_unwanted_classes += 1

            continue

        # ----------------------------------------------------
        # Some unwanted annotations were removed
        # ----------------------------------------------------

        if had_unwanted:

            images_with_filtered_annotations += 1

        # ----------------------------------------------------
        # Copy image
        # ----------------------------------------------------

        shutil.copy2(
            image_path,
            output_images_dir / image_path.name
        )

        # ----------------------------------------------------
        # Write filtered label
        # ----------------------------------------------------

        output_label_path = (
            output_labels_dir / label_path.name
        )

        with open(
            output_label_path,
            "w",
            encoding="utf-8"
        ) as file:

            file.write(
                "\n".join(new_annotations)
            )

            file.write("\n")

        # ----------------------------------------------------
        # Count image/class occurrence
        # ----------------------------------------------------

        split_image_classes = set()

        for annotation in new_annotations:

            class_id = int(annotation.split()[0])

            # Find class name from new ID
            for name, new_id in KEEP_CLASSES.items():

                if new_id == class_id:

                    split_image_classes.add(name)
                    break

        for class_name in split_image_classes:

            class_image_count[class_name] += 1

        # ----------------------------------------------------
        # Kept
        # ----------------------------------------------------

        kept_images += 1
        split_kept += 1

    # --------------------------------------------------------
    # Split summary
    # --------------------------------------------------------

    print(f"\n{split_name.upper()} SUMMARY")

    print(f"  Total images scanned : {split_total}")
    print(f"  Images kept         : {split_kept}")
    print(f"  Images removed      : {split_removed}")


# ============================================================
# PROCESS DATASET
# ============================================================

for split in [
    "train",
    "valid",
    "test",
]:

    process_split(split)


# ============================================================
# FINAL REPORT
# ============================================================

print("\n")
print("=" * 70)
print("FINAL DATASET REPORT")
print("=" * 70)

print("\nIMAGE STATISTICS")

print(f"  Images scanned              : {total_images}")
print(f"  Images kept                 : {kept_images}")
print(f"  Images removed              : {removed_images}")
print(f"  Images with filtered labels : {images_with_filtered_annotations}")
print(f"  Only unwanted classes       : {images_with_only_unwanted_classes}")
print(f"  Missing/empty annotations   : {images_with_no_annotations}")


print("\nANNOTATION STATISTICS")

print(f"  Total annotations scanned : {total_annotations}")
print(f"  Annotations kept          : {kept_annotations}")
print(f"  Annotations removed       : {removed_annotations}")


print("\nANNOTATIONS PER CLASS")

for class_name, new_id in KEEP_CLASSES.items():

    count = class_annotation_count[class_name]

    print(
        f"  {new_id}: {class_name:<30} "
        f"{count:,}"
    )


print("\nIMAGES PER CLASS")

for class_name, new_id in KEEP_CLASSES.items():

    count = class_image_count[class_name]

    print(
        f"  {new_id}: {class_name:<30} "
        f"{count:,}"
    )


# ============================================================
# CREATE NEW DATA.YAML
# ============================================================

yaml_path = OUTPUT_DATASET / "data.yaml"

with open(
    yaml_path,
    "w",
    encoding="utf-8"
) as file:

    file.write("path: .\n")
    file.write("train: train/images\n")
    file.write("val: valid/images\n")
    file.write("test: test/images\n\n")

    file.write("names:\n")

    # Sort by new class ID
    sorted_classes = sorted(
        KEEP_CLASSES.items(),
        key=lambda item: item[1]
    )

    for class_name, new_id in sorted_classes:

        file.write(
            f"  {new_id}: {class_name}\n"
        )


print("\n")
print("=" * 70)
print("DONE")
print("=" * 70)

print(f"\nFiltered dataset:")
print(f"  {OUTPUT_DATASET.resolve()}")

print(f"\ndata.yaml:")
print(f"  {yaml_path.resolve()}")

print("\nYour original dataset was NOT modified.")
print("The filtered dataset was written to a separate directory.")
