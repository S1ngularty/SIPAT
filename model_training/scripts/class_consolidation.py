from pathlib import Path
import shutil
import yaml


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_DIR = Path(
    "/home/singularity/Downloads/main_dataset"
)

DATA_YAML = DATASET_DIR / "data.yaml"


# YOLO dataset splits
SPLITS = [
    "train",
    "valid",
    "test",
]


# ============================================================
# OPTIONS
# ============================================================

CREATE_BACKUP = True

BACKUP_DIR = DATASET_DIR / "backup_before_consolidation"


# ============================================================
# OLD → NEW CLASS MAPPING
# ============================================================
#
# OLD CLASS ID → NEW CLASS ID
#
# Your original dataset has 27 classes.
# The final dataset will have 25 classes.
#
# ============================================================

CLASS_MAPPING = {
    0: 0,    # Early Blight
    1: 1,    # Healthy
    2: 2,    # Late Blight
    3: 3,    # Leaf Miner
    4: 4,    # Leaf Mold
    5: 5,    # Mosaic Virus
    6: 6,    # Septoria → Septoria Leaf Spot
    7: 7,    # Spider Mites
    8: 8,    # Yellow Leaf Curl Virus

    9: 9,    # anthracnose_disease → Anthracnose
    10: 10,  # black_spot → Black Spot
    11: 11,  # botrytis_blight → Botrytis Gray Mold
    12: 12,  # cercospora_spot → Cercospora Leaf Spot
    13: 13,  # downy_mildew → Downy Mildew

    14: 11,  # gray_mold → Botrytis Gray Mold

    15: 14,  # leaf_curl → Leaf Curl
    16: 15,  # mycosphaerella_leaf_blotch → Mycosphaerella Leaf Blotch
    17: 16,  # powdery_mildew → Powdery Mildew
    18: 17,  # rust → Rust

    19: 6,   # septoria_spot → Septoria Leaf Spot

    20: 18,  # bacterial_spot → Bacterial Spot
    21: 19,  # fruit_rot → Fruit Rot
    22: 20,  # melon_thrips → Melon Thrips
    23: 21,  # fruit_borer → Fruit Borer
    24: 22,  # aphids → Aphids
    25: 23,  # flea_beetles → Flea Beetles
    26: 24,  # bacterial_wilt → Bacterial Wilt
}


# ============================================================
# FINAL CLASS NAMES
# ============================================================

NEW_CLASSES = [
    "Early Blight",
    "Healthy",
    "Late Blight",
    "Leaf Miner",
    "Leaf Mold",
    "Mosaic Virus",
    "Septoria Leaf Spot",
    "Spider Mites",
    "Yellow Leaf Curl Virus",
    "Anthracnose",
    "Black Spot",
    "Botrytis Gray Mold",
    "Cercospora Leaf Spot",
    "Downy Mildew",
    "Leaf Curl",
    "Mycosphaerella Leaf Blotch",
    "Powdery Mildew",
    "Rust",
    "Bacterial Spot",
    "Fruit Rot",
    "Melon Thrips",
    "Fruit Borer",
    "Aphids",
    "Flea Beetles",
    "Wilt",
]


# ============================================================
# LOAD DATA.YAML
# ============================================================

def load_data_yaml():

    if not DATA_YAML.exists():

        raise FileNotFoundError(
            f"data.yaml not found:\n{DATA_YAML}"
        )

    with open(
        DATA_YAML,
        "r",
        encoding="utf-8"
    ) as file:

        return yaml.safe_load(file)


# ============================================================
# SHOW OLD CLASSES
# ============================================================

def show_old_classes(data):

    print()
    print("=" * 70)
    print("CURRENT CLASSES")
    print("=" * 70)

    names = data.get("names", [])

    if isinstance(names, dict):

        names = [
            names[index]
            for index in sorted(names)
        ]

    for index, name in enumerate(names):

        print(
            f"{index:>3}: {name}"
        )


