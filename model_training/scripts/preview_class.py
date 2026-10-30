
from pathlib import Path
from collections import Counter
import argparse

import yaml
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/mainv4.5"
)

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff",
}


# ============================================================
# DATASET HELPERS
# ============================================================

def load_class_names():
    for filename in ("data.yaml", "data.yml"):
        yaml_path = DATASET_PATH / filename

        if yaml_path.is_file():
            with yaml_path.open("r", encoding="utf-8") as file:
                config = yaml.safe_load(file)

            names = config.get("names") if isinstance(config, dict) else None

            if isinstance(names, dict):
                try:
                    names = [
                        names[key]
                        for key in sorted(names, key=lambda x: int(x))
                    ]
                except (ValueError, TypeError):
                    raise ValueError(
                        "Class IDs in data.yaml must be numeric."
                    )

            if not isinstance(names, list) or not names:
                raise ValueError(
                    "No valid class names found in data.yaml."
                )

            return [str(name) for name in names]

    raise FileNotFoundError(
        f"Cannot find data.yaml in {DATASET_PATH}"
    )


def find_directories(split):
    image_candidates = [
        DATASET_PATH / split / "images",
        DATASET_PATH / "images" / split,
    ]

    image_dir = next(
        (p for p in image_candidates if p.is_dir()), None
    )

    if image_dir is None:
        raise FileNotFoundError(
            f"Cannot find the image directory for '{split}'."
        )

    label_candidates = [
        image_dir.parent / "labels",
        DATASET_PATH / split / "labels",
        DATASET_PATH / "labels" / split,
    ]

    label_dir = next(
        (p for p in label_candidates if p.is_dir()), None
    )

    if label_dir is None:
        raise FileNotFoundError(
            f"Cannot find the label directory for '{split}'."
        )

    return image_dir, label_dir


# ============================================================
# YOLO LABEL READER
# ============================================================

def read_yolo_labels(label_path, class_names):
    """
    Each YOLO detection line has:
    class_id x_center y_center width height

    Coordinates are normalized between 0 and 1.
    """

    annotations = []

    content = label_path.read_text(encoding="utf-8-sig")

    for line_number, line in enumerate(content.splitlines(), 1):
        if not line.strip():
            continue

        parts = line.split()

        if len(parts) != 5:
            raise ValueError(
                f"{label_path}, line {line_number}: "
                "expected 5 YOLO detection fields."
            )

        try:
            class_id = int(parts[0])
            x_center, y_center, width, height = map(
                float, parts[1:]
            )
        except ValueError as error:
            raise ValueError(
                f"Invalid annotation at {label_path}, "
                f"line {line_number}."
            ) from error

        if not 0 <= class_id < len(class_names):
            raise ValueError(
                f"Invalid class ID {class_id} in {label_path}"
            )

        if not (
            0 <= x_center <= 1
            and 0 <= y_center <= 1
            and 0 < width <= 1
            and 0 < height <= 1
        ):
            raise ValueError(
                f"Invalid normalized box at {label_path}, "
                f"line {line_number}."
            )

        annotations.append({
            "class_id": class_id,
            "x_center": x_center,
            "y_center": y_center,
            "width": width,
            "height": height,
        })

    return annotations


# ============================================================
# SCAN AND FILTER IMAGES
# ============================================================

def collect_images(
    split,
    class_names,
    target_class_id,
    exact_instances=None,
):
    image_dir, label_dir = find_directories(split)

    image_paths = sorted(
        p for p in image_dir.rglob("*")
        if p.is_file()
        and p.suffix.lower() in IMAGE_EXTENSIONS
    )

    results = []
    missing_labels = 0

    for image_path in image_paths:
        relative_path = image_path.relative_to(image_dir)
        label_path = (label_dir / relative_path).with_suffix(".txt")

        if not label_path.is_file():
            missing_labels += 1
            continue

        annotations = read_yolo_labels(label_path, class_names)

        target_count = sum(
            item["class_id"] == target_class_id
            for item in annotations
        )

        # Always require at least one instance of the chosen class.
        if target_count == 0:
            continue

        # If requested, require an exact number of instances.
        if (
            exact_instances is not None
            and target_count != exact_instances
        ):
            continue

        results.append({
            "image_path": image_path,
            "label_path": label_path,
            "annotations": annotations,
            "target_count": target_count,
        })

    print(f"\nSplit: {split}")
    print(f"Images found: {len(image_paths)}")
    print(f"Missing label files: {missing_labels}")
    print(f"Images matching your class filter: {len(results)}")

    return results


# ============================================================
# INTERACTIVE IMAGE VIEWER
# ============================================================

