from ultralytics import YOLO
import requests
from PIL import Image
from io import BytesIO
import os


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = "../models/crop_identification/best.pt"

IMG_SIZE = 640
CONF = 0.25
DEVICE = "cpu"


# ============================================================
# CLASS NAMES
# ============================================================

CLASS_NAMES = {
    0: "eggplant_leaf",
    1: "potato_leaf",  
    2: "tomato_leaf",
    3: "chili_leaf",
  
}


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 70)
print("CROP IDENTIFICATION MODEL EVALUATION")
print("=" * 70)

print(f"\nLoading model: {MODEL_PATH}")

model = YOLO(MODEL_PATH)

print("Model loaded successfully.")


# ============================================================
# CHOOSE IMAGE SOURCE
# ============================================================

print("\nChoose image source:")
print("1 - Internet URL")
print("2 - Local file path")

choice = input("Enter 1 or 2: ").strip()


# ============================================================
# LOAD IMAGE
# ============================================================

if choice == "1":

    url = input("\nPaste image URL: ").strip()

    print("\nDownloading image...")

    response = requests.get(url, timeout=15)
    response.raise_for_status()

    image = Image.open(
        BytesIO(response.content)
    ).convert("RGB")

    source = image


elif choice == "2":

    path = input("\nPaste absolute image path: ").strip()

    if not os.path.isfile(path):
        print(f"\nImage not found: {path}")
        exit()

    source = path


else:

    print("\nInvalid choice.")
    exit()


# ============================================================
# RUN PREDICTION
# ============================================================

print("\nRunning prediction...")

results = model.predict(
    source=source,
    imgsz=IMG_SIZE,
    conf=CONF,
    device=DEVICE,
    save=True,
    verbose=False,
)

result = results[0]


# ============================================================
# DISPLAY PREDICTIONS
# ============================================================

print("\n" + "=" * 70)
print("PREDICTIONS")
print("=" * 70)


if result.boxes is None or len(result.boxes) == 0:

    print("\nNo objects detected.")

else:

    tomato_confidences = []
    eggplant_confidences = []

    for i, box in enumerate(result.boxes, start=1):

        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        class_name = CLASS_NAMES.get(
            class_id,
            f"unknown_class_{class_id}"
        )

        x1, y1, x2, y2 = box.xyxy[0].tolist()

        print(f"\nDetection #{i}")
        print(f"  Class      : {class_name}")
        print(f"  Confidence : {confidence:.2%}")
        print(
            f"  Bounding Box: "
            f"[{x1:.1f}, {y1:.1f}, "
            f"{x2:.1f}, {y2:.1f}]"
        )

        # ----------------------------------------------------
        # Store tomato / eggplant confidence
        # ----------------------------------------------------

        if class_id == 0:
            eggplant_confidences.append(confidence)

        elif class_id == 2:
            tomato_confidences.append(confidence)


    # ========================================================
    # TOMATO VS EGGPLANT SUMMARY
    # ========================================================

    print("\n" + "-" * 70)
    print("TOMATO VS EGGPLANT")
    print("-" * 70)

    if tomato_confidences:

        print(
            f"Tomato detections  : "
            f"{len(tomato_confidences)}"
        )

        print(
            f"Highest confidence : "
            f"{max(tomato_confidences):.2%}"
        )

        print(
            f"Average confidence : "
            f"{sum(tomato_confidences) / len(tomato_confidences):.2%}"
        )

    else:

        print("Tomato detections  : 0")


    if eggplant_confidences:

        print(
            f"\nEggplant detections: "
            f"{len(eggplant_confidences)}"
        )

        print(
            f"Highest confidence : "
            f"{max(eggplant_confidences):.2%}"
        )

        print(
            f"Average confidence : "
            f"{sum(eggplant_confidences) / len(eggplant_confidences):.2%}"
        )

    else:

        print("\nEggplant detections: 0")


# ============================================================
# FINISHED
# ============================================================

print("\n" + "=" * 70)
print("EVALUATION COMPLETE")
print("=" * 70)

print(
    "\nAnnotated result saved in:"
    "\nruns/detect/predict/"
)