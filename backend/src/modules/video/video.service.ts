import { randomUUID } from "node:crypto";
import { r2Client } from "../../integrations/storage/r2.client.js";

import type { CreateVideoInput, Video } from "./video.types.js";
import {
  validateVideoLocation,
  validateVideoUpload,
} from "./video.validation.js";
import type {
  IPresignedUploadResponse,
  IVideoListRow,
} from "./video.dto.js";
import { AIQueue } from "../../jobs/queues/ai.queue.js";
import type { VideoRepository } from "./video.repository.js";
import type { ThumbnailService } from "./thumbnail.service.js";
import { diagnosisRepository } from "../diagnosis/diagnosis.repository.js";

export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly thumbnailService: ThumbnailService,
  ) {}

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
    validateVideoLocation(input.location);

    const idempotentVideoDoc =
      await this.videoRepository.findByIdempotencyKey(idempotencyKey);

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

    const videoDoc = await this.videoRepository.createVideo({
      userId,
      storageKey: metadata.storageKey,
      fileSize: input.fileSize,
      idempotencyKey: idempotencyKey,
      originalFileName: `${input.fileName}.${metadata.extension}`,
      contentType: input.contentType,
      status: "pending_upload",
      location: input.location ?? null,
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

  /**
   * The signed-in user's videos, newest first, each with its diagnosis joined
   * (or `null` when the video has none yet) and a presigned preview URL.
   */
  async getVideoList(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: IVideoListRow[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const result = await this.videoRepository.findPaginatedWithDiagnosis({
      userId,
      page,
      limit,
    });

    const data = await Promise.all(
      result.data.map(async (video) => ({
        ...video,
        diagnosis: video.diagnosis ?? null,
        thumbnailUrl: await this.thumbnailService.createDownloadUrl(
          video.thumbnailStorageKey,
        ),
      })),
    );

    return {
      data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async updateUploadedVideoStatus(videoId: string): Promise<Video> {
    const result = await this.videoRepository.videoUpdateStatus(videoId, {
      status: "uploaded",
    });

    if (!result) throw new Error("Failed to find the video");

    AIQueue.add("process-video", {
      videoId: videoId,
    });

    return result?.toObject();
  }

  /**
   * `videos/{userId}/{videoId}/clip.mp4` -> `videos/{userId}/{videoId}/`.
   * Everything belonging to a video (recording + preview image) lives in that
   * directory, so trimming the storage key to it addresses them as a group.
   */
  private storageDirectory(storageKey: string): string {
    const lastSlash = storageKey.lastIndexOf("/");

    return lastSlash === -1 ? storageKey : storageKey.slice(0, lastSlash + 1);
  }

  async deleteVideo(videoId: string): Promise<Video> {
    const result = await this.videoRepository.deleteVideo(videoId);

    if (!result) throw new Error(`Failed to delete the video ${videoId}`);

    await this.purgeVideoAssets(result.storageKey, result.thumbnailStorageKey);

    return result;
  }

  /**
   * Deletes a video the signed-in user owns, together with its diagnosis and
   * every stored object (recording, preview image, evidence crops).
   *
   * Scoped by `userId`, so a caller can never delete somebody else's video.
   * Unlike the diagnosis endpoint this works for any status — including
   * `failed` / `cancelled` videos that never produced a diagnosis.
   */
  async deleteVideoForUser(userId: string, videoId: string): Promise<Video> {
    const result = await this.videoRepository.deleteVideoByIdAndUser(
      videoId,
      userId,
    );

    if (!result) throw new Error(`Video not found: ${videoId}`);

    await diagnosisRepository.deleteByVideoId(videoId);
    await this.purgeVideoAssets(result.storageKey, result.thumbnailStorageKey);

    return result;
  }

  /**
   * Re-queues a failed or cancelled video for AI processing.
   *
   * Resets the status to `uploaded` (the state the worker picks up from) and
   * enqueues a fresh job. Any partial diagnosis left by the failed run is
   * cleared first, otherwise creating the new one would collide.
   */
  async retryVideoProcessing(userId: string, videoId: string): Promise<Video> {
    const video = await this.videoRepository.findByIdAndUser(videoId, userId);

    if (!video) throw new Error(`Video not found: ${videoId}`);

    if (video.status !== "failed" && video.status !== "cancelled") {
      throw new Error(
        `Only failed or cancelled videos can be retried (status: ${video.status})`,
      );
    }

    await diagnosisRepository.deleteByVideoId(videoId);

    const updated = await this.videoRepository.updateStatusByIdAndUser(
      videoId,
      userId,
      {
        status: "uploaded",
        processedAt: null,
      },
    );

    if (!updated) throw new Error(`Video not found: ${videoId}`);

    await AIQueue.add("process-video", { videoId });

    return updated;
  }

  /** Removes everything a video owns in object storage. */
  private async purgeVideoAssets(
    storageKey: string,
    thumbnailStorageKey: string | null | undefined,
  ): Promise<void> {
    // The recording, its evidence crops and its preview image share one folder,
    // so a single prefix delete clears all of it — no need to delete each
    // object (video, thumbnail, evidence, …) one by one.
    const videoDirectory = this.storageDirectory(storageKey);

    await r2Client.deletePrefix(videoDirectory);

    // Older preview images were keyed off the document `_id` and so landed in a
    // different folder. Clean that up as well when it is elsewhere, so deleting
    // a video never leaves its thumbnail behind.
    const thumbnailDirectory = thumbnailStorageKey
      ? this.storageDirectory(thumbnailStorageKey)
      : null;

    if (thumbnailDirectory && thumbnailDirectory !== videoDirectory) {
      await r2Client.deletePrefix(thumbnailDirectory);
    }
  }
}
