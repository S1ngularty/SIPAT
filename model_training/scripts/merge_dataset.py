from pathlib import Path
from collections import Counter
import shutil


# ============================================================
# CONFIGURATION
# ============================================================

# ------------------------------------------------------------
# SOURCE DATASET
# ------------------------------------------------------------
#
# This is the FILTERED dataset that you want to append.
#
# Expected:
#
# filtered_dataset/
# ├── train/
# │   ├── images/
# │   └── labels/
# ├── valid/
# │   ├── images/
# │   └── labels/
# └── test/
#     ├── images/
#     └── labels/
#

SOURCE_DATASET = Path(
    "/home/singularity/Downloads/crop_identification_datasets/filtered_dataset"
)


# ------------------------------------------------------------
# MAIN DATASET
# ------------------------------------------------------------
#
# This is your existing dataset.
#
# The new images will be copied INTO this dataset.
#
# IMPORTANT:
# The main dataset itself will be modified.
#

MAIN_DATASET = Path(
    "/home/singularity/Downloads/crop_identification_datasets/main_dataset"
)


# ------------------------------------------------------------
# DRY RUN
# ------------------------------------------------------------
#
# True:
#   Analyze everything.
#   NOTHING gets copied or modified.
#
# False:
#   Actually merge the dataset.
#

DRY_RUN = True


# ------------------------------------------------------------
# HANDLE DUPLICATE FILENAMES
# ------------------------------------------------------------
#
# If the source contains:
#
#     image001.jpg
#
# and the main dataset already contains:
#
#     image001.jpg
#
# the script needs to avoid overwriting it.
#
# True:
#   Rename the incoming image.
#
# Example:
#
#     image001.jpg
#     image001_merged_1.jpg
#
# False:
#   Stop with an error.
#

AUTO_RENAME_DUPLICATES = True


# ============================================================
# SOURCE DATASET CLASSES
# ============================================================
#
# These are the classes from the FILTERED dataset.
#
# IDs must match the source dataset's data.yaml.
#

SOURCE_CLASSES = {
    0: "Fungi",
    1:"Healthy"
}


# ============================================================
# MAIN DATASET CLASSES
# ============================================================
#
# These are the classes from your ORIGINAL/main data.yaml.
#

MAIN_CLASSES = {
  0: "eggplant_leaf",
  1:"potato_leaf",
  2:"tomato_leaf",
  3:"chili_leaves",

    #crop pest and disease identification classes
#  0:   " Early Blight",
# 1: "Healthy",
# 2:"Late Blight",
# 3:"Leaf Miner",
# 4:"Leaf Mold",
# 5:"Mosaic Virus",
# 6:"Septoria Leaf Spot",
# 7:"Spider Mites",
# 8:"Yellow Leaf Curl Virus",
# 9: "Anthracnose",
# 10: "Black Spot",
# 11: "Botrytis Gray Mold",
# 12: "Cercospora Leaf Spot",
# 13:"Downy Mildew",
# 14:"Leaf Curl",
# 15: "Mycosphaerella Leaf Blotch",
# 16: "Powdery Mildew",
# 17: "Rust",
# 18: "Bacterial Spot",
# 19: "Fruit Rot",
# 20: "Melon Thrips",
# 21: "Fruit Borer",
# 22: "Aphids",
# 23: "Flea Beetles",
# 24:"Wilt"
}


# ============================================================
# SOURCE -> MAIN CLASS MAPPING
# ============================================================
#
# Format:
#
# SOURCE CLASS ID : MAIN CLASS ID
#
# Example:
#
# 6 -> 0
#
# Tomato Early blight leaf
#          ↓
# Early Blight
#
# ------------------------------------------------------------
#
# IMPORTANT:
#
# Class 8 (Tomato leaf bacterial spot) is intentionally NOT
# included because your main dataset currently has no
# bacterial spot class.
#
# Class 7 (Tomato Septoria leaf spot) is mapped to:
#
#     6 = Septoria
#
# Change this if you want it mapped to class 19 instead.
#

CLASS_MAPPING = {
    0:1,
    1:1
}


# ============================================================
# SETTINGS
# ============================================================

SPLITS = [
    "train",
    "valid",
    "test",
]

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

