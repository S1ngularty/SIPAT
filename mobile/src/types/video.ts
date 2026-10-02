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

export interface TopFinding {
  crop: string;
  condition: string;
  confidence: number;
}

export interface IVideo {
  _id: string;
  userId: string;
  storageKey: string;
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