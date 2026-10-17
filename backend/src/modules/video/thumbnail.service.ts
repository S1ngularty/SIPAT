import { r2Client } from "../../integrations/storage/r2.client.js";

import type { VideoRepository } from "./video.repository.js";
import type {
  IAttachThumbnailResponse,
  IPresignedThumbnailUploadResponse,
} from "./video.dto.js";
import {
  thumbnailExtension,
  validateThumbnailUpload,
} from "./video.validation.js";

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
   * The preview image lives beside the video and its evidence, inside the
   * video's own folder: `videos/{userId}/{<storageKey segment>}/thumbnail.{ext}`.
   *
   * It must key off the recording's `storageKey` — not the document `_id` —
   * because the folder segment is a client-generated id that differs from
   * `_id`. Using `_id` would drop the thumbnail in a sibling folder, so it
   * would survive the video's prefix delete.
   */
  private buildStorageKey(videoStorageKey: string, contentType: string): string {
    const extension = thumbnailExtension(contentType);

    return `${this.storageDirectory(videoStorageKey)}thumbnail.${extension}`;
  }

  /** `videos/u/id/clip.mp4` -> `videos/u/id/`. */
  private storageDirectory(storageKey: string): string {
    const lastSlash = storageKey.lastIndexOf("/");

    return lastSlash === -1 ? storageKey : storageKey.slice(0, lastSlash + 1);
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
      video.storageKey,
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
   * The key is rejected unless it sits inside this video's own folder, so a
   * client cannot attach an object it does not own.
   */
  async attach(
    userId: string,
    videoId: string,
    thumbnailStorageKey: string,
  ): Promise<IAttachThumbnailResponse> {
    const video = await this.videoRepository.findByIdAndUser(videoId, userId);

    if (!video) throw new Error(`Video not found: ${videoId}`);

    const expectedPrefix = `${this.storageDirectory(video.storageKey)}thumbnail.`;

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
      thumbnailStorageKey: updated.thumbnailStorageKey ?? thumbnailStorageKey,
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
}