stats = {

    split: {
        "images_found": 0,
        "images_ready": 0,
        "images_skipped": 0,
        "images_renamed": 0,
        "annotations_found": 0,
        "annotations_converted": 0,
        "annotations_skipped": 0,
    }

    for split in SPLITS
}


source_class_annotation_count = Counter()
main_class_annotation_count = Counter()

source_class_image_count = Counter()
main_class_image_count = Counter()

unmapped_classes = Counter()

duplicate_files = []

invalid_labels = []

missing_labels = []


# ============================================================
# PRINT HEADER
# ============================================================

def print_header(title):

    print()
    print("=" * 75)
    print(title)
    print("=" * 75)


# ============================================================
# SHOW CLASS MAPPING
# ============================================================

def show_class_mapping():

    print_header("CLASS MAPPING")

    for source_id in sorted(SOURCE_CLASSES):

        source_name = SOURCE_CLASSES[source_id]

        if source_id in CLASS_MAPPING:

            main_id = CLASS_MAPPING[source_id]
            main_name = MAIN_CLASSES[main_id]

            print(
                f"{source_id:>3} "
                f"{source_name:<35}"
                f" -> "
                f"{main_id:>3} "
                f"{main_name}"
            )

        else:

            print(
                f"{source_id:>3} "
                f"{source_name:<35}"
                f" -> "
                f"NOT MAPPED"
            )


# ============================================================
# VALIDATE CONFIGURATION
# ============================================================

def validate_configuration():

    print_header("VALIDATING CONFIGURATION")

    # --------------------------------------------------------
    # Check source dataset
    # --------------------------------------------------------

    if not SOURCE_DATASET.exists():

        raise FileNotFoundError(
            f"Source dataset does not exist:\n"
            f"{SOURCE_DATASET}"
        )

    print(
        f"[OK] Source dataset:\n"
        f"     {SOURCE_DATASET}"
    )

    # --------------------------------------------------------
    # Check main dataset
    # --------------------------------------------------------

    if not MAIN_DATASET.exists():

        raise FileNotFoundError(
            f"Main dataset does not exist:\n"
            f"{MAIN_DATASET}"
        )

    print(
        f"[OK] Main dataset:\n"
        f"     {MAIN_DATASET}"
    )

    # --------------------------------------------------------
    # Check source classes
    # --------------------------------------------------------

    for source_id, main_id in CLASS_MAPPING.items():

        if source_id not in SOURCE_CLASSES:

            raise ValueError(
                f"Source class ID {source_id} "
                f"does not exist in SOURCE_CLASSES."
            )

        if main_id not in MAIN_CLASSES:

            raise ValueError(
                f"Main class ID {main_id} "
                f"does not exist in MAIN_CLASSES."
            )

    print("[OK] Class IDs are valid.")

    # --------------------------------------------------------
    # Check splits
    # --------------------------------------------------------

    for split in SPLITS:

        source_images = (
            SOURCE_DATASET /
            split /
            "images"
        )

        source_labels = (
            SOURCE_DATASET /
            split /
            "labels"
        )

        main_images = (
            MAIN_DATASET /
            split /
            "images"
        )

        main_labels = (
            MAIN_DATASET /
            split /
            "labels"
        )

        if not source_images.exists():

            print(
                f"[WARNING] Missing source images directory:"
                f"\n          {source_images}"
            )

        if not source_labels.exists():

            print(
                f"[WARNING] Missing source labels directory:"
                f"\n          {source_labels}"
            )

        if not main_images.exists():

            print(
                f"[WARNING] Missing main images directory:"
                f"\n          {main_images}"
            )

        if not main_labels.exists():

            print(
                f"[WARNING] Missing main labels directory:"
                f"\n          {main_labels}"
            )


# ============================================================
# GET UNIQUE FILENAME
# ============================================================

def get_unique_filename(
    destination_image,
    destination_label
):

    if not AUTO_RENAME_DUPLICATES:

        raise FileExistsError(
            f"Duplicate filename detected:\n"
            f"{destination_image.name}"
        )

    stem = destination_image.stem
    suffix = destination_image.suffix

    counter = 1

    while True:

        new_stem = (
            f"{stem}_merged_{counter}"
        )

        new_image = (
            destination_image.parent /
            f"{new_stem}{suffix}"
        )

        new_label = (
            destination_label.parent /
            f"{new_stem}.txt"
        )

        if (
            not new_image.exists()
            and
            not new_label.exists()
        ):

            return new_image, new_label

        counter += 1


