from pathlib import Path

# Folder containing your images
folder = Path("/home/singularity/Downloads/potato.v4i.yolov8")

# Image extensions to include
extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

# Get images and sort them by filename
images = sorted(
    [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in extensions]
)

# Rename using temporary names first to avoid filename conflicts
temp_files = []

for i, image in enumerate(images, start=1):
    temp_name = folder / f"__temp_{i}{image.suffix.lower()}"
    image.rename(temp_name)
    temp_files.append((temp_name, i))

# Rename to final sequential names
for temp_file, i in temp_files:
    new_name = folder / f"{i}{temp_file.suffix}"
    temp_file.rename(new_name)

print(f"Renamed {len(images)} images.")