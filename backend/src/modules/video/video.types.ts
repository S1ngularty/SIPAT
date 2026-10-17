// ==========================================
// ENUMS / UNION TYPES
// ==========================================

export type VideoStatus =
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

// ==========================================
// DOMAIN MODEL (plain shape, not Mongoose)
// ==========================================

export interface Video {
  id: string;
  userId: string;
  storageKey: string;
  /**
   * Object-storage key of the preview image, or `null` when none was stored.
   * The image is generated on-device and uploaded straight to R2; only the key
   * is recorded here.
   */
  thumbnailStorageKey: string | null;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: VideoStatus;
  idempotencyKey: string;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// CREATE / INPUT TYPES
// ==========================================

/**
 * Input from client to initiate an upload.
 * No storageKey yet — backend generates it.
 */
export interface CreateVideoInput {
  fileName: string;
  contentType: string;
  fileSize: number;
}

/**
 * Internal create payload used by service/repository.
 * Includes generated fields like storageKey and userId.
 */
export interface ICreateVideo {
  userId: string;
  storageKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  idempotencyKey: string;
  status?: VideoStatus;
  processedAt?: Date | null;
  thumbnailStorageKey?: string | null;
}

/**
 * Input for minting a presigned PUT for a video's preview image.
 * The image is rendered on-device (`expo-video-thumbnails`) and uploaded
 * directly to object storage, so only its content type is needed here.
 */
export interface CreateThumbnailUploadInput {
  contentType: string;
}

/**
 * Confirms that a thumbnail was written to object storage. The key is validated
 * against the video's expected prefix so a client cannot point a video at an
 * object belonging to somebody else.
 */
export interface AttachThumbnailInput {
  thumbnailStorageKey: string;
}

// ==========================================
// UPDATE TYPES
// ==========================================

export interface IUpdateVideo {
  status?: VideoStatus;
  processedAt?: Date | null;
  storageKey?: string;
  originalFileName?: string;
  thumbnailStorageKey?: string | null;
}

export interface UpdateVideoStatusInput {
  status: VideoStatus;
  processedAt?: Date | null;
}

// ==========================================
// FILTER / QUERY TYPES
// ==========================================

export interface IVideoFilter {
  userId?: string;
  status?: VideoStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface IVideoProjection {
  includeStorageKey?: boolean;
  includeFileSize?: boolean;
  includeContentType?: boolean;
  includeTimestamps?: boolean;
}

export interface IVideoListOptions {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "processedAt" | "originalFileName";
  sortOrder?: "asc" | "desc";
  filter?: IVideoFilter;
  projection?: IVideoProjection;
}

// ==========================================
// OWNERSHIP / AUTHORIZATION
// ==========================================

export interface IVideoOwnershipCheck {
  videoId: string;
  userId: string;
}