# ============================================================
# PROCESS LABEL
# ============================================================

def process_label(
    label_path,
    split
):

    new_lines = []

    image_classes = set()

    changed = False

    with open(
        label_path,
        "r",
        encoding="utf-8"
    ) as file:

        lines = file.readlines()

    for line_number, line in enumerate(
        lines,
        start=1
    ):

        stripped = line.strip()

        if not stripped:

            continue

        parts = stripped.split()

        # ----------------------------------------------------
        # Validate YOLO format
        # ----------------------------------------------------

        if len(parts) < 5:

            invalid_labels.append(
                (
                    label_path,
                    line_number,
                    "Less than 5 values"
                )
            )

            continue

        try:

            source_class_id = int(parts[0])

        except ValueError:

            invalid_labels.append(
                (
                    label_path,
                    line_number,
                    "Invalid class ID"
                )
            )

            continue

        stats[split]["annotations_found"] += 1

        source_class_annotation_count[
            source_class_id
        ] += 1

        # ----------------------------------------------------
        # Check mapping
        # ----------------------------------------------------

        if source_class_id not in CLASS_MAPPING:

            unmapped_classes[
                source_class_id
            ] += 1

            continue

        # ----------------------------------------------------
        # Convert class ID
        # ----------------------------------------------------

        main_class_id = CLASS_MAPPING[
            source_class_id
        ]

        parts[0] = str(main_class_id)

        new_line = " ".join(parts)

        new_lines.append(
            new_line
        )

        changed = True

        # ----------------------------------------------------
        # Statistics
        # ----------------------------------------------------

        stats[split][
            "annotations_converted"
        ] += 1

        main_class_annotation_count[
            main_class_id
        ] += 1

        image_classes.add(
            source_class_id
        )

    # --------------------------------------------------------
    # Count image occurrence per class
    # --------------------------------------------------------

    for source_class_id in image_classes:

        source_class_image_count[
            source_class_id
        ] += 1

        main_class_id = CLASS_MAPPING[
            source_class_id
        ]

        main_class_image_count[
            main_class_id
        ] += 1

    return new_lines, changed


# ============================================================
# PROCESS SPLIT
# ============================================================

def process_split(split):

    print_header(
        f"SCANNING {split.upper()}"
    )

    source_images_dir = (
        SOURCE_DATASET /
        split /
        "images"
    )

    source_labels_dir = (
        SOURCE_DATASET /
        split /
        "labels"
    )

    main_images_dir = (
        MAIN_DATASET /
        split /
        "images"
    )

    main_labels_dir = (
        MAIN_DATASET /
        split /
        "labels"
    )

    if not source_images_dir.exists():

        print(
            f"[SKIP] Source images directory missing."
        )

        return

    if not source_labels_dir.exists():

        print(
            f"[SKIP] Source labels directory missing."
        )

        return

    # Create destination directories only when actually
    # merging.

    if not DRY_RUN:

        main_images_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        main_labels_dir.mkdir(
            parents=True,
            exist_ok=True
        )

    image_files = sorted(
        file
        for file in source_images_dir.iterdir()
        if (
            file.is_file()
            and
            file.suffix.lower()
            in IMAGE_EXTENSIONS
        )
    )

    stats[split][
        "images_found"
    ] = len(image_files)

    print(
        f"Images found: {len(image_files):,}"
    )

    for image_path in image_files:

        label_path = (
            source_labels_dir /
            f"{image_path.stem}.txt"
        )

        # ----------------------------------------------------
        # Missing label
        # ----------------------------------------------------

        if not label_path.exists():

            missing_labels.append(
                image_path
            )

            stats[split][
                "images_skipped"
            ] += 1

            continue

        # ----------------------------------------------------
        # Process label
        # ----------------------------------------------------

        new_lines, changed = process_label(
            label_path,
            split
        )

        # ----------------------------------------------------
        # Entire image contains only unmapped classes
        # ----------------------------------------------------

        if not new_lines:

            stats[split][
                "images_skipped"
            ] += 1

            continue

        # ----------------------------------------------------
        # Destination paths
        # ----------------------------------------------------

        destination_image = (
            main_images_dir /
            image_path.name
        )

        destination_label = (
            main_labels_dir /
            label_path.name
        )

        # ----------------------------------------------------
        # Duplicate filename
        # ----------------------------------------------------

        if (
            destination_image.exists()
            or
            destination_label.exists()
        ):

            duplicate_files.append(
                (
                    split,
                    image_path.name
                )
            )

            if AUTO_RENAME_DUPLICATES:

                (
                    destination_image,
                    destination_label
                ) = get_unique_filename(
                    destination_image,
                    destination_label
                )

                stats[split][
                    "images_renamed"
                ] += 1

            else:

                stats[split][
                    "images_skipped"
                ] += 1

                continue

        # ----------------------------------------------------
        # Ready to merge
        # ----------------------------------------------------

        stats[split][
            "images_ready"
        ] += 1

        # ----------------------------------------------------
        # ACTUAL COPY
        # ----------------------------------------------------

        if not DRY_RUN:

            shutil.copy2(
                image_path,
                destination_image
            )

            with open(
                destination_label,
                "w",
                encoding="utf-8"
            ) as file:

                file.write(
                    "\n".join(new_lines)
                )

                file.write("\n")


