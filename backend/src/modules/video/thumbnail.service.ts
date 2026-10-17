import { r2Client } from "../../integrations/storage/r2.client.js";

import type { VideoRepository } from "./video.repository.js";
import type {
  IAttachThumbnailResponse,
  IPresignedThumbnailUploadResponse,
} from "./video.dto.js";
import { thumbnailExtension, validateThumbnailUpload } from "./video.validation.js";

const UPLOAD_URL_TTL_SECONDS = 300;

/**
 * Owns a video's preview image (the thumbnail shown in diagnosis lists).
 *
 * The image never travels through the API. The client renders a frame from the
 * recording with `expo-video-thumbnails`, uploads it straight to object storage
 * (R2) with the presigned PUT minted here, then confirms the resulting key so
 * it can be persisted on the video document.
 *
 * Flow:
 *   1. `createUpload`  -> presigned PUT + the key the image must be stored at
 *   2. client PUTs the JPEG to that URL
 *   3. `attach`        -> validate the key and record it on the video
 */
export class ThumbnailService {
  constructor(private readonly videoRepository: VideoRepository) {}

  /**
   * Mirrors the video's own layout so a recording and its preview image live
   * together: `videos/{userId}/{videoId}/thumbnail.{ext}`.
   */
  private buildStorageKey(
    userId: string,
    videoId: string,
    contentType: string,
  ): string {
    const extension = thumbnailExtension(contentType);

    return `videos/${userId}/${videoId}/thumbnail.${extension}`;
  }

  /**
   * Mints a presigned PUT for the video's thumbnail.
   * Throws when the video does not exist or is not owned by `userId`.
   */
  async createUpload(
    userId: string,
    videoId: string,
    contentType: string,
  ): Promise<IPresignedThumbnailUploadResponse> {
    validateThumbnailUpload(contentType);

    const video = await this.videoRepository.findByIdAndUser(videoId, userId);

    if (!video) throw new Error(`Video not found: ${videoId}`);

    const thumbnailStorageKey = this.buildStorageKey(
      userId,
      videoId,
      contentType,
    );

    const uploadUrl = await r2Client.createUploadUrl(
      thumbnailStorageKey,
      contentType,
    );

    return {
      videoId,
      thumbnailStorageKey,
      uploadUrl,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    };
  }

  /**
   * Records an uploaded thumbnail on the video.
   *
   * The key is rejected unless it sits under this video's own prefix, so a
   * client cannot attach an object it does not own.
   */
  async attach(
    userId: string,
    videoId: string,
    thumbnailStorageKey: string,
  ): Promise<IAttachThumbnailResponse> {
    const expectedPrefix = `videos/${userId}/${videoId}/thumbnail.`;

    if (!thumbnailStorageKey.startsWith(expectedPrefix)) {
      throw new Error("Thumbnail key does not belong to this video");
    }

    const updated = await this.videoRepository.attachThumbnail(
      videoId,
      userId,
      thumbnailStorageKey,
    );

    if (!updated) throw new Error(`Video not found: ${videoId}`);

    return {
      videoId: updated._id.toString(),
      thumbnailStorageKey:
        updated.thumbnailStorageKey ?? thumbnailStorageKey,
    };
  }

  /** Presigned GET for a stored thumbnail; `null` when there is none. */
  async createDownloadUrl(
    thumbnailStorageKey: string | null | undefined,
    expiresIn = UPLOAD_URL_TTL_SECONDS,
  ): Promise<string | null> {
    if (!thumbnailStorageKey) return null;

    return r2Client.createDownloadUrl(thumbnailStorageKey, expiresIn);
  }

  /**
   * Best-effort removal of a stored thumbnail (used when a video is deleted).
   * A missing or already-deleted object must not fail the caller.
   */
  async remove(thumbnailStorageKey: string | null | undefined): Promise<void> {
    if (!thumbnailStorageKey) return;

    try {
      await r2Client.deleteObject(thumbnailStorageKey);
    } catch (error) {
      console.error(
        `Failed to delete thumbnail "${thumbnailStorageKey}":`,
        error,
      );
    }
  }
}
