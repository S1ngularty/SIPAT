from __future__ import annotations

import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import requests

from models.ai import AIModels


# ============================================================
# CONFIGURATION
# ============================================================

SAMPLE_FPS = 5

# Rough amount of evidence required before reporting.
PERSISTENCE_SECONDS = 1.0

# At 5 FPS, we expect around 5 observations per second.
MIN_OBSERVATIONS = 4

# How many sampled frames a track can disappear before
# we consider the object gone.
MAX_MISSED_FRAMES = 2

CROP_CONFIDENCE = 0.40

DISEASE_CONFIDENCE = 0.40

# Minimum percentage of the disease bounding box that
# should overlap the crop bounding box.
CROP_OVERLAP_THRESHOLD = 0.10


# ============================================================
# TRACK STATE
# ============================================================

@dataclass
class TrackState:

    track_id: int

    condition: str

    first_seen: float

    last_seen: float

    observations: int = 0

    best_confidence: float = 0.0

    missed_frames: int = 0

    # Crop predictions observed while this disease track
    # was alive.
    crop_votes: dict[str, int] = field(
        default_factory=dict
    )

    crop_confidences: dict[str, float] = field(
        default_factory=dict
    )


# ============================================================
# SERVICE
# ============================================================

class DetectionService:

    def __init__(
        self
    ):
       self.models = AIModels(
            "app/models/crop_identification/v2.pt",
            "app/models/pest_disease_identification/v2.pt"
        )

    # ========================================================
    # PUBLIC
    # ========================================================

    async def process_video(
        self,
        video_url: str,
    ) -> dict:

        video_path = await self._download_video(
            video_url
        )

        try:

            return self._process_video(
                video_path
            )

        finally:

            self._delete_file(
                video_path
            )

    # ========================================================
    # VIDEO
    # ========================================================

    def _process_video(
        self,
        video_path: str,
    ) -> dict:

        capture = cv2.VideoCapture(
            video_path
        )

        if not capture.isOpened():
            raise RuntimeError(
                "Unable to open video"
            )

        fps = capture.get(
            cv2.CAP_PROP_FPS
        )

        if fps <= 0:
            fps = 30.0

        total_frames = int(
            capture.get(
                cv2.CAP_PROP_FRAME_COUNT
            )
        )

        duration = (
            total_frames / fps
            if total_frames > 0
            else 0
        )

        sample_interval = max(
            1,
            round(fps / SAMPLE_FPS)
        )

        tracks: dict[int, TrackState] = {}

        completed_results = []

        frame_index = 0

        while True:

            success, frame = capture.read()

            if not success:
                break

            if frame_index % sample_interval != 0:

                frame_index += 1

                continue

            timestamp = frame_index / fps

            active_track_ids = set()

            # ------------------------------------------------
            # Disease/Pest tracking
            # ------------------------------------------------

            disease_results = (
                self.models.disease_model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    conf=DISEASE_CONFIDENCE,
                    verbose=False,
                )
            )

            # ------------------------------------------------
            # Crop detection
            #
            # We don't necessarily need crop tracking here.
            # We only need to know what crop is associated
            # with the current disease detection.
            # ------------------------------------------------

            crop_results = (
                self.models.crop_model.predict(
                    frame,
                    conf=CROP_CONFIDENCE,
                    verbose=False,
                )
            )

            crop_detections = (
                self._parse_crop_results(
                    crop_results
                )
            )

            # ------------------------------------------------
            # Process disease tracks
            # ------------------------------------------------

            detections = (
                self._parse_disease_tracks(
                    disease_results
                )
            )

            for detection in detections:

                track_id = detection["track_id"]

                active_track_ids.add(
                    track_id
                )

                crop = (
                    self._find_crop_for_detection(
                        detection["bbox"],
                        crop_detections,
                    )
                )

                if track_id not in tracks:

                    tracks[track_id] = TrackState(
                        track_id=track_id,
                        condition=detection["label"],
                        first_seen=timestamp,
                        last_seen=timestamp,
                    )

                track = tracks[track_id]

                track.last_seen = timestamp

                track.missed_frames = 0

                track.observations += 1

                track.best_confidence = max(
                    track.best_confidence,
                    detection["confidence"],
                )

                if crop is not None:

                    crop_label = crop["label"]

                    track.crop_votes[
                        crop_label
                    ] = (
                        track.crop_votes.get(
                            crop_label,
                            0,
                        )
                        + 1
                    )

                    track.crop_confidences[
                        crop_label
                    ] = max(
                        track.crop_confidences.get(
                            crop_label,
                            0.0,
                        ),
                        crop["confidence"],
                    )

            # ------------------------------------------------
            # Handle tracks that weren't detected this frame
            # ------------------------------------------------

            finished_track_ids = []

            for track_id, track in tracks.items():

                if track_id in active_track_ids:

                    continue

                track.missed_frames += 1

                if (
                    track.missed_frames
                    > MAX_MISSED_FRAMES
                ):

                    result = (
                        self._finalize_track(
                            track
                        )
                    )

                    if result is not None:

                        completed_results.append(
                            result
                        )

                    finished_track_ids.append(
                        track_id
                    )

            for track_id in finished_track_ids:

                del tracks[track_id]

            frame_index += 1

        capture.release()

        # ----------------------------------------------------
        # Finalize tracks still alive at end of video.
        # ----------------------------------------------------

        for track in tracks.values():

            result = self._finalize_track(
                track
            )

            if result is not None:

                completed_results.append(
                    result
                )

        return {
            "success": True,
            "video_duration": round(
                duration,
                2,
            ),
            "results": completed_results,
        }

    # ========================================================
    # DISEASE TRACK PARSING
    # ========================================================

    def _parse_disease_tracks(
        self,
        results,
    ) -> list[dict]:

        detections = []

        for result in results:

            if result.boxes is None:
                continue

            if result.boxes.id is None:
                continue

            track_ids = (
                result.boxes.id.int().cpu().tolist()
            )

            boxes = (
                result.boxes.xyxy.cpu().tolist()
            )

            confidences = (
                result.boxes.conf.cpu().tolist()
            )

            class_ids = (
                result.boxes.cls.int().cpu().tolist()
            )

            for (
                track_id,
                bbox,
                confidence,
                class_id,
            ) in zip(
                track_ids,
                boxes,
                confidences,
                class_ids,
            ):

                label = (
                    self.models
                    .disease_model
                    .names[class_id]
                )

                detections.append({
                    "track_id": track_id,

                    "label": label,

                    "confidence": float(
                        confidence
                    ),

                    "bbox": tuple(
                        map(
                            int,
                            bbox,
                        )
                    ),
                })

        return detections

    # ========================================================
    # CROP PARSING
    # ========================================================

    def _parse_crop_results(
        self,
        results,
    ) -> list[dict]:

        detections = []

        for result in results:

            if result.boxes is None:
                continue

            boxes = (
                result.boxes.xyxy.cpu().tolist()
            )

            confidences = (
                result.boxes.conf.cpu().tolist()
            )

            class_ids = (
                result.boxes.cls.int().cpu().tolist()
            )

            for (
                bbox,
                confidence,
                class_id,
            ) in zip(
                boxes,
                confidences,
                class_ids,
            ):

                label = (
                    self.models
                    .crop_model
                    .names[class_id]
                )

                detections.append({
                    "label": label,

                    "confidence": float(
                        confidence
                    ),

                    "bbox": tuple(
                        map(
                            int,
                            bbox,
                        )
                    ),
                })

        return detections

    # ========================================================
    # CROP ASSOCIATION
    # ========================================================

    def _find_crop_for_detection(
        self,
        disease_bbox,
        crop_detections,
    ) -> dict | None:

        best_crop = None

        best_overlap = 0.0

        for crop in crop_detections:

            overlap = (
                self._intersection_over_disease_area(
                    disease_bbox,
                    crop["bbox"],
                )
            )

            if overlap > best_overlap:

                best_overlap = overlap

                best_crop = crop

        if (
            best_crop is None
            or best_overlap < CROP_OVERLAP_THRESHOLD
        ):

            return None

        return best_crop

    # ========================================================
    # FINALIZE TRACK
    # ========================================================

    def _finalize_track(
        self,
        track: TrackState,
    ) -> dict | None:

        duration = (
            track.last_seen
            - track.first_seen
        )

        # ----------------------------------------------------
        # Persistence requirement
        # ----------------------------------------------------

        if (
            duration < PERSISTENCE_SECONDS
            and track.observations < MIN_OBSERVATIONS
        ):

            return None

        # ----------------------------------------------------
        # Determine crop
        # ----------------------------------------------------

        crop_label = self._get_best_crop(
            track
        )

        return {
            "track_id": track.track_id,

            "crop": (
                crop_label
                if crop_label is not None
                else "unknown"
            ),

            "condition": track.condition,

            "confidence": round(
                track.best_confidence,
                4,
            ),

            "duration": round(
                duration,
                2,
            ),

            "observations": (
                track.observations
            ),
        }

    # ========================================================
    # BEST CROP
    # ========================================================

    def _get_best_crop(
        self,
        track: TrackState,
    ) -> str | None:

        if not track.crop_votes:
            return None

        return max(
            track.crop_votes,
            key=track.crop_votes.get,
        )

    # ========================================================
    # INTERSECTION
    # ========================================================

    def _intersection_over_disease_area(
        self,
        disease_bbox,
        crop_bbox,
    ) -> float:

        dx1, dy1, dx2, dy2 = disease_bbox

        cx1, cy1, cx2, cy2 = crop_bbox

        x1 = max(dx1, cx1)

        y1 = max(dy1, cy1)

        x2 = min(dx2, cx2)

        y2 = min(dy2, cy2)

        width = max(
            0,
            x2 - x1,
        )

        height = max(
            0,
            y2 - y1,
        )

        intersection_area = (
            width * height
        )

        disease_area = (
            max(0, dx2 - dx1)
            * max(0, dy2 - dy1)
        )

        if disease_area <= 0:
            return 0.0

        return (
            intersection_area
            / disease_area
        )

    # ========================================================
    # DOWNLOAD
    # ========================================================

    async def _download_video(
        self,
        video_url: str,
    ) -> str:

        response = requests.get(
            video_url,
            stream=True,
            timeout=60,
        )

        response.raise_for_status()

        temporary_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".mp4",
        )

        try:

            for chunk in response.iter_content(
                chunk_size=1024 * 1024
            ):

                if chunk:
                    temporary_file.write(
                        chunk
                    )

            temporary_file.close()

            return temporary_file.name

        except Exception:

            temporary_file.close()

            Path(
                temporary_file.name
            ).unlink(
                missing_ok=True
            )

            raise

    # ========================================================
    # DELETE TEMP VIDEO
    # ========================================================

    def _delete_file(
        self,
        file_path: str,
    ):

        Path(
            file_path
        ).unlink(
            missing_ok=True
        )