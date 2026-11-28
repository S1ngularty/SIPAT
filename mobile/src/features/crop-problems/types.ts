/**
 * Shapes used by the bundled crop-problem knowledge base
 * (`src/data/crop-problem.json`).
 *
 * The merged file is bilingual: human-readable fields carry both `tl` and
 * `en`, so the app reads one dataset and only switches which value it renders.
 */

export type Language = "tl" | "en";

/** A string that exists in both Tagalog and English. */
export interface Bilingual {
  tl: string;
  en: string;
}

/** A list of strings that exists in both Tagalog and English. */
export interface BilingualList {
  tl: string[];
  en: string[];
}

export const CROP_PROBLEM_TYPES = ["disease", "pest", "healthy"] as const;
export type CropProblemType = (typeof CROP_PROBLEM_TYPES)[number];

export const CROP_PROBLEM_SEVERITIES = ["low", "medium", "high"] as const;
export type CropProblemSeverity = (typeof CROP_PROBLEM_SEVERITIES)[number];

export const CROP_PROBLEM_REVIEW_STATUSES = [
  "draft",
  "reviewed",
  "published",
] as const;
export type CropProblemReviewStatus =
  (typeof CROP_PROBLEM_REVIEW_STATUSES)[number];

export const CROP_PROBLEM_AFFECTED_PARTS = [
  "leaves",
  "stems",
  "fruits",
  "roots",
  "flowers",
  "dahon",
  "tangkay",
  "bunga",
  "ugat",
  "bulaklak",
] as const;
export type CropProblemAffectedPart =
  (typeof CROP_PROBLEM_AFFECTED_PARTS)[number];

export const CROP_PROBLEM_CATEGORIES = [
  "fungal",
  "oomycete",
  "bacterial",
  "viral",
  "insect",
  "mite",
  "undetermined",
  "no-visible-symptoms",
] as const;
export type CropProblemCategory = (typeof CROP_PROBLEM_CATEGORIES)[number];

/** A symptom, management step or diagnosis-guidance line. */
export interface TextWithImages {
  id: string;
  text: Bilingual;
  images: string[];
}

/** A single step inside a treatment. */
export interface TreatmentStep {
  id: string;
  order: number;
  text: Bilingual;
  images: string[];
}

/** A treatment entry. */
export interface Treatment {
  id: string;
  category: Bilingual;
  examples: Bilingual[];
  cautions: Bilingual[];
  images: string[];
  steps: TreatmentStep[];
}

/** Safety block. */
export interface Safety {
  ppe: Bilingual[];
  environmentalPrecautions: Bilingual[];
  harvestRestrictions: Bilingual;
}

/** Metadata block (machine data — not translated). */
export interface CropProblemMetadata {
  version: string;
  sources: string[];
  reviewDate: string | null;
  reviewStatus: CropProblemReviewStatus;
}

export interface CropProblem {
  id: string;
  slug: string;
  /** Canonical English display name; not translated. */
  name: string;
  localName: Bilingual;
  type: CropProblemType;
  category: CropProblemCategory;
  scientificName: string;

  description: Bilingual;

  affectedCrops: BilingualList;
  affectedParts: BilingualList;

  images: string[];

  symptoms: TextWithImages[];
  favorableConditions: Bilingual[];
  transmission: Bilingual[];
  severity: CropProblemSeverity;
  differentialDiagnosis: Bilingual[];
  management: TextWithImages[];
  treatments: Treatment[];

  actionRefs: string[];

  safety: Safety;

  diagnosisGuidance: TextWithImages[];

  media: string[];

  metadata: CropProblemMetadata;
}
