from pathlib import Path
import hashlib


# ============================================================
# CONFIGURATION
# ============================================================

SOURCE_DATASET = Path(
    "/home/singularity/Downloads/crop_identification_datasets/tomato5k"
)

MAIN_DATASET = Path(
    "/home/singularity/Downloads/crop_identification_datasets/main_dataset"
)

# IMPORTANT:
# True  = only show what would be deleted
# False = actually delete
DRY_RUN = True

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
# CLASS MAPPING USED DURING THE ACCIDENTAL MERGE
# ============================================================

# tomato5k:
#
# 0 = Diseased
# 1 = Healthy_leaf
#
# Both were accidentally mapped to:
#
# 2 = chili_leaves

CLASS_MAPPING = {
    0: 2,
    1: 2,
}


# ============================================================
# FILE HASH
# ============================================================

def file_hash(path):

    sha256 = hashlib.sha256()

    with open(path, "rb") as file:

        while True:

            chunk = file.read(1024 * 1024)

            if not chunk:
                break

            sha256.update(chunk)

    return sha256.hexdigest()


# ============================================================
# CONVERT SOURCE LABEL
# ============================================================

def converted_label(label_path):

    output = []

    with open(
        label_path,
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:

            parts = line.strip().split()

            if not parts:
                continue

            source_class = int(parts[0])

            if source_class not in CLASS_MAPPING:
                continue

            parts[0] = str(
                CLASS_MAPPING[source_class]
            )

            output.append(
                " ".join(parts)
            )

    return "\n".join(output).strip()


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("RECOVER ACCIDENTAL TOMATO DATASET MERGE")
    print("=" * 70)

    print()
    print(f"Source : {SOURCE_DATASET}")
    print(f"Main   : {MAIN_DATASET}")
    print(f"Dry run: {DRY_RUN}")

    total_candidates = 0
    total_deleted = 0
    total_skipped = 0

    for split in SPLITS:

        print()
        print("-" * 70)
        print(f"{split.upper()}")
        print("-" * 70)

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

            print("Source images directory missing.")
            continue

        source_files = [
            file
            for file in source_images.iterdir()
            if (
                file.is_file()
                and file.suffix.lower()
                in IMAGE_EXTENSIONS
            )
        ]

        print(
            f"Source images: {len(source_files):,}"
        )

        for source_image in source_files:

            source_label = (
                source_labels /
                f"{source_image.stem}.txt"
            )

            main_image = (
                main_images /
                source_image.name
            )

            main_label = (
                main_labels /
                source_label.name
            )

            # ------------------------------------------------
            # Make sure corresponding files exist
            # ------------------------------------------------

            if not source_label.exists():

                print(
                    f"[SKIP] Missing source label: "
                    f"{source_image.name}"
                )

                total_skipped += 1
                continue

            if not main_image.exists():

                continue

            if not main_label.exists():

                print(
                    f"[SKIP] Main label missing: "
                    f"{main_label.name}"
                )

                total_skipped += 1
                continue

            # ------------------------------------------------
            # Compare image
            # ------------------------------------------------

            source_hash = file_hash(
                source_image
            )

            main_hash = file_hash(
                main_image
            )

            if source_hash != main_hash:

                print(
                    f"[SKIP] Image differs: "
                    f"{source_image.name}"
                )

                total_skipped += 1
                continue

            # ------------------------------------------------
            # Compare converted label
            # ------------------------------------------------

            expected_label = converted_label(
                source_label
            )

            with open(
                main_label,
                "r",
                encoding="utf-8"
            ) as file:

                actual_label = file.read().strip()

            if expected_label != actual_label:

                print(
                    f"[SKIP] Label differs: "
                    f"{source_label.name}"
                )

                total_skipped += 1
                continue

            # ------------------------------------------------
            # MATCH
            # ------------------------------------------------

            total_candidates += 1

            print(
                f"[MATCH] {split}/{source_image.name}"
            )

            if not DRY_RUN:

                main_image.unlink()
                main_label.unlink()

                total_deleted += 1

    # ========================================================
    # SUMMARY
    # ========================================================

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)

    print(
        f"Matching files : {total_candidates:,}"
    )

    print(
        f"Deleted        : {total_deleted:,}"
    )

    print(
        f"Skipped        : {total_skipped:,}"
    )

    if DRY_RUN:

        print()
        print("DRY RUN — NOTHING WAS DELETED.")

        print()
        print(
            "If the matches look correct, change:"
        )

        print(
            "    DRY_RUN = False"
        )

        print(
            "and run the script again."
        )

    else:

        print()
        print("Recovery completed.")


if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print("\nCancelled.")

    except Exception as error:

        print()
        print("ERROR:")
        print(error)