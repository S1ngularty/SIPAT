
from pathlib import Path
import shutil
import math

# ============================================================
# CONFIGURATION
# ============================================================

SOURCE_DIR = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/filtered_dataset"
)

OUTPUT_DIR = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/converted_detection"
)


# ============================================================
# OBB TO STANDARD YOLO DETECTION
# ============================================================

def convert_obb_line(line: str) -> str:
    values = line.split()

    if len(values) != 9:
        raise ValueError(
            f"Expected 9 values for OBB, received {len(values)}"
        )

    class_id = int(values[0])
    coords = [float(value) for value in values[1:]]

    if not all(math.isfinite(value) for value in coords):
        raise ValueError("Coordinates contain NaN or infinity")

    points = list(zip(coords[0::2], coords[1::2]))

    if any(
        x < 0 or x > 1 or y < 0 or y > 1
        for x, y in points
    ):
        raise ValueError("Coordinates are outside the 0–1 range")

    x_values = [x for x, y in points]
    y_values = [y for x, y in points]

    x_min, x_max = min(x_values), max(x_values)
    y_min, y_max = min(y_values), max(y_values)

    width = x_max - x_min
    height = y_max - y_min

    if width <= 0 or height <= 0:
        raise ValueError("Bounding box has zero dimensions")

    x_center = (x_min + x_max) / 2
    y_center = (y_min + y_max) / 2

    return (
        f"{class_id} "
        f"{x_center:.8f} "
        f"{y_center:.8f} "
        f"{width:.8f} "
        f"{height:.8f}"
    )


# ============================================================
# MAIN
# ============================================================

def main():
    if not SOURCE_DIR.is_dir():
        raise FileNotFoundError(
            f"Source dataset not found: {SOURCE_DIR}"
        )

    if SOURCE_DIR.resolve() == OUTPUT_DIR.resolve():
        raise ValueError("Source and output paths cannot be identical.")

    if SOURCE_DIR.resolve() in OUTPUT_DIR.resolve().parents:
        raise ValueError("Output directory cannot be inside the source.")

    if OUTPUT_DIR.exists():
        raise FileExistsError(
            f"Output already exists: {OUTPUT_DIR}\n"
            "Rename or remove it before running this script."
        )

    print("Copying dataset...")
    shutil.copytree(SOURCE_DIR, OUTPUT_DIR)

    converted = 0
    failed = 0
    issues = []

    # Find labels inside train/labels, valid/labels, test/labels, etc.
    label_files = [
        path for path in OUTPUT_DIR.rglob("*.txt")
        if "labels" in path.relative_to(OUTPUT_DIR).parts
    ]

    for label_file in label_files:
        converted_lines = []

        for line_number, line in enumerate(
            label_file.read_text(encoding="utf-8").splitlines(),
            start=1,
        ):
            if not line.strip():
                continue

            try:
                converted_lines.append(convert_obb_line(line))
                converted += 1

            except (ValueError, OverflowError) as exc:
                failed += 1
                issues.append(
                    f"{label_file.relative_to(OUTPUT_DIR)}:"
                    f"{line_number}: {exc}\n"
                    f"Original line: {line}"
                )

        label_file.write_text(
            "\n".join(converted_lines)
            + ("\n" if converted_lines else ""),
            encoding="utf-8",
        )

    report_path = OUTPUT_DIR / "conversion_issues.txt"
    report_path.write_text(
        "\n".join(issues) if issues else "No issues found.\n",
        encoding="utf-8",
    )

    print("\n========== CONVERSION SUMMARY ==========")
    print(f"Source:              {SOURCE_DIR}")
    print(f"Output:              {OUTPUT_DIR}")
    print(f"Annotations converted: {converted}")
    print(f"Annotations rejected:  {failed}")
    print(f"Issue report:          {report_path}")
    print("=========================================")
    print("\nOriginal dataset remains unchanged.")
    print("Review data.yaml paths before training.")


if __name__ == "__main__":
    main()