# ============================================================
# SHOW UNMAPPED CLASSES
# ============================================================

def show_unmapped_classes():

    print_header(
        "UNMAPPED SOURCE CLASSES"
    )

    if not unmapped_classes:

        print(
            "No unmapped classes found."
        )

        return

    print(
        "These annotations were found but "
        "have no destination class:\n"
    )

    for source_id in sorted(
        unmapped_classes
    ):

        count = unmapped_classes[
            source_id
        ]

        class_name = SOURCE_CLASSES.get(
            source_id,
            "UNKNOWN"
        )

        print(
            f"{source_id:>3} : "
            f"{class_name:<35} "
            f"{count:,} annotations"
        )


# ============================================================
# SHOW DUPLICATES
# ============================================================

def show_duplicates():

    print_header(
        "DUPLICATE FILENAMES"
    )

    if not duplicate_files:

        print(
            "No duplicate filenames found."
        )

        return

    print(
        f"Found {len(duplicate_files):,} "
        f"duplicate filenames."
    )

    for split, filename in duplicate_files[:20]:

        print(
            f"  [{split}] {filename}"
        )

    if len(duplicate_files) > 20:

        print(
            f"\n... and "
            f"{len(duplicate_files) - 20:,} more."
        )

    if AUTO_RENAME_DUPLICATES:

        print(
            "\nDuplicates will be automatically renamed."
        )

    else:

        print(
            "\nDuplicates will NOT be merged."
        )


# ============================================================
# SHOW INVALID LABELS
# ============================================================

def show_invalid_labels():

    print_header(
        "INVALID LABELS"
    )

    if not invalid_labels:

        print(
            "No invalid label lines found."
        )

        return

    print(
        f"Found {len(invalid_labels):,} "
        f"invalid label lines."
    )

    for (
        label_path,
        line_number,
        reason
    ) in invalid_labels[:20]:

        print(
            f"  {label_path.name}:"
            f"{line_number} -> {reason}"
        )


# ============================================================
# SHOW MISSING LABELS
# ============================================================

def show_missing_labels():

    print_header(
        "MISSING LABELS"
    )

    if not missing_labels:

        print(
            "No missing labels found."
        )

        return

    print(
        f"Found {len(missing_labels):,} "
        f"images without labels."
    )

    for image_path in missing_labels[:20]:

        print(
            f"  {image_path.name}"
        )


# ============================================================
# SHOW SPLIT STATISTICS
# ============================================================

def show_split_statistics():

    print_header(
        "SPLIT STATISTICS"
    )

    for split in SPLITS:

        data = stats[split]

        print()
        print(
            f"{split.upper()}"
        )

        print(
            f"  Images found        : "
            f"{data['images_found']:,}"
        )

        print(
            f"  Images ready        : "
            f"{data['images_ready']:,}"
        )

        print(
            f"  Images skipped      : "
            f"{data['images_skipped']:,}"
        )

        print(
            f"  Images renamed      : "
            f"{data['images_renamed']:,}"
        )

        print(
            f"  Annotations found   : "
            f"{data['annotations_found']:,}"
        )

        print(
            f"  Annotations converted: "
            f"{data['annotations_converted']:,}"
        )


