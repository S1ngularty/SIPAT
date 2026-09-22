from pathlib import Path
import random
import shutil
import yaml


# ============================================================
# CONFIGURATION
# ============================================================

# Raw dataset
SOURCE_DATASET = Path(
    "/home/singularity/Downloads/crop_identification_datasets/Cabai_Rawit.v5i.yolov8-obb"
)

# Where the processed dataset will be created
OUTPUT_DATASET = Path(
    "/home/singularity/Downloads/processed_dataset"
)


# ============================================================
# SPLIT RATIO
# ============================================================

TRAIN_RATIO = 0.70
VALID_RATIO = 0.15
TEST_RATIO = 0.15


# ============================================================
# RANDOM SEED
# ============================================================
#
# Using a fixed seed means that running the script again with
# the same dataset produces the same split.
#

RANDOM_SEED = 42


# ============================================================
# SOURCE DIRECTORIES
# ============================================================

IMAGES_DIR = SOURCE_DATASET / "images"
LABELS_DIR = SOURCE_DATASET / "labels"
CLASSES_FILE = SOURCE_DATASET / "classes.txt"


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
        encoding="utf-8"
    ) as file:

        classes = [
            line.strip()
            for line in file
            if line.strip()
        ]

    if not classes:

        raise ValueError(
            "classes.txt is empty."
        )

    return classes


# ============================================================
# SHOW CLASSES
# ============================================================

def show_classes(classes):

    print()
    print("=" * 70)
    print("CLASSES")
    print("=" * 70)

    for index, class_name in enumerate(classes):

        print(
            f"{index:>3}: {class_name}"
        )


# ============================================================
# FIND IMAGES
# ============================================================

def find_images():

    if not IMAGES_DIR.exists():

        raise FileNotFoundError(
            f"Images directory not found:\n"
            f"{IMAGES_DIR}"
        )

    images = [
        file
        for file in IMAGES_DIR.iterdir()
        if file.is_file()
        and file.suffix.lower() in IMAGE_EXTENSIONS
    ]

    return sorted(images)


# ============================================================
# VALIDATE IMAGE/LABEL PAIRS
# ============================================================

def validate_pairs(images):

    if not LABELS_DIR.exists():

        raise FileNotFoundError(
            f"Labels directory not found:\n"
            f"{LABELS_DIR}"
        )

    valid_pairs = []

    missing_labels = []

    for image in images:

        label_file = (
            LABELS_DIR /
            f"{image.stem}.txt"
        )

        if not label_file.exists():

            missing_labels.append(
                image.name
            )

            continue

        valid_pairs.append(
            (image, label_file)
        )

    # --------------------------------------------------------
    # Report missing labels
    # --------------------------------------------------------

    if missing_labels:

        print()
        print("=" * 70)
        print("WARNING: IMAGES WITHOUT LABELS")
        print("=" * 70)

        for filename in missing_labels[:20]:

            print(
                f"  {filename}"
            )

        if len(missing_labels) > 20:

            print(
                f"  ... and "
                f"{len(missing_labels) - 20} more"
            )

        raise ValueError(
            f"\nFound {len(missing_labels)} "
            f"images without labels."
        )

    return valid_pairs


# ============================================================
# CREATE OUTPUT DIRECTORIES
# ============================================================

def create_directories():

    for split in [
        "train",
        "valid",
        "test",
    ]:

        (
            OUTPUT_DATASET /
            split /
            "images"
        ).mkdir(
            parents=True,
            exist_ok=True
        )

        (
            OUTPUT_DATASET /
            split /
            "labels"
        ).mkdir(
            parents=True,
            exist_ok=True
        )


# ============================================================
# SPLIT DATASET
# ============================================================

def split_dataset(pairs):

    random.seed(
        RANDOM_SEED
    )

    # Shuffle the image/label pairs together
    random.shuffle(pairs)

    total = len(pairs)

    train_count = int(
        total * TRAIN_RATIO
    )

    valid_count = int(
        total * VALID_RATIO
    )

    test_count = (
        total
        - train_count
        - valid_count
    )

    train_pairs = pairs[
        :train_count
    ]

    valid_pairs = pairs[
        train_count:
        train_count + valid_count
    ]

    test_pairs = pairs[
        train_count + valid_count:
    ]

    return (
        train_pairs,
        valid_pairs,
        test_pairs,
    )


# ============================================================
# COPY SPLIT
# ============================================================

def copy_split(
    split_name,
    pairs
):

    images_output = (
        OUTPUT_DATASET /
        split_name /
        "images"
    )

    labels_output = (
        OUTPUT_DATASET /
        split_name /
        "labels"
    )

    print()
    print(
        f"Creating {split_name} dataset..."
    )

    for image, label in pairs:

        shutil.copy2(
            image,
            images_output /
            image.name
        )

        shutil.copy2(
            label,
            labels_output /
            label.name
        )

    print(
        f"  Images : {len(pairs)}"
    )

    print(
        f"  Labels : {len(pairs)}"
    )


