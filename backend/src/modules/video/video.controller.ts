import type { Request, Response, NextFunction } from "express";

import { VideoService } from "./video.service.js";
import { ThumbnailService } from "./thumbnail.service.js";
import type {
  AttachThumbnailInput,
  CreateThumbnailUploadInput,
  CreateVideoInput,
  Video,
} from "./video.types.js";
import type { ApiResponse } from "../../core/types/api.type.js";
import type {
  IAttachThumbnailResponse,
  IPresignedThumbnailUploadResponse,
  IPresignedUploadResponse,
} from "./video.dto.js";
import { wrapResponse } from "../../core/utils/response.util.js";

export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  createVideoUpload = async (
    req: Request<{}, {}, CreateVideoInput>,
    res: Response<ApiResponse<IPresignedUploadResponse>>,
    next: NextFunction,
  ) => {
    try {
      const { userId } = req.auth;

      if (!userId) throw new Error("missing userId");

      const { fileName, contentType, fileSize } = req.body;
      const idempotencyKey = req.get("Idempotency-Key");

      if (!idempotencyKey) throw new Error("missing idempotency key");

      const result = await this.videoService.createUpload(
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
  };

  updateVideoUploadStatus = async (
    req: Request<{ videoId: string }>,
    res: Response<ApiResponse<Video>>,
    next: NextFunction,
  ) => {
    try {
      const { userId } = req.auth;
      const { videoId } = req.params;

      if (!userId) throw new Error("missing userId");
      if (!videoId) throw new Error("Video ID is required");

      const result = await this.videoService.updateUploadedVideoStatus(videoId);

      wrapResponse("OK", 200, res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Step 1 of the thumbnail flow: hand the client a presigned PUT plus the key
   * its rendered preview image must be stored at.
   */
  createThumbnailUpload = async (
    req: Request<{ videoId: string }, {}, CreateThumbnailUploadInput>,
    res: Response<ApiResponse<IPresignedThumbnailUploadResponse>>,
    next: NextFunction,
  ) => {
    try {
      const { userId } = req.auth;
      const { videoId } = req.params;
      const { contentType } = req.body;

      if (!userId) throw new Error("missing userId");
      if (!videoId) throw new Error("Video ID is required");
      if (!contentType) throw new Error("contentType is required");

      const result = await this.thumbnailService.createUpload(
        userId,
        videoId,
        contentType,
      );

      wrapResponse("OK", 200, res, result);
    } catch (error) {
      next(error);
    }
  };

  /** Step 3: record the uploaded thumbnail on the video. */
  attachThumbnail = async (
    req: Request<{ videoId: string }, {}, AttachThumbnailInput>,
    res: Response<ApiResponse<IAttachThumbnailResponse>>,
    next: NextFunction,
  ) => {
    try {
      const { userId } = req.auth;
      const { videoId } = req.params;
      const { thumbnailStorageKey } = req.body;

      if (!userId) throw new Error("missing userId");
      if (!videoId) throw new Error("Video ID is required");
      if (!thumbnailStorageKey)
        throw new Error("thumbnailStorageKey is required");

      const result = await this.thumbnailService.attach(
        userId,
        videoId,
        thumbnailStorageKey,
      );

      wrapResponse("OK", 200, res, result);
    } catch (error) {
      next(error);
    }
  };
}
