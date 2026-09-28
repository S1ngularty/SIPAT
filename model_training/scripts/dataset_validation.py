from pathlib import Path
from collections import Counter


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_DIR = Path(
    "/home/singularity/Downloads/crop_identification_datasets/main_dataset"
)

CLASSES_FILE = DATASET_DIR / "classes.txt"


# ============================================================
# DATASET SPLITS
# ============================================================

SPLITS = {
    "train": DATASET_DIR / "train",
    "valid": DATASET_DIR / "valid",
    "test": DATASET_DIR / "test",
}


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

def find_images(images_dir):

    images = []

    if not images_dir.exists():
        return images

    for extension in IMAGE_EXTENSIONS:

        images.extend(
            images_dir.rglob(
                f"*{extension}"
            )
        )

        images.extend(
            images_dir.rglob(
                f"*{extension.upper()}"
            )
        )

    return sorted(set(images))


# ============================================================
# FIND LABELS
# ============================================================

def find_labels(labels_dir):

    if not labels_dir.exists():
        return []

    return sorted(
        labels_dir.rglob("*.txt")
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
    label_files,
    images_dir,
    labels_dir
):

    image_keys = {
        get_key(
            image,
            images_dir
        )
        for image in image_files
    }

    label_keys = {
        get_key(
            label,
            labels_dir
        )
        for label in label_files
    }

    # --------------------------------------------------------
    # Images without labels
    # --------------------------------------------------------

    images_without_labels = (
        image_keys - label_keys
    )

    # --------------------------------------------------------
    # Labels without images
    # --------------------------------------------------------

    labels_without_images = (
        label_keys - image_keys
    )

    return (
        images_without_labels,
        labels_without_images
    )


# ============================================================
# CHECK LABEL FILES
# ============================================================

def check_labels(
    label_files,
    classes
):

    invalid_annotations = []

    empty_label_files = []

    annotation_counts = Counter()

    image_counts = Counter()

    for label_file in label_files:

        file_class_ids = set()

        try:

            with open(
                label_file,
                "r",
                encoding="utf-8"
            ) as file:

                lines = file.readlines()

        except Exception as error:

            invalid_annotations.append(
                (
                    label_file,
                    0,
                    f"Could not read file: {error}"
                )
            )

            continue

        # ----------------------------------------------------
        # Empty label file
        # ----------------------------------------------------

        valid_lines = [
            line.strip()
            for line in lines
            if line.strip()
        ]

        if not valid_lines:

            empty_label_files.append(
                label_file
            )

            continue

        # ----------------------------------------------------
        # Check every annotation
        # ----------------------------------------------------

        for line_number, line in enumerate(
            valid_lines,
            start=1
        ):

            parts = line.split()

            # ------------------------------------------------
            # Need at least:
            #
            # class_id + coordinates
            #
            # This works for both:
            #
            # Detection:
            # class x y w h
            #
            # Segmentation:
            # class x1 y1 x2 y2 ...
            # ------------------------------------------------

            if len(parts) < 2:

                invalid_annotations.append(
                    (
                        label_file,
                        line_number,
                        "Malformed annotation"
                    )
                )

                continue

            # ------------------------------------------------
            # Parse class ID
            # ------------------------------------------------

            try:

                class_id = int(parts[0])

            except ValueError:

                invalid_annotations.append(
                    (
                        label_file,
                        line_number,
                        f"Invalid class ID: {parts[0]}"
                    )
                )

                continue

            # ------------------------------------------------
            # Check class range
            # ------------------------------------------------

            if (
                class_id < 0
                or
                class_id >= len(classes)
            ):

                invalid_annotations.append(
                    (
                        label_file,
                        line_number,
                        f"Class ID {class_id} "
                        f"does not exist"
                    )
                )

                continue

            # ------------------------------------------------
            # Count annotation
            # ------------------------------------------------

            annotation_counts[class_id] += 1

            file_class_ids.add(
                class_id
            )

        # ----------------------------------------------------
        # Count image once per class
        #
        # Example:
        #
        # Image contains:
        # class 2
        # class 2
        # class 5
        #
        # Image count:
        #
        # class 2 -> +1 image
        # class 5 -> +1 image
        #
        # NOT +2 for class 2.
        # ----------------------------------------------------

        for class_id in file_class_ids:

            image_counts[class_id] += 1

    return (
        annotation_counts,
        image_counts,
        invalid_annotations,
        empty_label_files
    )