def launch_viewer(
    results,
    class_names,
    target_class_id,
    selected_only=False,
):
    if not results:
        print("No matching images found.")
        return

    state = {"index": 0}
    target_name = class_names[target_class_id]

    fig, ax = plt.subplots(figsize=(12, 8))
    plt.subplots_adjust(bottom=0.20)

    def show_image():
        ax.clear()

        item = results[state["index"]]
        image_path = item["image_path"]

        with Image.open(image_path) as source:
            image = source.convert("RGB")

        image_width, image_height = image.size
        ax.imshow(image)

        counts = Counter(
            annotation["class_id"]
            for annotation in item["annotations"]
        )

        # Draw the YOLO bounding boxes.
        for annotation in item["annotations"]:
            class_id = annotation["class_id"]

            if selected_only and class_id != target_class_id:
                continue

            xc = annotation["x_center"] * image_width
            yc = annotation["y_center"] * image_height
            width = annotation["width"] * image_width
            height = annotation["height"] * image_height

            x_min = xc - width / 2
            y_min = yc - height / 2

            color = (
                "lime" if class_id == target_class_id
                else "cyan"
            )

            rectangle = patches.Rectangle(
                (x_min, y_min),
                width,
                height,
                linewidth=2,
                edgecolor=color,
                facecolor="none",
            )
            ax.add_patch(rectangle)

            label = class_names[class_id]

            ax.text(
                x_min,
                max(0, y_min - 3),
                label,
                color="black",
                fontsize=10,
                fontweight="bold",
                bbox={
                    "facecolor": color,
                    "alpha": 0.85,
                    "pad": 2,
                },
            )

        class_summary = ", ".join(
            f"{class_names[cid]}: {count}"
            for cid, count in sorted(counts.items())
        ) or "No annotations"

        ax.set_title(
            f"Image {state['index'] + 1}/{len(results)} | "
            f"{image_path.name}\n"
            f"Selected class: {target_name} "
            f"({item['target_count']} instances)\n"
            f"Annotations: {class_summary}",
            fontsize=11,
        )

        ax.axis("off")
        fig.canvas.draw_idle()

    def previous_image(event):
        state["index"] = (
            state["index"] - 1
        ) % len(results)
        show_image()

    def next_image(event):
        state["index"] = (
            state["index"] + 1
        ) % len(results)
        show_image()

    # Add navigation buttons.
    from matplotlib.widgets import Button

    previous_ax = fig.add_axes([0.32, 0.06, 0.15, 0.07])
    next_ax = fig.add_axes([0.53, 0.06, 0.15, 0.07])

    previous_button = Button(previous_ax, "Previous")
    next_button = Button(next_ax, "Next")

    previous_button.on_clicked(previous_image)
    next_button.on_clicked(next_image)

    # Keyboard navigation.
    def on_key(event):
        if event.key in ("right", "n"):
            next_image(event)
        elif event.key in ("left", "p"):
            previous_image(event)
        elif event.key == "q":
            plt.close(fig)

    fig.canvas.mpl_connect("key_press_event", on_key)

    show_image()
    plt.show()


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Preview YOLO images belonging to a selected class."
    )

    parser.add_argument(
        "--class-name",
        default="Healthy",
        help="Exact class name from data.yaml. Default: Healthy",
    )

    parser.add_argument(
        "--split",
        choices=["train", "valid", "test"],
        default="train",
        help="Dataset split to preview. Default: train",
    )

    parser.add_argument(
        "--instances",
        type=int,
        default=None,
        help=(
            "Require exactly this many instances of the selected class. "
            "Default: show every image containing the class."
        ),
    )

    parser.add_argument(
        "--selected-only",
        action="store_true",
        help="Draw only the selected class's bounding boxes.",
    )

    args = parser.parse_args()

    if args.instances is not None and args.instances < 1:
        parser.error("--instances must be at least 1.")

    if not DATASET_PATH.is_dir():
        raise FileNotFoundError(
            f"Dataset path does not exist: {DATASET_PATH}"
        )

    class_names = load_class_names()

    matches = [
        i for i, name in enumerate(class_names)
        if name == args.class_name
    ]

    if len(matches) != 1:
        raise ValueError(
            f"Class '{args.class_name}' must match exactly one class.\n"
            f"Available classes: {class_names}"
        )

    target_class_id = matches[0]

    print("=" * 65)
    print("YOLO CLASS IMAGE PREVIEWER")
    print("=" * 65)
    print(f"Selected class: {args.class_name}")
    print(f"Class ID: {target_class_id}")
    print(f"Split: {args.split}")
    print(f"Exact instances: {args.instances or 'Any (at least 1)'}")
    print(f"Selected class boxes only: {args.selected_only}")

    results = collect_images(
        split=args.split,
        class_names=class_names,
        target_class_id=target_class_id,
        exact_instances=args.instances,
    )

    launch_viewer(
        results,
        class_names,
        target_class_id,
        selected_only=args.selected_only,
    )


if __name__ == "__main__":
    main()
