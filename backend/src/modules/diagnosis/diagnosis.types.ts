import { Types } from "mongoose";
import type { Video } from "../video/video.types.js";

export interface DiagnosisResult {
  trackId: number;
  crop: string;
  condition: string;
  confidence: number;
  duration: number;
  observations: number;
  evidenceKey: string;
}

export interface GroqAnalysis {
  summary: string;
  recommendations: string[];
}

export interface CreateDiagnosisInput {
  videoId:  string;
  results: DiagnosisResult[];
  analysis: GroqAnalysis | null;
}

export interface Diagnosis {
  _id: Types.ObjectId;
  diagnosisName?: string;
  videoId: Types.ObjectId;

  results: DiagnosisResult[];
  analysis: GroqAnalysis | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * The video document embedded in a diagnosis response (no presigned URLs yet).
 * `_id` is present on the populated document but omitted from the shared
 * `Video` domain type, so it is declared optional here.
 */
export interface DiagnosisVideo {
  _id?: Types.ObjectId;
  userId: string;
  storageKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  idempotencyKey: string;

  /** Object-storage key of the preview image, or `null` when none was stored. */
  thumbnailStorageKey: string | null;

  status?:
    | "pending_upload"
    | "uploaded"
    | "processing"
    | "completed"
    | "failed";

  processedAt?: Date | null;
}

/** A `DiagnosisVideo` decorated with short-lived presigned GET URLs. */
export interface DiagnosisVideoWithUrls extends DiagnosisVideo {
  /** Pre-signed playback URL for the recording. */
  evidenceVideoUrl: string;

  /** Pre-signed GET for the preview image; `null` when the video has none. */
  thumbnailUrl: string | null;
}

export interface DiagnosisWIthDownloadUrls {
  _id: Types.ObjectId;

  diagnosisName?: string;

  video: DiagnosisVideoWithUrls;

  results: (DiagnosisResult & { evidenceUrl: string })[];
  analysis: GroqAnalysis | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * List rows are diagnosis documents with the owning video embedded via the
 * aggregation `$lookup`, plus a derived `thumbnailUrl` for rendering.
 */
export interface DiagnosisListItem extends Diagnosis {
  video: Omit<Video, "id"> & {
    _id: Types.ObjectId;
    thumbnailUrl: string | null;
  };
}

export interface DiagnosisListResult {
  data: DiagnosisListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type DiagnosisResultWithoutEvidenceUrl = Omit<
  DiagnosisResult & { evidenceUrl: string },
  "evidenceUrl"
>;

export type DiagnosisWithoutEvidenceUrls = Omit<
  DiagnosisWIthDownloadUrls,
  "video" | "results"
> & {
  video: DiagnosisVideo;
  results: DiagnosisResultWithoutEvidenceUrl[];
};
