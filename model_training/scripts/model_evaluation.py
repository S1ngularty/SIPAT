from ultralytics import YOLO
import requests
from PIL import Image
from io import BytesIO
import os

# ==============================
# LOAD MODEL
# ==============================

model = YOLO("../models/pest_disease/best.pt")


# ==============================
# CHOOSE IMAGE SOURCE
# ==============================

print("Choose image source:")
print("1 - Internet URL")
print("2 - Local file path")

choice = input("Enter 1 or 2: ")


# ==============================
# OPTION 1: INTERNET IMAGE
# ==============================

if choice == "1":

    url = input("Paste image URL: ")

    response = requests.get(url)
    response.raise_for_status()

    image = Image.open(BytesIO(response.content))

    results = model.predict(
        source=image,
        imgsz=640,
        conf=0.25,
        device="cpu",
        save=True
    )


# ==============================
# OPTION 2: LOCAL IMAGE
# ==============================

elif choice == "2":

    path = input("Paste absolute image path: ")

    if not os.path.isfile(path):
        raise FileNotFoundError(f"Image not found: {path}")

    results = model.predict(
        source=path,
        imgsz=640,
        conf=0.25,
        device="cpu",
        save=True
    )


else:
    print("Invalid choice.")
    exit()


print("\nPrediction complete.")
print("Annotated result saved in: runs/detect/predict/")