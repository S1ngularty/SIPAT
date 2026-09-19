import { randomUUID } from "node:crypto";
import { r2Client } from "../../integrations/storage/r2.client.js";

import { videoRepository } from "./video.repository.js";
import type { CreateVideoInput, Video } from "./video.types.js";

import { validateVideoUpload } from "./video.validation.js";
import type { IPresignedUploadResponse } from "./video.dto.js";

export class VideoService {
  private generateVideoMetadata(userId: string, input: CreateVideoInput) {
    const videoId = randomUUID();

    const extension =
      input.contentType === "video/mp4"
        ? "mp4"
        : input.contentType === "video/webm"
          ? "webm"
          : "mov";

    const storageKey = `videos/${userId}/${videoId}/${input.fileName}.${extension}`;

    return {
      videoId,
      extension,
      storageKey,
    };
  }

  async createUpload(
    userId: string,
    input: CreateVideoInput,
    idempotencyKey: string,
  ): Promise<IPresignedUploadResponse> {
    validateVideoUpload(input.contentType, input.fileSize);

    const idempotentVideoDoc =
      await videoRepository.findByIdempotencyKey(idempotencyKey);

    if (idempotentVideoDoc) {
      const vid = idempotentVideoDoc.toObject();

      const newUploadUrl = await r2Client.createUploadUrl(
        vid.storageKey,
        vid.contentType,
      );

      return {
        videoId: vid._id.toString(),
        storageKey: vid.storageKey,
        uploadUrl: newUploadUrl,
        expiresIn: 300,
      };
    }

    const metadata = this.generateVideoMetadata(userId, input);

    const videoDoc = await videoRepository.createVideo({
      userId,
      storageKey: metadata.storageKey,
      fileSize: input.fileSize,
      idempotencyKey: idempotencyKey,
      originalFileName: `${input.fileName}.${metadata.extension}`,
      contentType: input.contentType,
      status: "pending_upload",
    });

    const plainVideoObj = videoDoc.toObject();

    const uploadUrl = await r2Client.createUploadUrl(
      metadata.storageKey,
      input.contentType,
    );

    return {
      videoId: plainVideoObj._id.toString(),
      storageKey: metadata.storageKey,
      uploadUrl,
      expiresIn: 300,
    };
  }

  async updateUploadedVideoStatus(videoId: string): Promise<Video> {
    const result = await videoRepository.videoUpdateStatus(videoId, {
      status: "uploaded",
    });

    if (!result) throw new Error("Failed to find the video");

    return result?.toObject();
  }
}

export const videoService = new VideoService();
