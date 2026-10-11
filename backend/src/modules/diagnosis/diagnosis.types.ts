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

export interface DiagnosisWIthDownloadUrls {
  _id: Types.ObjectId;

  video: {
    userId: string;
    storageKey: string;
    originalFileName: string;
    contentType: string;
    fileSize: number;
    idempotencyKey: string;

    status?:
      | "pending_upload"
      | "uploaded"
      | "processing"
      | "completed"
      | "failed";

    processedAt?: Date | null;

    videoUrl: string;
  };

  results: (DiagnosisResult & { evidenceUrl: string })[];
  analysis: GroqAnalysis | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface DiagnosisListResult {
  data: Array<{
    diagnosis: Diagnosis;
    video: Video;
  }>;
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
  "results"
> & {
  results: DiagnosisResultWithoutEvidenceUrl[];
};
