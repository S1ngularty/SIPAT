from pathlib import Path
from PIL import Image

folder = Path("/home/singularity/Downloads/eggplant_leaf2")

for image_path in folder.iterdir():
    if image_path.suffix.lower() not in {".jpg", ".jpeg"}:
        continue

    try:
        with Image.open(image_path) as img:
            # Keep the original dimensions and convert to RGB
            img = img.convert("RGB")

            # Save back as JPEG with high quality
            img.save(
                image_path,
                "JPEG",
                quality=95,
                optimize=True
            )

        print(f"Compressed: {image_path.name}")

    except Exception as e:
        print(f"Error with {image_path.name}: {e}")

print("Done!")