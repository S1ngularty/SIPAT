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

export interface IVideo {
  id: string;
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
}
