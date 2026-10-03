export interface TrackResult {
  _id: string;
  trackId: number;
  crop: string;
  condition: string;
  confidence: number;
  duration: number;
  observations: number;
  evidenceKey: string;
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

export interface VideoAnalysis {
  _id: string;
  videoId: string;
  results: TrackResult[];
  createdAt: string;
  updatedAt: string;
  video: AnalysisVideo;
}


