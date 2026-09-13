from pathlib import Path
import shutil


# ============================================================
# CONFIGURATION
# ============================================================

# Path to the YOLO dataset you want to filter.
#
# Expected structure:
#
# dataset/
# ├── images/
# ├── labels/
# └── classes.txt
#

DATASET_DIR = Path(
    "/home/singularity/Downloads/binjal1"
)


# ============================================================
# CLASSES TO KEEP
# ============================================================
#
# Put the ORIGINAL class IDs that you want to keep.
#
# Example:
#
# classes.txt:
#
# 0 tomato
# 1 potato
# 2 corn
# 3 aphid
# 4 whitefly
# 5 tomato_leaf
#
# If you want:
#
# tomato
# aphid
# whitefly
#
# use:
#
# KEEP_CLASSES = [0, 3, 4]
#

KEEP_CLASSES = [
  2
]


# ============================================================
# DATASET PATHS
# ============================================================

IMAGES_DIR = DATASET_DIR / "images"
LABELS_DIR = DATASET_DIR / "labels"
CLASSES_FILE = DATASET_DIR / "classes.txt"


# ============================================================
# BACKUP
# ============================================================
#
# If True:
#
# The script creates:
#
# dataset/
# └── backup/
#     ├── images/
#     ├── labels/
#     └── classes.txt
#
# before modifying anything.
#

CREATE_BACKUP = True

BACKUP_DIR = DATASET_DIR / "backup"


# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


# ============================================================
# READ CLASSES
# ============================================================

def read_classes():

    if not CLASSES_FILE.exists():

        raise FileNotFoundError(
            f"classes.txt not found:\n"
            f"{CLASSES_FILE}"
        )

    with open(
        CLASSES_FILE,
        "r",
        encoding="utf-8",
    ) as file:

        classes = [
            line.strip()
            for line in file
            if line.strip()
        ]

    return classes


# ============================================================
# SHOW CLASSES
# ============================================================

def show_classes(classes):

    print()
    print("=" * 60)
    print("SOURCE DATASET CLASSES")
    print("=" * 60)

    for index, class_name in enumerate(classes):

        print(
            f"{index:>3} : {class_name}"
        )


# ============================================================
# VALIDATE KEEP CLASSES
# ============================================================

def validate_keep_classes(classes):

    if not KEEP_CLASSES:

        raise ValueError(
            "KEEP_CLASSES is empty."
        )

    for class_id in KEEP_CLASSES:

        if class_id < 0:

            raise ValueError(
                f"Invalid class ID: {class_id}"
            )

        if class_id >= len(classes):

            raise ValueError(
                f"Class ID {class_id} does not "
                f"exist in classes.txt."
            )


# ============================================================
# CREATE NEW CLASS MAPPING
# ============================================================

def create_class_mapping(classes):

    """
    Example:

    Original:

        0 tomato
        1 potato
        2 corn
        3 aphid
        4 whitefly

    KEEP_CLASSES:

        [0, 3, 4]

    New:

        0 tomato
        1 aphid
        2 whitefly

    Mapping:

        0 -> 0
        3 -> 1
        4 -> 2
    """

    class_mapping = {}

    new_classes = []

    for new_id, old_id in enumerate(
        KEEP_CLASSES
    ):

        class_mapping[old_id] = new_id

        new_classes.append(
            classes[old_id]
        )

    return class_mapping, new_classes


# ============================================================
# BACKUP DATASET
# ============================================================

def create_backup():

    if not CREATE_BACKUP:
        return

    print()
    print("=" * 60)
    print("CREATING BACKUP")
    print("=" * 60)

    backup_images = BACKUP_DIR / "images"
    backup_labels = BACKUP_DIR / "labels"
    backup_classes = BACKUP_DIR / "classes.txt"

    backup_images.mkdir(
        parents=True,
        exist_ok=True
    )

    backup_labels.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Backup images
    # --------------------------------------------------------

    for image in IMAGES_DIR.iterdir():

        if (
            image.is_file()
            and image.suffix.lower()
            in IMAGE_EXTENSIONS
        ):

            shutil.copy2(
                image,
                backup_images / image.name
            )

    # --------------------------------------------------------
    # Backup labels
    # --------------------------------------------------------

    for label in LABELS_DIR.glob("*.txt"):

        shutil.copy2(
            label,
            backup_labels / label.name
        )

    # --------------------------------------------------------
    # Backup classes.txt
    # --------------------------------------------------------

    shutil.copy2(
        CLASSES_FILE,
        backup_classes
    )

    print(
        f"Backup created at:\n"
        f"{BACKUP_DIR}"
    )


# ============================================================
# PROCESS LABEL
# ============================================================

