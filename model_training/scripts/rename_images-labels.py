from pathlib import Path

# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = Path("/home/singularity/Downloads/backup1")

IMAGES_DIR = BASE_DIR / "images"
LABELS_DIR = BASE_DIR / "labels"

PREFIX = "crop"

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}

# ==========================================
# RENAME DATASET
# ==========================================

def rename_yolo_dataset():

    # Check directories
    if not IMAGES_DIR.exists():
        print(f"Images directory does not exist:")
        print(IMAGES_DIR)
        return

    if not LABELS_DIR.exists():
        print(f"Labels directory does not exist:")
        print(LABELS_DIR)
        return

    # Get images
    images = [
        file
        for file in IMAGES_DIR.iterdir()
        if file.is_file()
        and file.suffix.lower() in IMAGE_EXTENSIONS
    ]

    images.sort()

    if not images:
        print("No images found.")
        return

    print(f"Found {len(images)} images.")
    print()

    # ==========================================
    # CHECK MATCHING LABELS
    # ==========================================

    missing_labels = []

    for image in images:
        label = LABELS_DIR / f"{image.stem}.txt"

        if not label.exists():
            missing_labels.append(image.name)

    if missing_labels:
        print("WARNING: The following images have no matching label:")

        for image_name in missing_labels:
            print(f"  - {image_name}")

        print()
        print("Rename cancelled.")
        print("Fix the missing labels first.")
        return

    # ==========================================
    # TEMPORARY RENAME
    # ==========================================
    #
    # Temporary names prevent filename collisions.
    #
    # Example:
    #
    # image_1.jpg -> __temp_000001.jpg
    # image_2.jpg -> __temp_000002.jpg
    #
    # ==========================================

    temp_pairs = []

    for index, image in enumerate(images):

        label = LABELS_DIR / f"{image.stem}.txt"

        temp_image = IMAGES_DIR / f"__temp_{index:06d}{image.suffix.lower()}"
        temp_label = LABELS_DIR / f"__temp_{index:06d}.txt"

        image.rename(temp_image)
        label.rename(temp_label)

        temp_pairs.append(
            (temp_image, temp_label)
        )

    # ==========================================
    # FINAL RENAME
    # ==========================================

    for index, (temp_image, temp_label) in enumerate(
        temp_pairs,
        start=1
    ):

        new_name = f"{PREFIX}_{index:05d}"

        new_image = IMAGES_DIR / f"{new_name}{temp_image.suffix}"
        new_label = LABELS_DIR / f"{new_name}.txt"

        temp_image.rename(new_image)
        temp_label.rename(new_label)

        print(
            f"{temp_image.name} + {temp_label.name}"
            f"  ->  "
            f"{new_image.name} + {new_label.name}"
        )

    print()
    print("================================")
    print("Renaming completed successfully!")
    print("================================")


# ==========================================
# RUN
# ==========================================

if __name__ == "__main__":
    rename_yolo_dataset()