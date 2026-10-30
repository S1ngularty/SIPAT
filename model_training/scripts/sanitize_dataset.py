
from pathlib import Path
import re
import shutil
import sys

# ============================================================
# CONFIGURATION
# ============================================================

SOURCE_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/main"
)

OUTPUT_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/sanitize_datset"
)

INVALID_CHARS = r'[<>:"/\\|?*]'

# ============================================================
# FILENAME SANITIZATION
# ============================================================

def sanitize_filename(filename: str) -> str:
    return re.sub(INVALID_CHARS, "_", filename)


# ============================================================
# DATASET PROCESSING
# ============================================================

def sanitize_dataset():

    if not SOURCE_PATH.exists():
        print(f"[ERROR] Source directory does not exist: {SOURCE_PATH}")
        return

    if OUTPUT_PATH.exists():
        print(f"[ERROR] Output directory already exists:")
        print(OUTPUT_PATH)
        print("Rename or remove the existing output directory first.")
        return

    files = [
        path for path in SOURCE_PATH.rglob("*")
        if path.is_file()
    ]

    print("=" * 55)
    print("YOLO DATASET SANITIZER")
    print("=" * 55)

    print(f"Source: {SOURCE_PATH}")
    print(f"Output: {OUTPUT_PATH}")
    print(f"Files found: {len(files)}")

    renamed = 0
    copied = 0
    skipped = 0
    errors = 0

    # Create output directory
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

    for source_file in files:

        relative_path = source_file.relative_to(SOURCE_PATH)

        clean_name = sanitize_filename(source_file.name)

        destination = OUTPUT_PATH / relative_path.parent / clean_name

        # Create corresponding directory structure
        destination.parent.mkdir(parents=True, exist_ok=True)

        # Prevent accidental overwrites
        if destination.exists():
            print(f"[SKIPPED] Collision: {relative_path}")
            skipped += 1
            continue

        try:
            shutil.copy2(source_file, destination)

            if clean_name != source_file.name:
                print(
                    f"[RENAMED] {source_file.name}"
                    f" -> {clean_name}"
                )
                renamed += 1
            else:
                copied += 1

        except OSError as error:
            print(f"[ERROR] {relative_path}: {error}")
            errors += 1

    # ========================================================
    # SUMMARY
    # ========================================================

    print("\n" + "=" * 55)
    print("SANITIZATION COMPLETE")
    print("=" * 55)

    print(f"Total source files : {len(files)}")
    print(f"Copied unchanged   : {copied}")
    print(f"Renamed            : {renamed}")
    print(f"Skipped            : {skipped}")
    print(f"Errors             : {errors}")

    print(f"\nOutput directory:\n{OUTPUT_PATH}")

    print("\nOriginal dataset remains untouched.")


if __name__ == "__main__":
    sanitize_dataset()
