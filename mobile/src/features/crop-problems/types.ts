/**
 * Shapes used by the bundled crop-problem knowledge base
 * (`src/data/crop-problems-*.json`).
 *
 * The Tagalog file is canonical: every human-readable entry carries the
 * Tagalog copy in `text` and the English copy in `textEn`. The English file
 * keeps the same record shape but swaps `text` to English (so `textEn` is
 * absent there).
 */

export type Language = "tl" | "en";

export type CropProblemType = "disease" | "pest" | "healthy";

export type CropProblemSeverity = "low" | "medium" | "high";

export interface LocalizedText {
  tl: string;
  en: string;
}

/** A symptom, management step or diagnosis-guidance line. */
export interface CropProblemTextEntry {
  id: string;
  text: string;
  /** English copy in the Tagalog file; omitted in the English file. */
  textEn?: string;
  images: string[];
}

export interface CropProblemTreatmentStep {
  id: string;
  order: number;
  text: string;
  images: string[];
}

export interface CropProblemTreatment {
  id: string;
  category: string;
  examples: string[];
  cautions: string[];
  images: string[];
  steps: CropProblemTreatmentStep[];
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

export interface CropProblem {
  id: string;
  slug: string;
  name: string;
  localName: string;
  type: CropProblemType;
  category: string;
  scientificName: string;
  description: LocalizedText;
  affectedCrops: string[];
  affectedParts: string[];
  images: string[];
  symptoms: CropProblemTextEntry[];
  favorableConditions: string[];
  transmission: string[];
  severity: CropProblemSeverity;
  differentialDiagnosis: string[];
  management: CropProblemTextEntry[];
  treatments: CropProblemTreatment[];
  actionRefs: string[];
  safety: CropProblemSafety;
  diagnosisGuidance: CropProblemTextEntry[];
  media: CropProblemMedia[];
  metadata: CropProblemMetadata;
}
