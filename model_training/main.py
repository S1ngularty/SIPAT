from ultralytics import YOLO
import requests
from PIL import Image
from io import BytesIO
import os


# ============================================================
# CONFIGURATION
# ============================================================

CROP_MODEL_PATH = "./models/crop_identification/v2.pt"
DISEASE_MODEL_PATH = "./models/pest_disease/v2.pt"

IMG_SIZE = 640
CONF = 0.25
DEVICE = "cpu"

CROP_CLASSES = {
    0: "eggplant_leaf",
    1: "potato_leaf",
    2: "tomato_leaf",
    3: "chili_leaf",
}


# ============================================================
# LOAD MODELS
# ============================================================

print("Loading crop model...")
crop_model = YOLO(CROP_MODEL_PATH)

print("Loading pest/disease model...")
disease_model = YOLO(DISEASE_MODEL_PATH)

print("Models loaded.\n")


# ============================================================
# CHOOSE IMAGE SOURCE
# ============================================================

print("Choose image source:")
print("1 - Internet URL")
print("2 - Local file path")

choice = input("Enter 1 or 2: ")


# ============================================================
# LOAD IMAGE
# ============================================================

if choice == "1":

    url = input("Paste image URL: ")

    response = requests.get(url)
    response.raise_for_status()

    image = Image.open(BytesIO(response.content)).convert("RGB")

elif choice == "2":

    path = input("Paste absolute file path: ")

    if not os.path.isfile(path):
        raise FileNotFoundError(f"Image not found: {path}")

    image = path

else:
    print("Invalid choice.")
    exit()


# ============================================================
# RUN BOTH MODELS
# ============================================================

print("\nRunning crop model...")

crop_results = crop_model.predict(
    source=image,
    imgsz=IMG_SIZE,
    conf=CONF,
    device=DEVICE,
    verbose=False
)

print("Running pest/disease model...")

disease_results = disease_model.predict(
    source=image,
    imgsz=IMG_SIZE,
    conf=CONF,
    device=DEVICE,
    verbose=False
)


crop_result = crop_results[0]
disease_result = disease_results[0]


# ============================================================
# EXTRACT CROP DETECTIONS
# ============================================================

crop_detections = []

for box in crop_result.boxes:

    cls_id = int(box.cls[0])
    confidence = float(box.conf[0])

    x1, y1, x2, y2 = box.xyxy[0].tolist()

    crop_name = CROP_CLASSES.get(
        cls_id,
        crop_model.names.get(cls_id, f"class_{cls_id}")
    )

    crop_detections.append({
        "class_id": cls_id,
        "name": crop_name,
        "confidence": confidence,
        "bbox": [x1, y1, x2, y2]
    })


# ============================================================
# EXTRACT DISEASE DETECTIONS
# ============================================================

disease_detections = []

for box in disease_result.boxes:

    cls_id = int(box.cls[0])
    confidence = float(box.conf[0])

    x1, y1, x2, y2 = box.xyxy[0].tolist()

    disease_name = disease_model.names.get(
        cls_id,
        f"class_{cls_id}"
    )

    disease_detections.append({
        "class_id": cls_id,
        "name": disease_name,
        "confidence": confidence,
        "bbox": [x1, y1, x2, y2]
    })


# ============================================================
# IOU FUNCTION
# ============================================================

def calculate_iou(box_a, box_b):

    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    intersection_x1 = max(ax1, bx1)
    intersection_y1 = max(ay1, by1)
    intersection_x2 = min(ax2, bx2)
    intersection_y2 = min(ay2, by2)

    intersection_width = max(
        0,
        intersection_x2 - intersection_x1
    )

    intersection_height = max(
        0,
        intersection_y2 - intersection_y1
    )

    intersection_area = (
        intersection_width *
        intersection_height
    )

    area_a = (
        max(0, ax2 - ax1) *
        max(0, ay2 - ay1)
    )

    area_b = (
        max(0, bx2 - bx1) *
        max(0, by2 - by1)
    )

    union_area = area_a + area_b - intersection_area

    if union_area <= 0:
        return 0.0

    return intersection_area / union_area


# ============================================================
# ASSOCIATE DISEASE → CROP
# ============================================================

ASSOCIATION_IOU_THRESHOLD = 0.10

associations = []

for disease in disease_detections:

    best_crop = None
    best_iou = 0.0

    for crop in crop_detections:

        iou = calculate_iou(
            disease["bbox"],
            crop["bbox"]
        )

        if iou > best_iou:
            best_iou = iou
            best_crop = crop

    if best_crop is not None and best_iou >= ASSOCIATION_IOU_THRESHOLD:

        associations.append({
            "disease": disease,
            "crop": best_crop,
            "iou": best_iou
        })

    else:

        associations.append({
            "disease": disease,
            "crop": None,
            "iou": best_iou
        })


# ============================================================
# PRINT CROP DETECTIONS
# ============================================================

print("\n" + "=" * 70)
print("CROP DETECTIONS")
print("=" * 70)

if not crop_detections:

    print("No crop/leaf detected.")

else:

    for i, crop in enumerate(crop_detections, start=1):

        print(
            f"{i}. {crop['name']} "
            f"| confidence: {crop['confidence']:.2f} "
            f"| bbox: {[round(x, 1) for x in crop['bbox']]}"
        )


# ============================================================
# PRINT DISEASE DETECTIONS
# ============================================================

print("\n" + "=" * 70)
print("PEST / DISEASE DETECTIONS")
print("=" * 70)

if not disease_detections:

    print("No pest/disease detected.")

else:

    for i, disease in enumerate(disease_detections, start=1):

        print(
            f"{i}. {disease['name']} "
            f"| confidence: {disease['confidence']:.2f} "
            f"| bbox: {[round(x, 1) for x in disease['bbox']]}"
        )


# ============================================================
# PRINT ASSOCIATIONS
# ============================================================

print("\n" + "=" * 70)
print("DISEASE → CROP ASSOCIATION")
print("=" * 70)

if not associations:

    print("No disease associations.")

else:

    for association in associations:

        disease = association["disease"]
        crop = association["crop"]
        iou = association["iou"]

        if crop is not None:

            print(
                f"{crop['name']} → {disease['name']} "
                f"| disease confidence: {disease['confidence']:.2f} "
                f"| IoU: {iou:.2f}"
            )

        else:

            print(
                f"{disease['name']} → NO CROP ASSOCIATION "
                f"| disease confidence: {disease['confidence']:.2f} "
                f"| best IoU: {iou:.2f}"
            )


# ============================================================
# SAVE ANNOTATED RESULTS
# ============================================================

crop_result.save(
    filename="runs/detect/combined_crop_result.jpg"
)

disease_result.save(
    filename="runs/detect/combined_disease_result.jpg"
)

print("\n" + "=" * 70)
print("RESULTS SAVED")
print("=" * 70)

print("Crop model:")
print("runs/detect/combined_crop_result.jpg")

print("\nDisease model:")
print("runs/detect/combined_disease_result.jpg")