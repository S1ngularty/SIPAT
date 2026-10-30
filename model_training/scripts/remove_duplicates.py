
#!/usr/bin/env python3

from pathlib import Path
from collections import defaultdict
import argparse
import hashlib
import csv
import shutil
import sys


# ============================================================
# CONFIGURATION
# ============================================================

DEFAULT_DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/main"
)

SPLITS = ("train", "valid", "test")

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff"
}

REPORT_NAME = "duplicate_images.csv"
QUARANTINE_NAME = "duplicate_quarantine"


# ============================================================
# HELPERS
# ============================================================

def print_section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def sha256_file(path):
    digest = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def find_image_directory(dataset_path, split):
    candidates = [
        dataset_path / split / "images",
        dataset_path / "images" / split,
    ]

    return next(
        (path for path in candidates if path.is_dir()),
        None,
    )


def find_label_directory(dataset_path, image_dir, split):
    candidates = [
        image_dir.parent / "labels",
        dataset_path / split / "labels",
        dataset_path / "labels" / split,
    ]

    return next(
        (path for path in candidates if path.is_dir()),
        None,
    )


def matching_label_path(image_path, image_dir, label_dir):
    if label_dir is None:
        return None

    relative_path = image_path.relative_to(image_dir)
    return (label_dir / relative_path).with_suffix(".txt")


def unique_destination(path):
    """Return a destination that will not overwrite an existing file."""

    if not path.exists():
        return path

    counter = 1

    while True:
        candidate = path.with_name(
            f"{path.stem}_{counter}{path.suffix}"
        )

        if not candidate.exists():
            return candidate

        counter += 1


# ============================================================
# SCAN DATASET
# ============================================================

def scan_dataset(dataset_path):
    print_section("SCANNING DATASET")

    hash_groups = defaultdict(list)
    unreadable_images = []

    for split in SPLITS:
        image_dir = find_image_directory(dataset_path, split)

        if image_dir is None:
            print(f"[WARNING] No image directory found for {split}")
            continue

        label_dir = find_label_directory(
            dataset_path, image_dir, split
        )

        print(f"\nSplit: {split}")
        print(f"Images: {image_dir}")
        print(f"Labels: {label_dir or 'NOT FOUND'}")

        image_paths = sorted(
            path for path in image_dir.rglob("*")
            if path.is_file()
            and path.suffix.lower() in IMAGE_EXTENSIONS
        )

        print(f"Images discovered: {len(image_paths)}")

        for image_path in image_paths:
            try:
                digest = sha256_file(image_path)

                label_path = matching_label_path(
                    image_path, image_dir, label_dir
                )

                hash_groups[digest].append({
                    "split": split,
                    "image": image_path,
                    "image_dir": image_dir,
                    "label": label_path,
                    "sha256": digest,
                })

            except (OSError, PermissionError) as error:
                unreadable_images.append({
                    "split": split,
                    "image": str(image_path),
                    "error": str(error),
                })

                print(f"[WARNING] Cannot read {image_path}: {error}")

    duplicate_groups = [
        group
        for group in hash_groups.values()
        if len(group) > 1
    ]

    print_section("DUPLICATE SUMMARY")
    print(f"Unique image hashes: {len(hash_groups)}")
    print(f"Duplicate groups: {len(duplicate_groups)}")
    print(
        "Duplicate image copies: "
        f"{sum(len(group) - 1 for group in duplicate_groups)}"
    )
    print(f"Unreadable images: {len(unreadable_images)}")

    return duplicate_groups, unreadable_images


# ============================================================
# EXPORT CSV REPORT
# ============================================================

def export_report(dataset_path, duplicate_groups, apply):
    report_path = dataset_path / REPORT_NAME

    with report_path.open(
        "w", newline="", encoding="utf-8"
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "sha256",
                "split",
                "image",
                "label",
                "action",
                "duplicate_of",
            ],
        )

        writer.writeheader()

        for group in duplicate_groups:
            # Keep the first occurrence in deterministic scan order.
            keeper = group[0]

            for item in group:
                is_keeper = item is keeper

                if is_keeper:
                    action = "KEEP"
                    duplicate_of = ""
                else:
                    action = (
                        "QUARANTINE"
                        if apply
                        else "WOULD_QUARANTINE"
                    )
                    duplicate_of = str(keeper["image"])

                writer.writerow({
                    "sha256": item["sha256"],
                    "split": item["split"],
                    "image": str(item["image"]),
                    "label": (
                        str(item["label"])
                        if item["label"] else ""
                    ),
                    "action": action,
                    "duplicate_of": duplicate_of,
                })

    print(f"\nReport saved to: {report_path}")


# ============================================================
# QUARANTINE DUPLICATES
# ============================================================