# ============================================================
# SHOW CONSOLIDATION PLAN
# ============================================================

def show_mapping(old_classes):

    print()
    print("=" * 70)
    print("CLASS CONSOLIDATION PLAN")
    print("=" * 70)

    for old_id, new_id in CLASS_MAPPING.items():

        old_name = (
            old_classes[old_id]
            if old_id < len(old_classes)
            else "UNKNOWN"
        )

        new_name = NEW_CLASSES[new_id]

        if old_id == new_id and old_name == new_name:

            print(
                f"{old_id:>3} {old_name:<35} "
                f"-> {new_id:>3} {new_name}"
            )

        else:

            print(
                f"{old_id:>3} {old_name:<35} "
                f"-> {new_id:>3} {new_name}"
            )


# ============================================================
# VALIDATE CONFIGURATION
# ============================================================

def validate_configuration(data):

    old_classes = data.get("names", [])

    if isinstance(old_classes, dict):

        old_classes = [
            old_classes[index]
            for index in sorted(old_classes)
        ]

    # --------------------------------------------------------
    # Validate old class count
    # --------------------------------------------------------

    if len(old_classes) != 27:

        raise ValueError(
            f"Expected 27 old classes, "
            f"but data.yaml contains {len(old_classes)}."
        )

    # --------------------------------------------------------
    # Validate mapping covers every old class
    # --------------------------------------------------------

    expected_ids = set(range(27))

    mapping_ids = set(CLASS_MAPPING.keys())

    if mapping_ids != expected_ids:

        missing = expected_ids - mapping_ids
        extra = mapping_ids - expected_ids

        raise ValueError(
            f"Invalid class mapping.\n"
            f"Missing IDs: {sorted(missing)}\n"
            f"Extra IDs: {sorted(extra)}"
        )

    # --------------------------------------------------------
    # Validate target IDs
    # --------------------------------------------------------

    target_ids = set(CLASS_MAPPING.values())

    expected_targets = set(
        range(len(NEW_CLASSES))
    )

    if target_ids != expected_targets:

        raise ValueError(
            "Target class IDs are invalid.\n"
            f"Expected: {sorted(expected_targets)}\n"
            f"Found: {sorted(target_ids)}"
        )

    return old_classes


# ============================================================
# BACKUP LABEL FILE
# ============================================================

def backup_label(label_file):

    if not CREATE_BACKUP:
        return

    relative_path = label_file.relative_to(
        DATASET_DIR
    )

    backup_file = (
        BACKUP_DIR /
        relative_path
    )

    backup_file.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    if not backup_file.exists():

        shutil.copy2(
            label_file,
            backup_file
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

        # ----------------------------------------------------
        # Empty line
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
                f"WARNING: Invalid YOLO line:\n"
                f"  File : {label_file}\n"
                f"  Line : {line_number}"
            )

            output_lines.append(line)
            continue

        try:

            old_class_id = int(parts[0])

        except ValueError:

            print(
                f"WARNING: Invalid class ID:\n"
                f"  File : {label_file}\n"
                f"  Line : {line_number}\n"
                f"  Value: {parts[0]}"
            )

            output_lines.append(line)
            continue

        # ----------------------------------------------------
        # Validate class ID
        # ----------------------------------------------------

        if old_class_id not in CLASS_MAPPING:

            raise ValueError(
                f"Unknown class ID {old_class_id} "
                f"in {label_file}"
            )

        # ----------------------------------------------------
        # Convert class
        # ----------------------------------------------------

        new_class_id = CLASS_MAPPING[
            old_class_id
        ]

        if new_class_id != old_class_id:

            parts[0] = str(new_class_id)

            changed = True

            output_lines.append(
                " ".join(parts) + "\n"
            )

        else:

            output_lines.append(line)

    # --------------------------------------------------------
    # Write changes
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
# PROCESS SPLIT
# ============================================================

