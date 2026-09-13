from pathlib import Path
import shutil

# ============================================================
# CONFIG
# ============================================================

DATASET_DIR = Path("/home/singularity/Downloads/binjal1")

SPLITS = [
    "train",
    "valid",
    "test",
]

OUTPUT_IMAGES = DATASET_DIR / "images"
OUTPUT_LABELS = DATASET_DIR / "labels"

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

# If True, creates a backup of train/valid/test before merging
CREATE_BACKUP = True
BACKUP_DIR = DATASET_DIR / "backup_before_merge"


# ============================================================
# FUNCTIONS
# ============================================================

def get_next_id(output_dir: Path, prefix: str) -> int:
    """
    Finds the next available number for filenames.

    Example:
        merged_00001.jpg
        merged_00002.jpg
        ...

    Returns the next number.
    """

    highest = 0

    for file in output_dir.iterdir():

        if not file.is_file():
            continue

        if not file.stem.startswith(prefix):
            continue

        try:
            number = int(file.stem.replace(prefix, ""))
            highest = max(highest, number)
        except ValueError:
            pass

    return highest + 1


def create_backup():
    """
    Copies train/valid/test into a backup directory.
    """

    if BACKUP_DIR.exists():
        print(f"Backup already exists:")
        print(f"  {BACKUP_DIR}")
        print("Skipping backup creation.")
        return

    BACKUP_DIR.mkdir(parents=True)

    for split in SPLITS:

        split_dir = DATASET_DIR / split

        if not split_dir.exists():
            continue

        destination = BACKUP_DIR / split

        shutil.copytree(split_dir, destination)

    print(f"Backup created:")
    print(f"  {BACKUP_DIR}")


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("MERGE TRAIN / VALID / TEST")
    print("=" * 60)

    # --------------------------------------------------------
    # Validate dataset
    # --------------------------------------------------------

    if not DATASET_DIR.exists():
        print(f"ERROR: Dataset directory does not exist:")
        print(f"  {DATASET_DIR}")
        return

    # --------------------------------------------------------
    # Create output directories
    # --------------------------------------------------------

    OUTPUT_IMAGES.mkdir(parents=True, exist_ok=True)
    OUTPUT_LABELS.mkdir(parents=True, exist_ok=True)

    # --------------------------------------------------------
    # Backup
    # --------------------------------------------------------

    if CREATE_BACKUP:
        create_backup()

    # --------------------------------------------------------
    # Find starting number
    # --------------------------------------------------------

    counter = get_next_id(OUTPUT_IMAGES, "merged_")

    total_images = 0
    total_labels = 0
    skipped_images = 0

    # --------------------------------------------------------
    # Process each split
    # --------------------------------------------------------

    for split in SPLITS:

        split_dir = DATASET_DIR / split

        images_dir = split_dir / "images"
        labels_dir = split_dir / "labels"

        if not images_dir.exists():
            print(f"\nWARNING: Missing images directory:")
            print(f"  {images_dir}")
            continue

        if not labels_dir.exists():
            print(f"\nWARNING: Missing labels directory:")
            print(f"  {labels_dir}")
            continue

        print(f"\nProcessing: {split}/")

        images = [
            file
            for file in images_dir.iterdir()
            if file.is_file()
            and file.suffix.lower() in IMAGE_EXTENSIONS
        ]

        print(f"Found {len(images)} images.")

        for image_path in sorted(images):

            # ------------------------------------------------
            # Find matching label
            # ------------------------------------------------

            label_path = labels_dir / f"{image_path.stem}.txt"

            if not label_path.exists():

                print(
                    f"  WARNING: No label for "
                    f"{image_path.name} -- skipped"
                )

                skipped_images += 1
                continue

            # ------------------------------------------------
            # Generate unique filename
            # ------------------------------------------------

            new_name = f"merged_{counter:05d}"

            new_image_path = (
                OUTPUT_IMAGES /
                f"{new_name}{image_path.suffix.lower()}"
            )

            new_label_path = (
                OUTPUT_LABELS /
                f"{new_name}.txt"
            )

            # ------------------------------------------------
            # Copy image + label
            # ------------------------------------------------

            shutil.copy2(
                image_path,
                new_image_path
            )

            shutil.copy2(
                label_path,
                new_label_path
            )

            print(
                f"  {split}: "
                f"{image_path.name} -> "
                f"{new_name}{image_path.suffix.lower()}"
            )

            counter += 1
            total_images += 1
            total_labels += 1

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("MERGE COMPLETE")
    print("=" * 60)

    print(f"Images merged : {total_images}")
    print(f"Labels merged : {total_labels}")
    print(f"Skipped       : {skipped_images}")

    print("\nOutput:")

    print(f"  Images: {OUTPUT_IMAGES}")
    print(f"  Labels: {OUTPUT_LABELS}")

    print("\nFinal structure:")
    print(f"""
{DATASET_DIR}/
├── images/
│   ├── merged_00001.jpg
│   ├── merged_00002.jpg
│   └── ...
│
└── labels/
    ├── merged_00001.txt
    ├── merged_00002.txt
    └── ...
""")

    if CREATE_BACKUP:
        print("Original train/valid/test folders were backed up to:")
        print(f"  {BACKUP_DIR}")


if __name__ == "__main__":
    main()