def process_label(
    label_file,
    class_mapping,
):
    """
    Reads one YOLO label file.

    Keeps only annotations whose class ID
    exists in class_mapping.

    Returns:

        kept_annotations
        has_kept_annotations
    """

    kept_lines = []

    with open(
        label_file,
        "r",
        encoding="utf-8",
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
        # Validate YOLO annotation
        # ----------------------------------------------------

        if len(parts) < 5:

            print(
                f"WARNING: Invalid annotation:"
                f"\n  File: {label_file.name}"
                f"\n  Line: {line_number}"
            )

            continue

        try:

            old_class_id = int(parts[0])

        except ValueError:

            print(
                f"WARNING: Invalid class ID:"
                f"\n  File: {label_file.name}"
                f"\n  Line: {line_number}"
            )

            continue

        # ----------------------------------------------------
        # Ignore unwanted classes
        # ----------------------------------------------------

        if old_class_id not in class_mapping:

            continue

        # ----------------------------------------------------
        # Remap class ID
        # ----------------------------------------------------

        new_class_id = class_mapping[
            old_class_id
        ]

        parts[0] = str(
            new_class_id
        )

        kept_lines.append(
            " ".join(parts)
        )

    return kept_lines


# ============================================================
# DELETE IMAGE + LABEL
# ============================================================

def delete_pair(
    image_file,
    label_file,
):

    if image_file.exists():

        image_file.unlink()

    if label_file.exists():

        label_file.unlink()


# ============================================================
# MAIN FILTER
# ============================================================

def filter_dataset():

    print("=" * 60)
    print("YOLO DATASET CLASS FILTER")
    print("=" * 60)

    # --------------------------------------------------------
    # Validate directories
    # --------------------------------------------------------

    if not DATASET_DIR.exists():

        raise FileNotFoundError(
            f"Dataset directory does not exist:\n"
            f"{DATASET_DIR}"
        )

    if not IMAGES_DIR.exists():

        raise FileNotFoundError(
            f"Images directory does not exist:\n"
            f"{IMAGES_DIR}"
        )

    if not LABELS_DIR.exists():

        raise FileNotFoundError(
            f"Labels directory does not exist:\n"
            f"{LABELS_DIR}"
        )

    # --------------------------------------------------------
    # Read classes
    # --------------------------------------------------------

    classes = read_classes()

    show_classes(classes)

    validate_keep_classes(classes)

    # --------------------------------------------------------
    # Create mapping
    # --------------------------------------------------------

    class_mapping, new_classes = (
        create_class_mapping(classes)
    )

    # --------------------------------------------------------
    # Display mapping
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("CLASS MAPPING")
    print("=" * 60)

    for old_id, new_id in class_mapping.items():

        print(
            f"{old_id} "
            f"({classes[old_id]})"
            f"  ->  "
            f"{new_id} "
            f"({new_classes[new_id]})"
        )

    # --------------------------------------------------------
    # Create backup
    # --------------------------------------------------------

    create_backup()

    # --------------------------------------------------------
    # Find images
    # --------------------------------------------------------

    images = sorted(
        image
        for image in IMAGES_DIR.iterdir()
        if (
            image.is_file()
            and image.suffix.lower()
            in IMAGE_EXTENSIONS
        )
    )

    print()
    print(
        f"Found {len(images)} images."
    )

    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    kept_images = 0
    removed_images = 0
    modified_labels = 0

    # --------------------------------------------------------
    # Process images
    # --------------------------------------------------------

    for image in images:

        label_file = (
            LABELS_DIR /
            f"{image.stem}.txt"
        )

        # ----------------------------------------------------
        # Image without label
        # ----------------------------------------------------

        if not label_file.exists():

            print(
                f"[REMOVE] {image.name}"
                f" - no label"
            )

            image.unlink()

            removed_images += 1

            continue

        # ----------------------------------------------------
        # Process annotations
        # ----------------------------------------------------

        kept_lines = process_label(
            label_file,
            class_mapping,
        )

        # ----------------------------------------------------
        # No wanted classes found
        # ----------------------------------------------------

        if not kept_lines:

            print(
                f"[REMOVE] {image.name}"
                f" - no wanted classes"
            )

            delete_pair(
                image,
                label_file,
            )

            removed_images += 1

            continue

        # ----------------------------------------------------
        # Rewrite label
        # ----------------------------------------------------

        with open(
            label_file,
            "w",
            encoding="utf-8",
        ) as file:

            for line in kept_lines:

                file.write(
                    line + "\n"
                )

        kept_images += 1
        modified_labels += 1

        print(
            f"[KEEP]   {image.name}"
        )

    # --------------------------------------------------------
    # Update classes.txt
    # --------------------------------------------------------

    with open(
        CLASSES_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        for class_name in new_classes:

            file.write(
                class_name + "\n"
            )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("FILTER COMPLETE")
    print("=" * 60)

    print(
        f"Images kept    : {kept_images}"
    )

    print(
        f"Images removed : {removed_images}"
    )

    print(
        f"Labels updated : {modified_labels}"
    )

    print(
        f"Final classes  : {len(new_classes)}"
    )

    print()
    print("FINAL CLASSES:")

    for index, class_name in enumerate(
        new_classes
    ):

        print(
            f"  {index}: {class_name}"
        )

    if CREATE_BACKUP:

        print()
        print(
            f"Original dataset backup:"
            f"\n{BACKUP_DIR}"
        )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        filter_dataset()

    except Exception as error:

        print()
        print("=" * 60)
        print("ERROR")
        print("=" * 60)
        print(error)
