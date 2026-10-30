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

/**
 * An agricultural term worth explaining to the farmer. The LLM guarantees that
 * `term` appears verbatim in the summary or one of the recommendations, so the
 * UI can highlight it in place.
 */
export interface GroqTerm {
  id: string;
  term: string;
  definition: string;
}

export interface GroqAnalysis {
  summary: string;
  recommendations: string[];
  /**
   * Optional because diagnoses created before the glossary prompt shipped have
   * no `terms` field stored.
   */
  terms?: GroqTerm[];
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

/** Bilingual explanation from a crop-problem record. `tl` Tagalog, `en` English. */
export interface LocalizedText {
  tl: string;
  en: string;
}

export interface CropProblemTreatment {
  category: string;
  examples: string[];
  cautions: string[];
}

export interface CropProblemSafety {
  ppe: string[];
  environmentalPrecautions: string[];
  harvestRestrictions: string;
}

export interface CropProblemMedia {
  url: string;
  type: string;
  caption: string;
}

export interface CropProblemMetadata {
  version: string;
  sources: string[];
  reviewDate: string | null;
  reviewStatus: string;
}

/**
 * Reference record served by `GET /api/v1/crop-problems` — the disease/pest
 * knowledge base. Mirrors `backend/src/modules/crop-problem/cropProblem.types.ts`.
 */
export interface CropProblem {
  _id: string;
  id: string;
  slug: string;
  name: string;
  localName: string;
  type: "disease" | "pest" | "healthy";
  category: string;
  scientificName: string;
  description: LocalizedText;
  affectedCrops: string[];
  affectedParts: string[];
  symptoms: string[];
  favorableConditions: string[];
  transmission: string[];
  severity: "low" | "medium" | "high";
  differentialDiagnosis: string[];
  management: string[];
  treatments: CropProblemTreatment[];
  actionRefs: string[];
  safety: CropProblemSafety;
  diagnosisGuidance: string[];
  media: CropProblemMedia[];
  metadata: CropProblemMetadata;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalized, display-ready view of a {@link CropProblem}, keyed to the crop +
 * condition pair detected in a video. The Evidence screen renders this directly.
 */
export interface DiseaseInfo {
  slug: string;
  crop: string;
  condition: string;
  name: string;
  localName?: string;
  scientificName?: string;
  type: "disease" | "pest" | "healthy";
  category: string;
  severity: "low" | "medium" | "high";
  description?: string;
  /** Visible signs / damage. */
  symptoms: string[];
  /** Conditions that encourage the problem. */
  favorableConditions: string[];
  /** How it spreads, or how the pest moves. */
  transmission: string[];
  /** Prevention and non-chemical management. */
  prevention: string[];
  /** Treatment categories, flattened into readable lines. */
  treatment: string[];
  /** Label/PPE/harvest warnings, or `null` when the record carries none. */
  safety: CropProblemSafety | null;
  /** Reference URLs backing the record. */
  sources: string[];
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
