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
}

/**
 * Response shape for a single diagnosis (`GET /diagnosis/:videoId`).
 * The video object is now embedded in the response.
 */
export interface VideoAnalysis {
  _id: string;
  videoId: string;
  video: AnalysisVideo;
  results: TrackResult[];
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