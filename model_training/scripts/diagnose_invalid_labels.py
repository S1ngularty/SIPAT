
from pathlib import Path
import math

DATASET_DIR = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/2"
)

SPLITS = ("train", "valid", "test")
NUM_CLASSES = 4


def validate_obb(line):
    parts = line.split()

    if len(parts) != 9:
        return f"Expected 9 fields, found {len(parts)}"

    try:
        class_id = int(parts[0])
    except ValueError:
        return "Class ID is not an integer"

    if not 0 <= class_id < NUM_CLASSES:
        return f"Class ID out of range: {class_id}"

    try:
        values = [float(value) for value in parts[1:]]
    except ValueError:
        return "Non-numeric coordinate"

    if not all(math.isfinite(value) for value in values):
        return "Non-finite coordinate (NaN or infinity)"

    if any(value < 0 or value > 1 for value in values):
        return "Coordinate outside normalized range [0, 1]"

    points = [
        (values[i], values[i + 1])
        for i in range(0, 8, 2)
    ]

    # Polygon area using the shoelace formula
    area = abs(sum(
        points[i][0] * points[(i + 1) % 4][1]
        - points[(i + 1) % 4][0] * points[i][1]
        for i in range(4)
    )) / 2

    if area < 1e-10:
        return "Polygon has zero or near-zero area"

    # Check whether the four corners form a convex polygon
    cross_products = []

    for i in range(4):
        a = points[i]
        b = points[(i + 1) % 4]
        c = points[(i + 2) % 4]

        cross = (
            (b[0] - a[0]) * (c[1] - b[1])
            - (b[1] - a[1]) * (c[0] - b[0])
        )

        if abs(cross) > 1e-10:
            cross_products.append(cross)

    if not cross_products:
        return "Degenerate polygon"

    if any(v > 0 for v in cross_products) and any(
        v < 0 for v in cross_products
    ):
        return "Non-convex or incorrectly ordered corners"

    return None


def main():
    total_invalid = 0

    for split in SPLITS:
        labels_dir = DATASET_DIR / split / "labels"

        if not labels_dir.is_dir():
            print(f"[SKIP] Missing directory: {labels_dir}")
            continue

        split_invalid = 0

        for label_file in sorted(labels_dir.rglob("*.txt")):
            with label_file.open(
                "r", encoding="utf-8-sig"
            ) as file:
                for line_number, line in enumerate(file, 1):
                    if not line.strip():
                        continue

                    reason = validate_obb(line)

                    if reason:
                        split_invalid += 1
                        total_invalid += 1

                        relative = label_file.relative_to(DATASET_DIR)

                        print(
                            f"[INVALID] {relative}:"
                            f"{line_number} | {reason}"
                        )
                        print(f"    {line.strip()}")

        print(f"\n{split.upper()}: {split_invalid} invalid lines\n")

    print("=" * 70)
    print(f"TOTAL INVALID ANNOTATIONS: {total_invalid}")
    print("=" * 70)


if __name__ == "__main__":
    main()