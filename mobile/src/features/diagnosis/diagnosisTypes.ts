export interface TrackResult {
  _id: string;
  trackId: number;
  crop: string;
  condition: string;
  confidence: number;
  duration: number;
  observations: number;
  evidenceKey: string; // storage path, e.g. "videos/.../evidence/track-59.jpg"
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
}

/**
 * What the API actually returns for a single diagnosis.
 * NOTE: no embedded `video` object in the response you shared.
 */
export interface VideoAnalysis {
  _id: string;
  videoId: string;
  results: TrackResult[];
  createdAt: string;
  updatedAt: string;
  video?: AnalysisVideo; // optional — populated only if your API includes it
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
