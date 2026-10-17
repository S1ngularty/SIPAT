
import type { VideoWithDiagnosis } from "./video.types.js";

export interface IPresignedUploadResponse {
  videoId: string | null;
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface IPresignedThumbnailUploadResponse {
  videoId: string;
  thumbnailStorageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface IAttachThumbnailResponse {
  videoId: string;
  thumbnailStorageKey: string;
}

/** A video list row: the video + its diagnosis + a presigned preview URL. */
export interface IVideoListRow extends VideoWithDiagnosis {
  thumbnailUrl: string | null;
}