def process_split(split):

    labels_dir = (
        DATASET_DIR /
        split /
        "labels"
    )

    if not labels_dir.exists():

        print()
        print(
            f"WARNING: {split}/labels does not exist."
        )

        return 0, 0

    label_files = sorted(
        labels_dir.glob("*.txt")
    )

    changed_files = 0

    print()
    print("-" * 70)
    print(f"{split.upper()} DATASET")
    print("-" * 70)

    print(
        f"Label files found: {len(label_files)}"
    )

    for label_file in label_files:

        changed = process_label(
            label_file
        )

        if changed:

            changed_files += 1

    print(
        f"Files changed: {changed_files}"
    )

    return len(label_files), changed_files


# ============================================================
# UPDATE DATA.YAML
# ============================================================

def update_data_yaml(data):

    print()
    print("=" * 70)
    print("UPDATING DATA.YAML")
    print("=" * 70)

    data["nc"] = len(NEW_CLASSES)
    data["names"] = {
        index: name
        for index, name in enumerate(NEW_CLASSES)
    }

    with open(
        DATA_YAML,
        "w",
        encoding="utf-8"
    ) as file:

        yaml.safe_dump(
            data,
            file,
            sort_keys=False,
            allow_unicode=True
        )

    print(
        f"Number of classes: {len(NEW_CLASSES)}"
    )

    print(
        "data.yaml updated successfully."
    )


# ============================================================
# MAIN
# ============================================================

def consolidate_dataset():

    print("=" * 70)
    print("YOLO DATASET CLASS CONSOLIDATION")
    print("=" * 70)

    print(
        f"Dataset: {DATASET_DIR}"
    )

    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    if not DATASET_DIR.exists():

        raise FileNotFoundError(
            f"Dataset directory does not exist:\n"
            f"{DATASET_DIR}"
        )

    # --------------------------------------------------------
    # Load YAML
    # --------------------------------------------------------

    data = load_data_yaml()

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    old_classes = validate_configuration(
        data
    )

    # --------------------------------------------------------
    # Show information
    # --------------------------------------------------------

    show_old_classes(data)

    show_mapping(old_classes)

    print()
    print("=" * 70)
    print("NEW CLASSES")
    print("=" * 70)

    for index, name in enumerate(NEW_CLASSES):

        print(
            f"{index:>3}: {name}"
        )

    # --------------------------------------------------------
    # Backup data.yaml
    # --------------------------------------------------------

    if CREATE_BACKUP:

        BACKUP_DIR.mkdir(
            parents=True,
            exist_ok=True
        )

        backup_yaml = (
            BACKUP_DIR /
            "data.yaml"
        )

        if not backup_yaml.exists():

            shutil.copy2(
                DATA_YAML,
                backup_yaml
            )

            print()
            print(
                f"Backup created:\n"
                f"{backup_yaml}"
            )

    # --------------------------------------------------------
    # Process datasets
    # --------------------------------------------------------

    total_files = 0
    total_changed = 0

    for split in SPLITS:

        files, changed = process_split(
            split
        )

        total_files += files
        total_changed += changed

    # --------------------------------------------------------
    # Update YAML
    # --------------------------------------------------------

    update_data_yaml(data)

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("CONSOLIDATION COMPLETE")
    print("=" * 70)

    print(
        f"Label files checked : {total_files}"
    )

    print(
        f"Label files changed : {total_changed}"
    )

    print(
        f"Old classes         : {len(old_classes)}"
    )

    print(
        f"New classes         : {len(NEW_CLASSES)}"
    )

    print()

    if CREATE_BACKUP:

        print(
            f"Backup directory:\n"
            f"{BACKUP_DIR}"
        )

    print()
    print("Images were NOT modified.")
    print("YOLO annotations were updated.")
    print("data.yaml was updated.")

    print()
    print("Recommended next step:")
    print("Run dataset_validation.py")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    try:

        consolidate_dataset()

    except Exception as error:

        print()
        print("=" * 70)
        print("ERROR")
        print("=" * 70)
        print(error)