# ============================================================
# VALIDATE SPLIT
# ============================================================

def validate_split(
    split_name,
    split_dir,
    classes
):

    print()
    print("=" * 70)
    print(f"{split_name.upper()} DATASET")
    print("=" * 70)

    images_dir = split_dir / "images"
    labels_dir = split_dir / "labels"

    # --------------------------------------------------------
    # Check directories
    # --------------------------------------------------------

    if not split_dir.exists():

        print(
            f"[ERROR] Split directory missing:"
        )

        print(
            f"        {split_dir}"
        )

        return {
            "missing_split": True,
            "images": 0,
            "labels": 0,
            "image_label_problems": 0,
            "invalid_annotations": 0,
            "empty_labels": 0,
        }

    if not images_dir.exists():

        print(
            f"[ERROR] Images directory missing:"
        )

        print(
            f"        {images_dir}"
        )

    if not labels_dir.exists():

        print(
            f"[ERROR] Labels directory missing:"
        )

        print(
            f"        {labels_dir}"
        )

    # --------------------------------------------------------
    # Find files
    # --------------------------------------------------------

    image_files = find_images(
        images_dir
    )

    label_files = find_labels(
        labels_dir
    )

    print()
    print(
        f"Images found : {len(image_files)}"
    )

    print(
        f"Labels found : {len(label_files)}"
    )

    # --------------------------------------------------------
    # Image / label matching
    # --------------------------------------------------------

    (
        images_without_labels,
        labels_without_images
    ) = check_image_labels(
        image_files,
        label_files,
        images_dir,
        labels_dir
    )

    # --------------------------------------------------------
    # Print image / label problems
    # --------------------------------------------------------

    if images_without_labels:

        print()
        print(
            "IMAGES WITHOUT LABELS:"
        )

        for key in sorted(
            images_without_labels
        ):

            print(
                f"  {key}"
            )

    if labels_without_images:

        print()
        print(
            "LABELS WITHOUT IMAGES:"
        )

        for key in sorted(
            labels_without_images
        ):

            print(
                f"  {key}"
            )

    # --------------------------------------------------------
    # Validate labels
    # --------------------------------------------------------

    (
        annotation_counts,
        image_counts,
        invalid_annotations,
        empty_label_files
    ) = check_labels(
        label_files,
        classes
    )

    # --------------------------------------------------------
    # Invalid annotations
    # --------------------------------------------------------

    if invalid_annotations:

        print()
        print(
            "INVALID ANNOTATIONS:"
        )

        for (
            label_file,
            line_number,
            reason
        ) in invalid_annotations:

            print(
                f"  {label_file} "
                f"(line {line_number}) "
                f"-> {reason}"
            )

    # --------------------------------------------------------
    # Empty label files
    # --------------------------------------------------------

    if empty_label_files:

        print()
        print(
            "EMPTY LABEL FILES:"
        )

        for label_file in empty_label_files:

            print(
                f"  {label_file}"
            )

    # --------------------------------------------------------
    # Class distribution
    # --------------------------------------------------------

    print()
    print(
        "-" * 70
    )

    print(
        "CLASS DISTRIBUTION"
    )

    print(
        "-" * 70
    )

    print(
        f"{'ID':<5}"
        f"{'CLASS':<35}"
        f"{'IMAGES':>10}"
        f"{'ANNOTS':>12}"
    )

    print(
        "-" * 70
    )

    for class_id, class_name in enumerate(
        classes
    ):

        print(
            f"{class_id:<5}"
            f"{class_name:<35}"
            f"{image_counts[class_id]:>10}"
            f"{annotation_counts[class_id]:>12}"
        )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    image_label_problems = (
        len(images_without_labels)
        +
        len(labels_without_images)
    )

    print()
    print(
        "-" * 70
    )

    print(
        f"Images without labels : "
        f"{len(images_without_labels)}"
    )

    print(
        f"Labels without images : "
        f"{len(labels_without_images)}"
    )

    print(
        f"Invalid annotations   : "
        f"{len(invalid_annotations)}"
    )

    print(
        f"Empty label files     : "
        f"{len(empty_label_files)}"
    )

    print(
        f"Total annotations     : "
        f"{sum(annotation_counts.values())}"
    )

    return {
        "missing_split": False,
        "images": len(image_files),
        "labels": len(label_files),
        "image_label_problems": image_label_problems,
        "invalid_annotations": len(
            invalid_annotations
        ),
        "empty_labels": len(
            empty_label_files
        ),
        "annotations": sum(
            annotation_counts.values()
        ),
        "image_counts": image_counts,
        "annotation_counts": annotation_counts,
    }


