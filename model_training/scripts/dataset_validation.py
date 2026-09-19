from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

# Path to your YOLO dataset.
#
# Expected structure:
#
# dataset/
# ├── images/
# ├── labels/
# └── classes.txt
#

DATASET_DIR = Path(
    "/home/singularity/Downloads/eggplant_leaf(700)"
)


# ============================================================
# DATASET PATHS
# ============================================================

IMAGES_DIR = DATASET_DIR / "images"

LABELS_DIR = DATASET_DIR / "labels"

CLASSES_FILE = DATASET_DIR / "classes.txt"


# ============================================================
# IMAGE EXTENSIONS
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

    return classes


# ============================================================
# FIND IMAGES
# ============================================================

def find_images():

    images = []

    for extension in IMAGE_EXTENSIONS:

        images.extend(
            IMAGES_DIR.rglob(
                f"*{extension}"
            )
        )

        images.extend(
            IMAGES_DIR.rglob(
                f"*{extension.upper()}"
            )
        )

    return sorted(set(images))


# ============================================================
# FIND LABELS
# ============================================================

def find_labels():

    return sorted(
        LABELS_DIR.rglob("*.txt")
    )


# ============================================================
# GET RELATIVE FILE KEY
# ============================================================

def get_key(file, base_dir):

    return file.relative_to(
        base_dir
    ).with_suffix("")


# ============================================================
# CHECK IMAGE / LABEL PAIRS
# ============================================================

def check_image_labels(
    image_files,
    label_files
):

    print()
    print("=" * 60)
    print("CHECKING IMAGE / LABEL PAIRS")
    print("=" * 60)

    image_keys = {
        get_key(
            image,
            IMAGES_DIR
        )
        for image in image_files
    }

    label_keys = {
        get_key(
            label,
            LABELS_DIR
        )
        for label in label_files
    }

    # --------------------------------------------------------
    # Images without labels
    # --------------------------------------------------------

    images_without_labels = (
        image_keys - label_keys
    )

    if images_without_labels:

        print()
        print("IMAGES WITHOUT LABELS:")

        for key in sorted(
            images_without_labels
        ):

            print(
                f"  {key}"
            )

    # --------------------------------------------------------
    # Labels without images
    # --------------------------------------------------------

    labels_without_images = (
        label_keys - image_keys
    )

    if labels_without_images:

        print()
        print("LABELS WITHOUT IMAGES:")

        for key in sorted(
            labels_without_images
        ):

            print(
                f"  {key}"
            )

    print()

    print(
        f"Images without labels : "
        f"{len(images_without_labels)}"
    )

    print(
        f"Labels without images : "
        f"{len(labels_without_images)}"
    )

    return (
        images_without_labels,
        labels_without_images
    )


# ============================================================
# CHECK CLASS IDS
# ============================================================

def check_class_ids(
    label_files,
    classes
):

    print()
    print("=" * 60)
    print("CHECKING CLASS IDS")
    print("=" * 60)

    invalid_classes = []

    for label_file in label_files:

        with open(
            label_file,
            "r",
            encoding="utf-8"
        ) as file:

            for line_number, line in enumerate(
                file,
                start=1
            ):

                stripped = line.strip()

                # Ignore empty lines
                if not stripped:

                    continue

                parts = stripped.split()

                # ------------------------------------------------
                # Only need the first value because it is the
                # YOLO class ID.
                # ------------------------------------------------

                try:

                    class_id = int(parts[0])

                except (
                    ValueError,
                    IndexError
                ):

                    invalid_classes.append(
                        (
                            label_file,
                            line_number,
                            parts[0]
                            if parts
                            else "EMPTY"
                        )
                    )

                    continue

                # ------------------------------------------------
                # Check whether class exists
                # ------------------------------------------------

                if (
                    class_id < 0
                    or
                    class_id >= len(classes)
                ):

                    invalid_classes.append(
                        (
                            label_file,
                            line_number,
                            class_id
                        )
                    )

    # --------------------------------------------------------
    # Print results
    # --------------------------------------------------------

    if invalid_classes:

        print()
        print("INVALID CLASS IDS:")

        for (
            label_file,
            line_number,
            class_id
        ) in invalid_classes:

            print(
                f"  {label_file} "
                f"(line {line_number}) "
                f"-> class {class_id}"
            )

    else:

        print()
        print(
            "All class IDs exist in classes.txt."
        )

    print()

    print(
        f"Invalid class annotations : "
        f"{len(invalid_classes)}"
    )

    return invalid_classes


# ============================================================
# MAIN
# ============================================================

def validate_dataset():

    print("=" * 60)
    print("YOLO DATASET CHECK")
    print("=" * 60)

    # --------------------------------------------------------
    # Check directories
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

    # --------------------------------------------------------
    # Find files
    # --------------------------------------------------------

    image_files = find_images()

    label_files = find_labels()

    print()
    print(
        f"Images found : {len(image_files)}"
    )

    print(
        f"Labels found : {len(label_files)}"
    )

    print(
        f"Classes found: {len(classes)}"
    )

    # --------------------------------------------------------
    # Check image / label matching
    # --------------------------------------------------------

    (
        images_without_labels,
        labels_without_images
    ) = check_image_labels(
        image_files,
        label_files
    )

    # --------------------------------------------------------
    # Check class IDs
    # --------------------------------------------------------

    invalid_classes = check_class_ids(
        label_files,
        classes
    )

    # --------------------------------------------------------
    # Final result
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("FINAL RESULT")
    print("=" * 60)

    total_problems = (
        len(images_without_labels)
        +
        len(labels_without_images)
        +
        len(invalid_classes)
    )

    if total_problems == 0:

        print()
        print("DATASET IS OK")
        print()
        print(
            "Every image has a label."
        )
        print(
            "Every label has an image."
        )
        print(
            "Every label uses an existing class."
        )

    else:

        print()
        print(
            f"DATASET HAS {total_problems} PROBLEM(S)"
        )

        print()

        if images_without_labels:

            print(
                f"Images without labels: "
                f"{len(images_without_labels)}"
            )

        if labels_without_images:

            print(
                f"Labels without images: "
                f"{len(labels_without_images)}"
            )

        if invalid_classes:

            print(
                f"Invalid class IDs: "
                f"{len(invalid_classes)}"
            )

    print()
    print(
        "No files were modified."
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        validate_dataset()

    except Exception as error:

        print()
        print("=" * 60)
        print("ERROR")
        print("=" * 60)
        print(error)
