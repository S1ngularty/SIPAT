from pathlib import Path
from ultralytics import YOLO

DATASET = Path("/home/singularity/Downloads/main_dataset/data.yaml")
MODEL = Path("/home/singularity/Desktop/SIPAT/model_training/yolo26m.pt")

model = YOLO(MODEL)

model.train(
    data=DATASET,
    epochs=200,
    imgsz=640,
    batch=16,
    patience=20,
    device=0,

    optimizer="auto",

    hsv_h=0.015,
    hsv_s=0.5,
    hsv_v=0.4,

    degrees=5.0,
    translate=0.10,
    scale=0.5,
    shear=2.0,
    perspective=0.0002,

    fliplr=0.5,
    flipud=0.0,

    mosaic=0.8,
    mixup=0.05,
    close_mosaic=10,

    project="/home/singularity/Desktop/SIPAT/model_training/runs",
    name="disease_pest_yolo26m",

    save=True,
    plots=True,
)