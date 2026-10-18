import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { CropProblem } from "./cropProblem.types.js";
import {
  CROP_PROBLEM_AFFECTED_PARTS,
  CROP_PROBLEM_REVIEW_STATUSES,
  CROP_PROBLEM_SEVERITIES,
  CROP_PROBLEM_TYPES,
} from "./cropProblem.types.js";

const localizedTextSchema = new Schema(
  {
    tl: { type: String, trim: true, default: "" },
    en: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const treatmentSchema = new Schema(
  {
    category: { type: String, required: true, trim: true },
    examples: { type: [String], default: [] },
    cautions: { type: [String], default: [] },
  },
  { _id: false },
);

const safetySchema = new Schema(
  {
    ppe: { type: [String], default: [] },
    environmentalPrecautions: { type: [String], default: [] },
    harvestRestrictions: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const mediaSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: "" },
    caption: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const metadataSchema = new Schema(
  {
    version: { type: String, trim: true, default: "1" },
    sources: { type: [String], default: [] },
    reviewDate: { type: Date, default: null },
    reviewStatus: {
      type: String,
      enum: [...CROP_PROBLEM_REVIEW_STATUSES],
      default: "draft",
      index: true,
    },
  },
  { _id: false },
);

const cropProblemSchema = new Schema<CropProblem>(
  {
    // Human-authored stable ID. Stored alongside Mongo's `_id`; the default
    // `id` virtual is disabled below so this path is persisted as-is.
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    localName: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: [...CROP_PROBLEM_TYPES],
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    scientificName: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: localizedTextSchema,
      default: () => ({ tl: "", en: "" }),
    },

    affectedCrops: {
      type: [String],
      default: [],
      index: true,
    },

    affectedParts: {
      type: [
        {
          type: String,
          enum: [...CROP_PROBLEM_AFFECTED_PARTS],
        },
      ],
      default: [],
    },

    symptoms: { type: [String], default: [] },
    favorableConditions: { type: [String], default: [] },
    transmission: { type: [String], default: [] },

    severity: {
      type: String,
      enum: [...CROP_PROBLEM_SEVERITIES],
      required: true,
      index: true,
    },

    differentialDiagnosis: { type: [String], default: [] },
    management: { type: [String], default: [] },

    treatments: { type: [treatmentSchema], default: [] },

    actionRefs: { type: [String], default: [], index: true },

    safety: {
      type: safetySchema,
      default: () => ({
        ppe: [],
        environmentalPrecautions: [],
        harvestRestrictions: "",
      }),
    },

    diagnosisGuidance: { type: [String], default: [] },

    media: { type: [mediaSchema], default: [] },

    metadata: {
      type: metadataSchema,
      default: () => ({
        version: "1",
        sources: [],
        reviewDate: null,
        reviewStatus: "draft",
      }),
    },
  },
  {
    timestamps: true,
    collection: "crop_problems",
    versionKey: false,
    // Keep the persisted `id` field instead of Mongoose's `_id` string virtual.
    id: false,
  },
);

// Compound indexes for common query patterns.
cropProblemSchema.index({ type: 1, severity: 1 });
cropProblemSchema.index({ affectedCrops: 1, type: 1 });
cropProblemSchema.index({ category: 1, severity: 1 });

// Free-text search across the fields a technician is likely to type.
cropProblemSchema.index({
  name: "text",
  localName: "text",
  scientificName: "text",
  slug: "text",
  "description.en": "text",
  "description.tl": "text",
});

export type CropProblemDocument = HydratedDocument<CropProblem>;

export const CropProblemModel: Model<CropProblem> = mongoose.model<CropProblem>(
  "CropProblem",
  cropProblemSchema,
);
