from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

# Path to the dataset you want to modify.
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
# CLASS MAPPING
# ============================================================
#
# Format:
#
# SOURCE_CLASS_ID: TARGET_CLASS_ID
#
# Example:
#
# 0 = green
# 1 = red
#
# Both should become:
#
# 5 = tomato_fruit
#
# So:
#

CLASS_MAPPING = {
    0: 5,
    1: 5,
}


# ============================================================
# LABEL DIRECTORY
# ============================================================

LABELS_DIR = DATASET_DIR / "labels"

CLASSES_FILE = DATASET_DIR / "classes.txt"


# ============================================================
# OPTIONS
# ============================================================

# If True, the script creates backups of the original labels
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

CREATE_BACKUP = True

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
# SHOW CLASSES
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
# VALIDATE CLASS MAPPING
# ============================================================

def validate_mapping(classes):

    print()
    print("=" * 60)
    print("CLASS CONSOLIDATION")
    print("=" * 60)

    for source_id, target_id in CLASS_MAPPING.items():

        source_name = (
            classes[source_id]
            if source_id < len(classes)
            else "UNKNOWN"
        )

        target_name = (
            classes[target_id]
            if target_id < len(classes)
            else "UNKNOWN"
        )

        print(
            f"{source_id} ({source_name})"
            f"  ->  "
            f"{target_id} ({target_name})"
        )

    print()

    # --------------------------------------------------------
    # Validate IDs
    # --------------------------------------------------------

    for source_id, target_id in CLASS_MAPPING.items():

        if source_id < 0:
            raise ValueError(
                f"Invalid source class ID: {source_id}"
            )

        if target_id < 0:
            raise ValueError(
                f"Invalid target class ID: {target_id}"
            )

        if classes:

            if source_id >= len(classes):

                raise ValueError(
                    f"Source class ID {source_id} "
                    f"does not exist in classes.txt"
                )

            if target_id >= len(classes):

                raise ValueError(
                    f"Target class ID {target_id} "
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

        # Keep empty lines
        if not stripped:

            output_lines.append(line)
            continue

        parts = stripped.split()

        # ----------------------------------------------------
        # Basic YOLO validation
        # ----------------------------------------------------

        if len(parts) < 5:

            print(
                f"WARNING: Invalid line "
                f"in {label_file.name}, "
                f"line {line_number}"
            )

            output_lines.append(line)
            continue

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
        # Check whether this class should be changed
        # ----------------------------------------------------

        if class_id in CLASS_MAPPING:

            new_class_id = CLASS_MAPPING[class_id]

            parts[0] = str(new_class_id)

            changed = True

            output_lines.append(
                " ".join(parts) + "\n"
            )

        else:

            # Leave untouched
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

    return changed


# ============================================================
# MAIN
# ============================================================

def consolidate_classes():

    print("=" * 60)
    print("YOLO CLASS CONSOLIDATION")
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
    # Validate mapping
    # --------------------------------------------------------

    validate_mapping(classes)

    # --------------------------------------------------------
    # Find label files
    # --------------------------------------------------------

    label_files = sorted(
        LABELS_DIR.glob("*.txt")
    )

    print(
        f"Found {len(label_files)} label files."
    )

    # --------------------------------------------------------
    # Process
    # --------------------------------------------------------

    processed = 0
    changed_files = 0

    for label_file in label_files:

        changed = process_label(
            label_file
        )

        processed += 1

        if changed:

            changed_files += 1

            print(
                f"[CHANGED] {label_file.name}"
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

    if CREATE_BACKUP:

        print(
            f"Backups saved to   : {BACKUP_DIR}"
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

        consolidate_classes()

    except Exception as error:

        print()
        print("=" * 60)
        print("ERROR")
        print("=" * 60)
        print(error)
