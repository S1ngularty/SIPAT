import { z } from "zod";
import {
  CROP_PROBLEM_AFFECTED_PARTS,
  CROP_PROBLEM_REVIEW_STATUSES,
  CROP_PROBLEM_SEVERITIES,
  CROP_PROBLEM_TYPES,
} from "./cropProblem.types.js";

/**
 * Accepts either a single string or an array of strings and normalizes to a
 * trimmed, non-empty `string[]`. This keeps seed JSON tolerant of both
 * `"symptoms": "one thing"` and `"symptoms": ["a", "b"]`.
 */
const stringArraySchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .transform((values) =>
    values.map((value) => value.trim()).filter((value) => value.length > 0),
  );

/** Accepts a comma-separated string or an array (used for query params). */
const csvToArraySchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")))
  .transform((values) =>
    values.map((value) => value.trim()).filter((value) => value.length > 0),
  );

/** Accepts a single item or an array of items and normalizes to an array. */
function tolerantArray<T extends z.ZodTypeAny>(item: T) {
  return z
    .union([item, z.array(item)])
    .transform((value): z.infer<T>[] => (Array.isArray(value) ? value : [value]));
}

const descriptionSchema = z
  .object({
    tl: z.string().trim().default(""),
    en: z.string().trim().default(""),
  })
  .default({ tl: "", en: "" });

/** A treatment is accepted as a plain category string or a structured object. */
const treatmentSchema = z.union([
  z.string().transform((category) => ({
    category: category.trim(),
    examples: [] as string[],
    cautions: [] as string[],
  })),
  z.object({
    category: z.string().min(1).trim(),
    examples: stringArraySchema.optional().default([]),
    cautions: stringArraySchema.optional().default([]),
  }),
]);

/** A media entry is accepted as a bare URL string or a structured object. */
const mediaSchema = z.union([
  z.string().transform((url) => ({ url: url.trim(), type: "", caption: "" })),
  z.object({
    url: z.string().min(1).trim(),
    type: z.string().trim().default(""),
    caption: z.string().trim().default(""),
  }),
]);

const safetySchema = z
  .object({
    ppe: stringArraySchema.optional().default([]),
    environmentalPrecautions: stringArraySchema.optional().default([]),
    harvestRestrictions: z.string().trim().default(""),
  })
  .default({
    ppe: [],
    environmentalPrecautions: [],
    harvestRestrictions: "",
  });

const metadataSchema = z
  .object({
    version: z.string().trim().default("1"),
    sources: stringArraySchema.optional().default([]),
    reviewDate: z
      .union([z.string(), z.date(), z.null()])
      .optional()
      .default(null)
      .transform((value) => (value ? new Date(value) : null)),
    reviewStatus: z.enum(CROP_PROBLEM_REVIEW_STATUSES).default("draft"),
  })
  .default({
    version: "1",
    sources: [],
    reviewDate: null,
    reviewStatus: "draft",
  });

/**
 * Canonical shape of a crop problem as supplied by the seed JSON / create API.
 * Tolerant on lists (string or array) and localized on write so the repository
 * always receives a fully-populated document.
 */
export const createCropProblemSchema = z.object({
  id: z.string().min(1).trim(),
  slug: z.string().min(1).trim().toLowerCase(),
  name: z.string().min(1).trim(),
  localName: z.string().trim().default(""),
  type: z.enum(CROP_PROBLEM_TYPES),
  category: z.string().min(1).trim(),
  scientificName: z.string().trim().default(""),

  description: descriptionSchema,

  affectedCrops: stringArraySchema.optional().default([]),
  affectedParts: tolerantArray(z.enum(CROP_PROBLEM_AFFECTED_PARTS))
    .optional()
    .default([]),

  symptoms: stringArraySchema.optional().default([]),
  favorableConditions: stringArraySchema.optional().default([]),
  transmission: stringArraySchema.optional().default([]),

  severity: z.enum(CROP_PROBLEM_SEVERITIES),

  differentialDiagnosis: stringArraySchema.optional().default([]),
  management: stringArraySchema.optional().default([]),

  treatments: tolerantArray(treatmentSchema).optional().default([]),
  actionRefs: stringArraySchema.optional().default([]),

  safety: safetySchema,

  diagnosisGuidance: stringArraySchema.optional().default([]),
  media: tolerantArray(mediaSchema).optional().default([]),

  metadata: metadataSchema,
});

/** Update payload: any subset of the create fields. */
export const updateCropProblemSchema = createCropProblemSchema.partial();

/** Query string schema for the paginated list endpoint. */
export const cropProblemListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(["createdAt", "updatedAt", "name", "severity"])
    .default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  type: z.enum(CROP_PROBLEM_TYPES).optional(),
  severity: z.enum(CROP_PROBLEM_SEVERITIES).optional(),
  category: z.string().trim().optional(),
  affectedCrops: csvToArraySchema.optional(),
  affectedParts: z.array(z.enum(CROP_PROBLEM_AFFECTED_PARTS)).optional(),
  reviewStatus: z.enum(CROP_PROBLEM_REVIEW_STATUSES).optional(),
  search: z.string().trim().optional(),
});

export type CreateCropProblemPayload = z.infer<typeof createCropProblemSchema>;
export type UpdateCropProblemPayload = z.infer<
  typeof updateCropProblemSchema
>;
export type CropProblemListQuery = z.infer<typeof cropProblemListQuerySchema>;
