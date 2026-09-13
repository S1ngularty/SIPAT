from pathlib import Path
import random
import shutil

# ============================================================
# CONFIG
# ============================================================

DATASET_DIR = Path("/home/singularity/Downloads/binjal1")

# Number of images you want to keep
TARGET_COUNT = 500

# Output dataset
OUTPUT_DIR = DATASET_DIR.parent / f"{DATASET_DIR.name}_reduced"

# Set a number so the same images are selected every time.
# Use None if you want a different random selection every run.
RANDOM_SEED = 42

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("DATASET REDUCER")
    print("=" * 60)

    images_dir = DATASET_DIR / "images"
    labels_dir = DATASET_DIR / "labels"

    output_images = OUTPUT_DIR / "images"
    output_labels = OUTPUT_DIR / "labels"

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    if not DATASET_DIR.exists():
        print(f"ERROR: Dataset does not exist:")
        print(f"  {DATASET_DIR}")
        return

    if not images_dir.exists():
        print(f"ERROR: Images directory does not exist:")
        print(f"  {images_dir}")
        return

    # --------------------------------------------------------
    # Find images
    # --------------------------------------------------------

    images = [
        file
        for file in images_dir.iterdir()
        if file.is_file()
        and file.suffix.lower() in IMAGE_EXTENSIONS
    ]

    print(f"\nDataset:")
    print(f"  {DATASET_DIR}")

    print(f"\nImages found: {len(images)}")
    print(f"Target:       {TARGET_COUNT}")

    # --------------------------------------------------------
    # Check target
    # --------------------------------------------------------

    if TARGET_COUNT <= 0:
        print("\nERROR: TARGET_COUNT must be greater than 0.")
        return

    if TARGET_COUNT >= len(images):

        print("\nTarget is greater than or equal to the")
        print("current dataset size.")
        print("Nothing needs to be removed.")

        return

    # --------------------------------------------------------
    # Random selection
    # --------------------------------------------------------

    if RANDOM_SEED is not None:
        random.seed(RANDOM_SEED)

    selected_images = random.sample(
        images,
        TARGET_COUNT
    )

    # Sort for cleaner processing/output
    selected_images.sort()

    # --------------------------------------------------------
    # Create output directories
    # --------------------------------------------------------

    output_images.mkdir(
        parents=True,
        exist_ok=True
    )

    output_labels.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Copy selected images + labels
    # --------------------------------------------------------

    copied_images = 0
    copied_labels = 0
    images_without_labels = 0

    print("\nCopying selected dataset...\n")

    for image_path in selected_images:

        # --------------------------------------------
        # Copy image
        # --------------------------------------------

        destination_image = (
            output_images /
            image_path.name
        )

        shutil.copy2(
            image_path,
            destination_image
        )

        copied_images += 1

        # --------------------------------------------
        # Find matching label
        # --------------------------------------------

        label_path = (
            labels_dir /
            f"{image_path.stem}.txt"
        )

        if label_path.exists():

            destination_label = (
                output_labels /
                label_path.name
            )

            shutil.copy2(
                label_path,
                destination_label
            )

            copied_labels += 1

        else:

            images_without_labels += 1

            print(
                f"  No label: {image_path.name}"
            )

    # --------------------------------------------------------
    # Copy classes.txt if it exists
    # --------------------------------------------------------

    classes_file = DATASET_DIR / "classes.txt"

    if classes_file.exists():

        shutil.copy2(
            classes_file,
            OUTPUT_DIR / "classes.txt"
        )

        print("\nclasses.txt copied.")

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("DATASET REDUCTION COMPLETE")
    print("=" * 60)

    print(f"Original images       : {len(images)}")
    print(f"Images kept           : {copied_images}")
    print(f"Labels copied         : {copied_labels}")
    print(f"Images without labels : {images_without_labels}")

    print("\nOutput:")
    print(f"  {OUTPUT_DIR}")

    print("\nFinal structure:")

    print(f"""
{OUTPUT_DIR}/
├── images/
│   ├── image001.jpg
│   ├── image002.jpg
│   └── ...
│
├── labels/
│   ├── image001.txt
│   ├── image002.txt
│   └── ...
│
└── classes.txt
""")

    print("Original dataset was NOT modified.")


if __name__ == "__main__":
    main()