from pydantic import BaseModel
from ultralytics import YOLO


CROP_CLASSES = [
    "eggplant_leaf",
    "potato_leaf",
    "tomato_leaf",
    "chili_leaves",
]


DISEASE_CLASSES = [
   "Early Blight",
   "Healthy",
   "Late Blight",
   "Leaf Miner",
   "Leaf Mold",
   "Mosaic Virus",
   "Septoria",
   "Spider Mites",
   "Yellow Leaf Curl Virus",
   "Alternaria",
   "Downy Mildew",
   "Powdery Mildew",
  "Fruit Rot",
   "Melon Thrips",
   "Fruit Borer",
   "Aphids",
   "Flea Beetles",
   "Leaf Curl",
   "Anthracnose",
   "Bacterial Spot",
   "Cercospora Leaf Spot",
   "Bacterial Wilt",
   "Leaf Rust",
   "Looper"
]

class DetectionRequest(BaseModel):
    video_url: str
    storage_key:str


class DetectionResponse(BaseModel):
    success: bool
    results: list

    
class AIModels:

    def __init__(
        self,
        crop_model_path: str,
        disease_model_path: str,
    ):
        self.crop_model = YOLO(crop_model_path)
        self.disease_model = YOLO(disease_model_path)
        