def quarantine_duplicates(
    dataset_path,
    duplicate_groups,
    include_cross_split,
):
    quarantine_root = dataset_path / QUARANTINE_NAME

    moved_images = 0
    moved_labels = 0
    skipped_cross_split = 0
    failed_moves = 0

    for group in duplicate_groups:
        splits = {item["split"] for item in group}

        # Preserve every copy in groups spanning multiple splits
        # unless the user explicitly enables cross-split removal.
        if len(splits) > 1 and not include_cross_split:
            skipped_cross_split += 1
            print(
                "[SKIP CROSS-SPLIT] "
                + " | ".join(str(item["image"]) for item in group)
            )
            continue

        keeper = group[0]

        for item in group[1:]:
            image_path = item["image"]
            label_path = item["label"]

            # Preserve the relative directory layout in quarantine.
            relative_image = image_path.relative_to(
                item["image_dir"]
            )

            image_destination = unique_destination(
                quarantine_root
                / item["split"]
                / "images"
                / relative_image
            )

            label_destination = None

            if label_path is not None and label_path.exists():
                label_dir = find_label_directory(
                    dataset_path,
                    item["image_dir"],
                    item["split"],
                )

                if label_dir is not None:
                    relative_label = label_path.relative_to(label_dir)

                    label_destination = unique_destination(
                        quarantine_root
                        / item["split"]
                        / "labels"
                        / relative_label
                    )

            try:
                # Move the label first. If that fails, leave the image
                # in place so the dataset is not left label-less.
                if label_destination is not None:
                    label_destination.parent.mkdir(
                        parents=True, exist_ok=True
                    )
                    shutil.move(
                        str(label_path), str(label_destination)
                    )
                    moved_labels += 1

                try:
                    image_destination.parent.mkdir(
                        parents=True, exist_ok=True
                    )
                    shutil.move(
                        str(image_path), str(image_destination)
                    )
                    moved_images += 1

                except Exception:
                    # Best-effort rollback of the label if the image
                    # move fails.
                    if (
                        label_destination is not None
                        and label_destination.exists()
                    ):
                        label_path.parent.mkdir(
                            parents=True, exist_ok=True
                        )
                        shutil.move(
                            str(label_destination), str(label_path)
                        )
                        moved_labels -= 1

                    raise

                print(f"[QUARANTINED] {image_path}")
                print(f"    Kept: {keeper['image']}")

            except (OSError, shutil.Error) as error:
                failed_moves += 1
                print(
                    f"[ERROR] Could not move {image_path}: {error}",
                    file=sys.stderr,
                )

    print_section("REMOVAL SUMMARY")
    print(f"Images moved: {moved_images}")
    print(f"Label files moved: {moved_labels}")
    print(f"Cross-split groups skipped: {skipped_cross_split}")
    print(f"Failed operations: {failed_moves}")
    print(f"Quarantine directory: {quarantine_root}")

    return failed_moves


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Detect exact duplicate images in a YOLO dataset. "
            "Dry-run is the default; --apply enables quarantine."
        )
    )

    parser.add_argument(
        "--dataset",
        type=Path,
        default=DEFAULT_DATASET_PATH,
        help="Dataset root directory.",
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually move duplicate images and labels to quarantine.",
    )

    parser.add_argument(
        "--include-cross-split",
        action="store_true",
        help=(
            "Allow quarantining duplicates across train, valid, "
            "and test. Requires --apply."
        ),
    )

    args = parser.parse_args()
    dataset_path = args.dataset.expanduser().resolve()

    if args.include_cross_split and not args.apply:
        parser.error(
            "--include-cross-split requires --apply."
        )

    print_section("YOLO IMAGE DUPLICATE REMOVER")
    print(f"Dataset: {dataset_path}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")

    if not dataset_path.is_dir():
        parser.error(
            f"Dataset directory does not exist: {dataset_path}"
        )

    duplicate_groups, unreadable_images = scan_dataset(
        dataset_path
    )

    if not duplicate_groups:
        print("\nNo exact duplicate images found.")
        return

    if args.apply:
        print(
            "\nWARNING: Duplicate files will be moved to quarantine. "
            "Review the report and ensure you have a backup."
        )

        quarantine_duplicates(
            dataset_path,
            duplicate_groups,
            args.include_cross_split,
        )

    else:
        print_section("DRY RUN - NO DATASET FILES WILL BE MOVED")

        for group in duplicate_groups:
            keeper = group[0]

            print(f"\nKEEP: {keeper['image']}")

            for item in group[1:]:
                print(f"WOULD QUARANTINE: {item['image']}")

                if item["label"] and item["label"].exists():
                    print(f"    Matching label: {item['label']}")

        print("\nNo images or labels have been moved.")
        print("Run with --apply to enable quarantine.")

    export_report(
        dataset_path,
        duplicate_groups,
        args.apply,
    )

    if unreadable_images:
        print(
            f"\nWARNING: {len(unreadable_images)} images "
            "could not be hashed."
        )

    print("\nFinished.")


if __name__ == "__main__":
    main()
