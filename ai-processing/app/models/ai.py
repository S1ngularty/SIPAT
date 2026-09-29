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
    "Septoria Leaf Spot",
    "Spider Mites",
    "Yellow Leaf Curl Virus",
    "Anthracnose",
    "Black Spot",
    "Botrytis Gray Mold",
    "Cercospora Leaf Spot",
    "Downy Mildew",
    "Leaf Curl",
    "Mycosphaerella Leaf Blotch",
    "Powdery Mildew",
    "Rust",
    "Bacterial Spot",
    "Fruit Rot",
    "Melon Thrips",
    "Fruit Borer",
    "Aphids",
    "Flea Beetles",
    "Bacterial Wilt",
]

class DetectionRequest(BaseModel):
    video_url: str
    video_id:str
    user_id:str
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
        