# ============================================================
# CREATE DATA.YAML
# ============================================================

def create_data_yaml(classes):

    data = {
        "path": str(OUTPUT_DATASET),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(classes),
        "names": {
            index: name
            for index, name in enumerate(classes)
        },
    }

    data_yaml = (
        OUTPUT_DATASET /
        "data.yaml"
    )

    with open(
        data_yaml,
        "w",
        encoding="utf-8"
    ) as file:

        yaml.safe_dump(
            data,
            file,
            sort_keys=False,
            allow_unicode=True
        )

    print()
    print(
        f"Created data.yaml:\n"
        f"{data_yaml}"
    )


# ============================================================
# SHOW SUMMARY
# ============================================================

def show_summary(
    train_pairs,
    valid_pairs,
    test_pairs
):

    total = (
        len(train_pairs)
        + len(valid_pairs)
        + len(test_pairs)
    )

    print()
    print("=" * 70)
    print("DATASET SPLIT SUMMARY")
    print("=" * 70)

    print(
        f"Total : {total}"
    )

    print()

    print(
        f"TRAIN : {len(train_pairs):>6} "
        f"({len(train_pairs) / total * 100:.2f}%)"
    )

    print(
        f"VALID : {len(valid_pairs):>6} "
        f"({len(valid_pairs) / total * 100:.2f}%)"
    )

    print(
        f"TEST  : {len(test_pairs):>6} "
        f"({len(test_pairs) / total * 100:.2f}%)"
    )


# ============================================================
# MAIN
# ============================================================

def create_dataset():

    print("=" * 70)
    print("YOLO DATASET SPLITTER")
    print("=" * 70)

    print(
        f"Source:\n"
        f"{SOURCE_DATASET}"
    )

    print(
        f"\nOutput:\n"
        f"{OUTPUT_DATASET}"
    )

    # --------------------------------------------------------
    # Validate ratios
    # --------------------------------------------------------

    ratio_total = (
        TRAIN_RATIO
        + VALID_RATIO
        + TEST_RATIO
    )

    if abs(ratio_total - 1.0) > 0.0001:

        raise ValueError(
            "Train/valid/test ratios must add up to 1.0."
        )

    # --------------------------------------------------------
    # Read classes
    # --------------------------------------------------------

    classes = read_classes()

    show_classes(classes)

    # --------------------------------------------------------
    # Find images
    # --------------------------------------------------------

    images = find_images()

    print()
    print(
        f"Images found: {len(images)}"
    )

    if not images:

        raise ValueError(
            "No images found."
        )

    # --------------------------------------------------------
    # Validate image/label pairs
    # --------------------------------------------------------

    pairs = validate_pairs(
        images
    )

    print(
        f"Valid image/label pairs: "
        f"{len(pairs)}"
    )

    # --------------------------------------------------------
    # Prevent accidental overwrite
    # --------------------------------------------------------

    if OUTPUT_DATASET.exists():

        raise FileExistsError(
            f"\nOutput dataset already exists:\n"
            f"{OUTPUT_DATASET}\n\n"
            f"Delete it or change OUTPUT_DATASET "
            f"before running the script."
        )

    # --------------------------------------------------------
    # Create directories
    # --------------------------------------------------------

    create_directories()

    # --------------------------------------------------------
    # Split
    # --------------------------------------------------------

    (
        train_pairs,
        valid_pairs,
        test_pairs,
    ) = split_dataset(
        pairs
    )

    # --------------------------------------------------------
    # Copy files
    # --------------------------------------------------------

    copy_split(
        "train",
        train_pairs
    )

    copy_split(
        "valid",
        valid_pairs
    )

    copy_split(
        "test",
        test_pairs
    )

    # --------------------------------------------------------
    # Create data.yaml
    # --------------------------------------------------------

    create_data_yaml(
        classes
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    show_summary(
        train_pairs,
        valid_pairs,
        test_pairs
    )

    print()
    print("=" * 70)
    print("DATASET PREPROCESSING COMPLETE")
    print("=" * 70)

    print(
        f"\nOutput dataset:\n"
        f"{OUTPUT_DATASET}"
    )

    print(
        "\nImages and labels were copied."
    )

    print(
        "Original dataset was NOT modified."
    )

    print(
        "\nRecommended:"
    )

    print(
        "Run dataset_validation.py "
        "on the new dataset."
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        create_dataset()

    except Exception as error:

        print()
        print("=" * 70)
        print("ERROR")
        print("=" * 70)
        print(error)