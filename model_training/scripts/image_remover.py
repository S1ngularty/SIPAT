
from pathlib import Path
from collections import Counter
from functools import lru_cache
import argparse
import math

import yaml
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.widgets import Button
from PIL import Image, ImageOps


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_PATH = Path(
    "/home/singularity/Downloads/pest_disease_datasets/set2/main"
)

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp",
    ".webp", ".tif", ".tiff",
}

# Display settings. Original images are never resized or modified.
DISPLAY_MAX_SIZE = (1400, 1000)

# Number of decoded images retained in memory.
IMAGE_CACHE_SIZE = 12

# True  = Actually delete image and label.
# False = Disable deletion.
ENABLE_DELETION = True

# Visualization settings.
BOX_LINE_WIDTH = 1.5
LABEL_FONT_SIZE = 8


# ============================================================
# DATASET HELPERS
# ============================================================

def load_class_names():

    for filename in ("data.yaml", "data.yml"):

        yaml_path = DATASET_PATH / filename

        if yaml_path.is_file():

            with yaml_path.open("r", encoding="utf-8") as file:
                config = yaml.safe_load(file)

            names = (
                config.get("names")
                if isinstance(config, dict)
                else None
            )

            if isinstance(names, dict):

                try:
                    names = [
                        names[key]
                        for key in sorted(
                            names,
                            key=lambda x: int(x)
                        )
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
        (p for p in image_candidates if p.is_dir()),
        None,
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
        (p for p in label_candidates if p.is_dir()),
        None,
    )

    if label_dir is None:

        raise FileNotFoundError(
            f"Cannot find the label directory for '{split}'."
        )

    return image_dir, label_dir


# ============================================================
# IMAGE LOADER AND CACHE
# ============================================================

@lru_cache(maxsize=IMAGE_CACHE_SIZE)
def load_image(image_path):

    """
    Load, orient, resize, and cache an image.

    Resizing only affects the in-memory display copy.
    Original dataset images remain unchanged.
    """

    with Image.open(image_path) as source:

        image = ImageOps.exif_transpose(source).convert("RGB")

        image.thumbnail(
            DISPLAY_MAX_SIZE,
            Image.Resampling.BILINEAR,
        )

        return np.asarray(image).copy()


# ============================================================
# YOLO LABEL READER
# ============================================================

