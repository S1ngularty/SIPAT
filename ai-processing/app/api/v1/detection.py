from fastapi import APIRouter

from models.ai import DetectionRequest, DetectionResponse
from services.detection import DetectionService


router = APIRouter(
    prefix="/detection",
    tags=["Detection"],
)

detection_service = DetectionService()


@router.post(
    "/process",
    response_model=DetectionResponse,
)
async def process_video(
    request: DetectionRequest,
):
    return await detection_service.process_video(
        request.video_url,
        request.storage_key
    )