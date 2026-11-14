// ==========================================
// ENUMS / UNION TYPES
// ==========================================

import type { Types } from "mongoose";
import type {
  DiagnosisResult,
  GroqAnalysis,
} from "../diagnosis/diagnosis.types.js";

export type VideoStatus =
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

// ==========================================
// LOCATION
// ==========================================

/**
 * Where the recording was captured. Optional: the client may not have location
 * access, in which case AI processing falls back to the default farm location.
 */
export interface VideoLocation {
  latitude: number;
  longitude: number;
}

// ==========================================
// DOMAIN MODEL (plain shape, not Mongoose)
// ==========================================

export interface Video {
  id: string;
  userId: string;
  storageKey: string;
  /** Capture coordinates, or `null` when the client did not supply them. */
  location: VideoLocation | null;
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
  /** Optional capture coordinates, used for weather context during analysis. */
  location?: VideoLocation | null;
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
  location?: VideoLocation | null;
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
  location?: VideoLocation | null;
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
// VIDEO + DIAGNOSIS (LIST VIEW)
// ==========================================

/**
 * The diagnosis fields joined onto a video for the video list. Only the pieces
 * the list needs: the confidence comes from `results`, the display name from
 * `diagnosisName`.
 */
export interface VideoDiagnosisSummary {
  _id: Types.ObjectId;
  diagnosisName?: string;
  results: DiagnosisResult[];
  analysis: GroqAnalysis | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A video with its diagnosis embedded (or `null` while it is still being
 * processed). Rows come out of the repository without presigned URLs.
 */
export interface VideoWithDiagnosis {
  _id: Types.ObjectId;
  userId: string;
  storageKey: string;
  /** Absent on documents created before location capture was added. */
  location?: VideoLocation | null;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: VideoStatus;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  thumbnailStorageKey: string | null;
  diagnosis: VideoDiagnosisSummary | null;
}

/** Paginated result for the user's video list. */
export interface VideoWithDiagnosisListResult {
  data: VideoWithDiagnosis[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** A list row with the derived preview-image URL, ready to send to the client. */
export interface VideoListRow extends VideoWithDiagnosis {
  thumbnailUrl: string | null;
}

// ==========================================
// OWNERSHIP / AUTHORIZATION
// ==========================================

export interface IVideoOwnershipCheck {
  videoId: string;
  userId: string;
}

