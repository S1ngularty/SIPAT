export interface TrackResult {
  _id: string;
  trackId: number;
  crop: string;
  condition: string;
  confidence: number;
  duration: number;
  observations: number;
  evidenceKey: string;
  evidenceUrl: string;
}

export type VideoStatus =
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export interface AnalysisVideo {
  _id: string;
  userId: string;
  storageKey: string;
  idempotencyKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: VideoStatus;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Pre-signed playback URL (R2/S3). Expires — check the `X-Amz-Expires`
   * query param on the URL. Currently 5 minutes in the backend response.
   */
  evidenceVideoUrl: string;
  /**
   * Object-storage key of the preview image, or `null` when none was stored.
   * The actual frame is fetched from `thumbnailUrl`.
   */
  thumbnailStorageKey: string | null;
  /**
   * Pre-signed GET URL for the video's preview image (R2/S3). Also expires,
   * so it must be refreshed alongside `evidenceVideoUrl`. `null` when the
   * video has no thumbnail.
   */
  thumbnailUrl: string | null;
}

export interface GroqAnalysis {
  summary: string;
  recommendations: string[];
}

/**
 * Response shape for a single diagnosis (`GET /diagnosis/:videoId`).
 * The video object is now embedded in the response.
 */
export interface VideoAnalysis {
  _id: string;
  videoId: string;
  diagnosisName?: string;
  video: AnalysisVideo;
  results: TrackResult[];
  analysis: GroqAnalysis | null;

  createdAt: string;
  updatedAt: string;
}

export interface DiseaseInfo {
  evidenceKey?: string;
  crop: string;
  condition: string;
  description?: string;
  symptoms?: string[];
  prevention?: string[];
  treatment?: string[];
}

/**
 * The diagnosis fields joined onto a video in the video list
 * (`GET /api/v1/videos`). `null` on a list row while the video is still being
 * processed.
 */
export interface VideoDiagnosisSummary {
  _id: string;
  diagnosisName?: string;
  results: TrackResult[];
  analysis: GroqAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One row of the video-driven list: a video (any status) plus its diagnosis
 * (or `null`). The screen renders the confidence when `diagnosis` is present,
 * otherwise a spinner + status.
 */
export interface VideoListItem {
  _id: string;
  userId: string;
  storageKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: VideoStatus;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Object-storage key of the preview image, or `null`. */
  thumbnailStorageKey: string | null;
  /** Pre-signed GET for the preview image; `null` when the video has none. */
  thumbnailUrl: string | null;
  diagnosis: VideoDiagnosisSummary | null;
}
