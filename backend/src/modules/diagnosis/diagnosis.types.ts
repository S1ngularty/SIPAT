import { Types } from "mongoose";

export interface DiagnosisResult {
  trackId: number;
  crop: string;
  condition: string;
  confidence: number;
  duration: number;
  observations: number;
  evidenceKey: string;
}

export interface CreateDiagnosisInput {
  videoId: Types.ObjectId | string;
  results: DiagnosisResult[];
}

export interface Diagnosis {
  _id: Types.ObjectId;
  videoId: Types.ObjectId;

  results: DiagnosisResult[];

  createdAt: Date;
  updatedAt: Date;
}
