export type VideoStatus =
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export interface CreateVideoUploadRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface CreateVideoUploadResponse {
  videoId: string;
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

/** Presigned PUT for a video's preview image (see the backend thumbnail service). */
export interface PresignedThumbnailUploadResponse {
  videoId: string;
  thumbnailStorageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface AttachThumbnailResponse {
  videoId: string;
  thumbnailStorageKey: string;
}

export interface TopFinding {
  crop: string;
  condition: string;
  confidence: number;
}

export interface IVideo {
  _id: string;
  userId: string;
  storageKey: string;
  /** Object-storage key of the preview image, or null when none was stored. */
  thumbnailStorageKey: string | null;
  /** Pre-signed GET URL for the preview image, when the backend supplies one. */
  thumbnailUrl?: string | null;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: VideoStatus;
  idempotencyKey: string;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  topFinding?: TopFinding; // ← add this
}