from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

# Path to the YOLO dataset you want to modify.
#
# Expected structure:
#
# dataset/
# ├── images/
# ├── labels/
# └── classes.txt
#

DATASET_DIR = Path(
    "/home/singularity/Downloads/your_dataset"
)


# ============================================================
# CLASS RELABELING
# ============================================================
#
# Specify the class ID you want to change.
#
# Example:
#
# SOURCE_CLASS_ID = 3
#
# Every YOLO annotation with class ID 3
# will be changed to:
#
# TARGET_CLASS_ID = 7
#
# So:
#
# 3 0.512 0.430 0.120 0.200
#
# becomes:
#
# 7 0.512 0.430 0.120 0.200
#

SOURCE_CLASS_ID = 3

TARGET_CLASS_ID = 7


# ============================================================
# LABEL DIRECTORY
# ============================================================

LABELS_DIR = DATASET_DIR / "labels"

CLASSES_FILE = DATASET_DIR / "classes.txt"


# ============================================================
# OPTIONS
# ============================================================

# If True, the script creates backups of label files
# before modifying them.
#
# Backup example:
#
# labels/
# ├── image001.txt
# ├── image002.txt
# └── backup/
#     ├── image001.txt
#     └── image002.txt
#

CREATE_BACKUP = False

BACKUP_DIR = LABELS_DIR / "backup"


# ============================================================
# READ classes.txt
# ============================================================

def read_classes():

    if not CLASSES_FILE.exists():

        print(
            f"WARNING: classes.txt not found:\n"
            f"{CLASSES_FILE}"
        )

        return []

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
# SHOW CLASS INFORMATION
# ============================================================

def show_classes(classes):

    print()
    print("=" * 60)
    print("CLASSES")
    print("=" * 60)

    if not classes:

        print("No classes.txt found.")
        return

    for index, class_name in enumerate(classes):

        print(
            f"{index:>3} : {class_name}"
        )


# ============================================================
# VALIDATE CONFIGURATION
# ============================================================

def validate_configuration(classes):

    print()
    print("=" * 60)
    print("RELABEL CONFIGURATION")
    print("=" * 60)

    source_name = (
        classes[SOURCE_CLASS_ID]
        if SOURCE_CLASS_ID < len(classes)
        else "UNKNOWN"
    )

    target_name = (
        classes[TARGET_CLASS_ID]
        if TARGET_CLASS_ID < len(classes)
        else "UNKNOWN"
    )

    print(
        f"Source class : "
        f"{SOURCE_CLASS_ID} ({source_name})"
    )

    print(
        f"Target class : "
        f"{TARGET_CLASS_ID} ({target_name})"
    )

    print()

    # --------------------------------------------------------
    # Validate IDs
    # --------------------------------------------------------

    if SOURCE_CLASS_ID < 0:

        raise ValueError(
            f"Invalid source class ID: "
            f"{SOURCE_CLASS_ID}"
        )

    if TARGET_CLASS_ID < 0:

        raise ValueError(
            f"Invalid target class ID: "
            f"{TARGET_CLASS_ID}"
        )

    # --------------------------------------------------------
    # Validate against classes.txt
    # --------------------------------------------------------

    if classes:

        if SOURCE_CLASS_ID >= len(classes):

            raise ValueError(
                f"Source class ID "
                f"{SOURCE_CLASS_ID} "
                f"does not exist in classes.txt"
            )

        if TARGET_CLASS_ID >= len(classes):

            raise ValueError(
                f"Target class ID "
                f"{TARGET_CLASS_ID} "
                f"does not exist in classes.txt"
            )


# ============================================================
# CREATE BACKUP
# ============================================================

def backup_label(label_file):

    if not CREATE_BACKUP:

        return

    BACKUP_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    backup_file = (
        BACKUP_DIR /
        label_file.name
    )

    # Don't overwrite an existing backup
    if not backup_file.exists():

        backup_file.write_bytes(
            label_file.read_bytes()
        )


# ============================================================
# PROCESS LABEL FILE
# ============================================================

def process_label(label_file):

    changed = False
    replacements = 0

    output_lines = []

    with open(
        label_file,
        "r",
        encoding="utf-8"
    ) as file:

        lines = file.readlines()

    for line_number, line in enumerate(
        lines,
        start=1
    ):

        stripped = line.strip()

        # ----------------------------------------------------
        # Keep empty lines
        # ----------------------------------------------------

        if not stripped:

            output_lines.append(line)

            continue

        parts = stripped.split()

        # ----------------------------------------------------
        # Basic YOLO validation
        # ----------------------------------------------------

        if len(parts) < 5:

            print(
                f"WARNING: Invalid YOLO line "
                f"in {label_file.name}, "
                f"line {line_number}"
            )

            output_lines.append(line)

            continue

        # ----------------------------------------------------
        # Read class ID
        # ----------------------------------------------------

        try:

            class_id = int(parts[0])

        except ValueError:

            print(
                f"WARNING: Invalid class ID "
                f"in {label_file.name}, "
                f"line {line_number}"
            )

            output_lines.append(line)

            continue

        # ----------------------------------------------------
        # Relabel matching class
        # ----------------------------------------------------

        if class_id == SOURCE_CLASS_ID:

            parts[0] = str(TARGET_CLASS_ID)

            output_lines.append(
                " ".join(parts) + "\n"
            )

            changed = True

            replacements += 1

        else:

            # Leave all other classes untouched
            output_lines.append(line)

    # --------------------------------------------------------
    # Write only if something changed
    # --------------------------------------------------------

    if changed:

        backup_label(label_file)

        with open(
            label_file,
            "w",
            encoding="utf-8"
        ) as file:

            file.writelines(
                output_lines
            )

    return changed, replacements


# ============================================================
# MAIN
# ============================================================

def relabel_class():

    print("=" * 60)
    print("YOLO CLASS ID RELABELING")
    print("=" * 60)

    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    if not DATASET_DIR.exists():

        raise FileNotFoundError(
            f"Dataset directory does not exist:\n"
            f"{DATASET_DIR}"
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

    # --------------------------------------------------------
    # Validate configuration
    # --------------------------------------------------------

    validate_configuration(classes)

    # --------------------------------------------------------
    # Find label files
    # --------------------------------------------------------

    label_files = sorted(
        LABELS_DIR.glob("*.txt")
    )

    print(
        f"Found {len(label_files)} label files."
    )

    print()

    # --------------------------------------------------------
    # Process files
    # --------------------------------------------------------

    processed = 0
    changed_files = 0
    total_replacements = 0

    for label_file in label_files:

        changed, replacements = process_label(
            label_file
        )

        processed += 1

        if changed:

            changed_files += 1

            total_replacements += replacements

            print(
                f"[CHANGED] {label_file.name}"
                f"  ({replacements} annotation(s))"
            )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("COMPLETED")
    print("=" * 60)

    print(
        f"Label files checked : {processed}"
    )

    print(
        f"Label files changed : {changed_files}"
    )

    print(
        f"Annotations changed : {total_replacements}"
    )

    if CREATE_BACKUP:

        print(
            f"Backups saved to   : {BACKUP_DIR}"
        )

    print()
    print(
        f"Class {SOURCE_CLASS_ID} "
        f"-> Class {TARGET_CLASS_ID}"
    )

    print()
    print("Images were NOT modified.")
    print("classes.txt was NOT modified.")
    print("Only YOLO label class IDs were changed.")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        relabel_class()

    except Exception as error:

        print()
        print("=" * 60)
        print("ERROR")
        print("=" * 60)
        print(error)