# ============================================================
# MAIN VALIDATION
# ============================================================

def validate_dataset():

    print("=" * 70)
    print("YOLO DATASET VALIDATION")
    print("=" * 70)

    print()
    print(
        f"Dataset: {DATASET_DIR}"
    )

    # --------------------------------------------------------
    # Check dataset directory
    # --------------------------------------------------------

    if not DATASET_DIR.exists():

        raise FileNotFoundError(
            f"Dataset directory does not exist:\n"
            f"{DATASET_DIR}"
        )

    # --------------------------------------------------------
    # Read classes
    # --------------------------------------------------------

    classes = read_classes()

    print()
    print(
        f"Classes found: {len(classes)}"
    )

    # --------------------------------------------------------
    # Print classes
    # --------------------------------------------------------

    print()

    for class_id, class_name in enumerate(
        classes
    ):

        print(
            f"  {class_id}: {class_name}"
        )

    # --------------------------------------------------------
    # Validate each split
    # --------------------------------------------------------

    results = {}

    for split_name, split_dir in SPLITS.items():

        results[split_name] = validate_split(
            split_name,
            split_dir,
            classes
        )

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("FINAL RESULT")
    print("=" * 70)

    total_images = 0
    total_labels = 0
    total_annotations = 0
    total_problems = 0

    for split_name, result in results.items():

        print()

        print(
            f"{split_name.upper():<8}"
            f"Images: {result['images']:<8}"
            f"Labels: {result['labels']:<8}"
            f"Annotations: "
            f"{result.get('annotations', 0):<8}"
        )

        problems = (
            result["image_label_problems"]
            +
            result["invalid_annotations"]
            +
            result["empty_labels"]
        )

        if result["missing_split"]:

            problems += 1

        print(
            f"{'':<8}"
            f"Problems: {problems}"
        )

        total_images += result["images"]
        total_labels += result["labels"]
        total_annotations += result.get(
            "annotations",
            0
        )

        total_problems += problems

    # --------------------------------------------------------
    # Overall totals
    # --------------------------------------------------------

    print()
    print("-" * 70)

    print(
        f"TOTAL IMAGES       : "
        f"{total_images}"
    )

    print(
        f"TOTAL LABEL FILES  : "
        f"{total_labels}"
    )

    print(
        f"TOTAL ANNOTATIONS  : "
        f"{total_annotations}"
    )

    print(
        f"TOTAL PROBLEMS     : "
        f"{total_problems}"
    )

    # --------------------------------------------------------
    # Final status
    # --------------------------------------------------------

    print()

    if total_problems == 0:

        print(
            "DATASET IS VALID"
        )

        print()
        print(
            "✓ Train image/label pairs are valid"
        )

        print(
            "✓ Valid image/label pairs are valid"
        )

        print(
            "✓ Test image/label pairs are valid"
        )

        print(
            "✓ All class IDs exist"
        )

        print(
            "✓ No malformed annotations"
        )

        print(
            "✓ No empty label files"
        )

    else:

        print(
            f"DATASET HAS "
            f"{total_problems} PROBLEM(S)"
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
        print("=" * 70)
        print("ERROR")
        print("=" * 70)

        print(error)