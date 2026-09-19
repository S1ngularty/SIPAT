import type { Request, Response, NextFunction } from "express";

import { videoService } from "./video.service.js";
import type { CreateVideoInput, Video } from "./video.types.js";
import type { ApiResponse } from "../../core/types/api.type.js";
import type { IPresignedUploadResponse } from "./video.dto.js";
import { wrapResponse } from "../../core/utils/response.util.js";

export async function createVideoUpload(
  req: Request<{}, {}, CreateVideoInput>,
  res: Response<ApiResponse<IPresignedUploadResponse>>,
  next: NextFunction,
) {
  try {
    const { userId } = req.auth;

    if (!userId) throw new Error("missing userId");

    const { fileName, contentType, fileSize } = req.body;
    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey) throw new Error("missing idempotency key");

    const result = await videoService.createUpload(
      userId,
      {
        fileName,
        contentType,
        fileSize,
      },
      idempotencyKey,
    );

    wrapResponse("OK", 200, res, result);
  } catch (error) {
    next(error);
  }
}

export async function updateVideoUploadStatus(
  req: Request<{ videoId: string }>,
  res: Response<ApiResponse<Video>>,
  next: NextFunction,
) {
  try {
    const { userId } = req.auth;
    const { videoId } = req.params;

    if (!userId) throw new Error("missing userId");
    if (!videoId) throw new Error("Video ID is required");

    const result = await videoService.updateUploadedVideoStatus(videoId);

    wrapResponse("OK", 200, res, result);
  } catch (error) {
    next(error);
  }
}