def read_yolo_labels(label_path, class_names):

    annotations = []

    content = label_path.read_text(
        encoding="utf-8-sig"
    )

    for line_number, line in enumerate(
        content.splitlines(), 1
    ):

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

            if str(class_id) != parts[0]:
                raise ValueError("Class ID must be an integer.")

            x_center, y_center, width, height = map(
                float, parts[1:]
            )

        except ValueError as error:

            raise ValueError(
                f"Invalid annotation at {label_path}, "
                f"line {line_number}: {error}"
            ) from error

        if not 0 <= class_id < len(class_names):

            raise ValueError(
                f"Invalid class ID {class_id} in {label_path}"
            )

        coordinates = [
            x_center, y_center, width, height
        ]

        if not all(math.isfinite(v) for v in coordinates):

            raise ValueError(
                f"Non-finite coordinates at {label_path}, "
                f"line {line_number}."
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

        if (
            x_center - width / 2 < -1e-6
            or x_center + width / 2 > 1 + 1e-6
            or y_center - height / 2 < -1e-6
            or y_center + height / 2 > 1 + 1e-6
        ):

            raise ValueError(
                f"Bounding box extends outside image at "
                f"{label_path}, line {line_number}."
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

        label_path = (
            label_dir / relative_path
        ).with_suffix(".txt")

        if not label_path.is_file():

            missing_labels += 1
            continue

        annotations = read_yolo_labels(
            label_path,
            class_names,
        )

        target_count = sum(
            item["class_id"] == target_class_id
            for item in annotations
        )

        if target_count == 0:
            continue

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
# IMAGE DELETION
# ============================================================

def delete_image_pair(item):

    image_path = item["image_path"]
    label_path = item["label_path"]

    print("\n========== DELETING IMAGE ==========")

    print(f"Image: {image_path}")
    print(f"Label: {label_path}")

    try:

        image_path.unlink()

        label_path.unlink(missing_ok=True)

        print("[SUCCESS] Image and label deleted.")

        # Clear cached images so deleted files are not retained.
        load_image.cache_clear()

        return True

    except OSError as error:

        print(f"[ERROR] Failed to delete files: {error}")

        return False


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

    state = {
        "index": 0,
        "deleted": 0,
    }

    target_name = class_names[target_class_id]

    fig, ax = plt.subplots(figsize=(12, 8))

    plt.subplots_adjust(bottom=0.23)

    # --------------------------------------------------------
    # REUSABLE MATPLOTLIB ARTISTS
    # --------------------------------------------------------

    image_artist = None

    box_artists = []
    text_artists = []

    def clear_annotations():

        for artist in box_artists:
            artist.remove()

        for artist in text_artists:
            artist.remove()

        box_artists.clear()
        text_artists.clear()

    # --------------------------------------------------------
    # DISPLAY CURRENT IMAGE
    # --------------------------------------------------------

    def show_image():

        nonlocal image_artist

        if not results:

            clear_annotations()

            if image_artist is not None:
                image_artist.set_visible(False)

            ax.set_title("No remaining images.")
            ax.axis("off")

            fig.canvas.draw_idle()
            return

        state["index"] = max(
            0,
            min(state["index"], len(results) - 1)
        )

        item = results[state["index"]]

        image_path = item["image_path"]

        # Cached image loading.
        try:

            image = load_image(str(image_path))

        except Exception as error:

            print(
                f"[ERROR] Could not load {image_path}: {error}"
            )

            state["index"] = (
                state["index"] + 1
            ) % len(results)

            show_image()
            return

        image_height, image_width = image.shape[:2]

        # ----------------------------------------------------
        # UPDATE EXISTING IMAGE ARTIST
        # ----------------------------------------------------

        if image_artist is None:

            image_artist = ax.imshow(
                image,
                interpolation="nearest",
                aspect="auto",
            )

        else:

            image_artist.set_data(image)
            image_artist.set_visible(True)

            image_artist.set_extent([
                -0.5,
                image_width - 0.5,
                image_height - 0.5,
                -0.5,
            ])

        ax.set_xlim(-0.5, image_width - 0.5)
        ax.set_ylim(image_height - 0.5, -0.5)

        # ----------------------------------------------------
        # REMOVE PREVIOUS ANNOTATIONS
        # ----------------------------------------------------

        clear_annotations()

        counts = Counter(
            annotation["class_id"]
            for annotation in item["annotations"]
        )

        # ----------------------------------------------------
        # DRAW CURRENT ANNOTATIONS
        # ----------------------------------------------------

        for annotation in item["annotations"]:

            class_id = annotation["class_id"]

            if (
                selected_only
                and class_id != target_class_id
            ):
                continue

            xc = annotation["x_center"] * image_width
            yc = annotation["y_center"] * image_height

            width = annotation["width"] * image_width
            height = annotation["height"] * image_height

            x_min = xc - width / 2
            y_min = yc - height / 2

            color = (
                "lime"
                if class_id == target_class_id
                else "cyan"
            )

            rectangle = patches.Rectangle(
                (x_min, y_min),
                width,
                height,
                linewidth=BOX_LINE_WIDTH,
                edgecolor=color,
                facecolor="none",
                antialiased=False,
            )

            ax.add_patch(rectangle)
            box_artists.append(rectangle)

            label = class_names[class_id]

            text = ax.text(
                x_min,
                max(0, y_min - 3),
                label,
                color="black",
                fontsize=LABEL_FONT_SIZE,
                fontweight="bold",
                bbox={
                    "facecolor": color,
                    "alpha": 0.85,
                    "pad": 1,
                },
            )

            text_artists.append(text)

        # ----------------------------------------------------
        # IMAGE INFORMATION
        # ----------------------------------------------------

        class_summary = ", ".join(
            f"{class_names[cid]}: {count}"
            for cid, count in sorted(counts.items())
        ) or "No annotations"

        ax.set_title(
            f"Image {state['index'] + 1}/{len(results)} | "
            f"{image_path.name}\n"
            f"Selected class: {target_name} "
            f"({item['target_count']} instances)\n"
            f"Annotations: {class_summary}\n"
            f"Deleted: {state['deleted']}",
            fontsize=10,
        )

        ax.axis("off")

        fig.canvas.draw_idle()

    # ========================================================
    # NAVIGATION
    # ========================================================

    def previous_image(event):

        if not results:
            return

        state["index"] = (
            state["index"] - 1
        ) % len(results)

        show_image()

    def next_image(event):

        if not results:
            return

        state["index"] = (
            state["index"] + 1
        ) % len(results)

        show_image()

    # ========================================================
    # DELETE CURRENT IMAGE
    # ========================================================

    def remove_current_image(event):

        if not ENABLE_DELETION or not results:
            return

        item = results[state["index"]]

        print(
            f"\n[DELETE REQUEST] {item['image_path'].name}"
        )

        success = delete_image_pair(item)

        if not success:
            return

        state["deleted"] += 1

        results.pop(state["index"])

        print(
            f"[PROGRESS] {state['deleted']} images deleted."
        )

        if state["index"] >= len(results):

            state["index"] = max(
                0,
                len(results) - 1,
            )

        show_image()

    # ========================================================
    # BUTTONS
    # ========================================================

    previous_ax = fig.add_axes(
        [0.20, 0.06, 0.15, 0.07]
    )

    next_ax = fig.add_axes(
        [0.42, 0.06, 0.15, 0.07]
    )

    delete_ax = fig.add_axes(
        [0.64, 0.06, 0.15, 0.07]
    )

    previous_button = Button(
        previous_ax,
        "Previous",
    )

    next_button = Button(
        next_ax,
        "Next",
    )

    delete_button = Button(
        delete_ax,
        "DELETE",
    )

    previous_button.on_clicked(previous_image)
    next_button.on_clicked(next_image)
    delete_button.on_clicked(remove_current_image)

    # ========================================================
    # KEYBOARD CONTROLS
    # ========================================================

    def on_key(event):

        if event.key in ("right", "n"):

            next_image(event)

        elif event.key in ("left", "p"):

            previous_image(event)

        elif event.key == "d":

            remove_current_image(event)

        elif event.key == "q":

            plt.close(fig)

    fig.canvas.mpl_connect(
        "key_press_event",
        on_key,
    )

    # Initial display.
    show_image()

    plt.show()

    # ========================================================
    # VIEWER SUMMARY
    # ========================================================

    print("\n========== VIEWER SUMMARY ==========")

    print(f"Deleted images: {state['deleted']}")
    print(f"Remaining images: {len(results)}")

    print("===================================\n")


# ============================================================
# MAIN
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Preview and delete YOLO images "
            "belonging to a selected class."
        )
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
        help="Require exactly this many instances of the selected class.",
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
    print("YOLO CLASS IMAGE REVIEWER AND REMOVER")
    print("=" * 65)

    print(f"Selected class: {args.class_name}")
    print(f"Class ID: {target_class_id}")
    print(f"Split: {args.split}")
    print(f"Exact instances: {args.instances or 'Any'}")
    print(f"Selected class boxes only: {args.selected_only}")
    print(f"Deletion enabled: {ENABLE_DELETION}")
    print(f"Display resolution: {DISPLAY_MAX_SIZE}")
    print(f"Image cache: {IMAGE_CACHE_SIZE} images")

    results = collect_images(
        split=args.split,
        class_names=class_names,
        target_class_id=target_class_id,
        exact_instances=args.instances,
    )

    print("\nKEYBOARD CONTROLS")
    print("LEFT / P  : Previous image")
    print("RIGHT / N : Next image")
    print("D         : Delete image and corresponding label")
    print("Q         : Quit")

    launch_viewer(
        results,
        class_names,
        target_class_id,
        selected_only=args.selected_only,
    )


if __name__ == "__main__":
    main()