# ============================================================
# SHOW CLASS STATISTICS
# ============================================================

def show_class_statistics():

    print_header(
        "CONVERTED ANNOTATIONS BY MAIN CLASS"
    )

    for main_id in sorted(MAIN_CLASSES):

        class_name = MAIN_CLASSES[
            main_id
        ]

        count = main_class_annotation_count[
            main_id
        ]

        print(
            f"{main_id:>3} : "
            f"{class_name:<35} "
            f"{count:,}"
        )


# ============================================================
# SAFETY CHECK
# ============================================================

def safety_check():

    print_header(
        "SAFETY CHECK"
    )

    if unmapped_classes:

        print(
            "!!! MERGE BLOCKED !!!"
        )

        print(
            "\nThere are unmapped source classes."
        )

        print(
            "You need to either:"
        )

        print(
            "  1. Add them to CLASS_MAPPING"
        )

        print(
            "  2. Intentionally exclude them"
        )

        print(
            "\nNo files will be modified."
        )

        return False

    if invalid_labels:

        print(
            "!!! MERGE BLOCKED !!!"
        )

        print(
            "\nInvalid label lines were found."
        )

        print(
            "Fix the source dataset first."
        )

        print(
            "\nNo files will be modified."
        )

        return False

    print(
        "[OK] No unmapped classes."
    )

    print(
        "[OK] No invalid labels."
    )

    return True


# ============================================================
# FINAL SUMMARY
# ============================================================

def show_final_summary():

    print_header(
        "FINAL SUMMARY"
    )

    total_found = sum(
        stats[s]["images_found"]
        for s in SPLITS
    )

    total_ready = sum(
        stats[s]["images_ready"]
        for s in SPLITS
    )

    total_skipped = sum(
        stats[s]["images_skipped"]
        for s in SPLITS
    )

    total_annotations = sum(
        stats[s]["annotations_found"]
        for s in SPLITS
    )

    total_converted = sum(
        stats[s]["annotations_converted"]
        for s in SPLITS
    )

    print(
        f"Total images found       : "
        f"{total_found:,}"
    )

    print(
        f"Images ready to merge    : "
        f"{total_ready:,}"
    )

    print(
        f"Images skipped           : "
        f"{total_skipped:,}"
    )

    print(
        f"Total annotations        : "
        f"{total_annotations:,}"
    )

    print(
        f"Annotations converted   : "
        f"{total_converted:,}"
    )

    print()

    if DRY_RUN:

        print(
            "MODE: DRY RUN"
        )

        print(
            "No files were modified."
        )

        print(
            "\nIf everything looks correct,"
        )

        print(
            "change:"
        )

        print(
            "    DRY_RUN = False"
        )

        print(
            "\nand run the script again."
        )

    else:

        print(
            "MODE: ACTUAL MERGE"
        )

        print(
            "Dataset merge completed."
        )


# ============================================================
# MAIN
# ============================================================

def main():

    print_header(
        "YOLO DATASET MERGE TOOL"
    )

    print(
        f"Source dataset:\n"
        f"  {SOURCE_DATASET}"
    )

    print(
        f"\nMain dataset:\n"
        f"  {MAIN_DATASET}"
    )

    print(
        f"\nDry run:\n"
        f"  {DRY_RUN}"
    )

    # --------------------------------------------------------
    # Configuration
    # --------------------------------------------------------

    validate_configuration()

    show_class_mapping()

    # --------------------------------------------------------
    # Scan
    # --------------------------------------------------------

    for split in SPLITS:

        process_split(split)

    # --------------------------------------------------------
    # Reports
    # --------------------------------------------------------

    show_unmapped_classes()

    show_duplicates()

    show_invalid_labels()

    show_missing_labels()

    show_split_statistics()

    show_class_statistics()

    # --------------------------------------------------------
    # Safety
    # --------------------------------------------------------

    if not safety_check():

        return

    # --------------------------------------------------------
    # Final
    # --------------------------------------------------------

    show_final_summary()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print(
            "\n\nOperation cancelled by user."
        )

    except Exception as error:

        print()
        print("=" * 75)
        print("ERROR")
        print("=" * 75)
        print(error)
