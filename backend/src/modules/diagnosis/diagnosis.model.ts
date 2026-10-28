import { Schema, model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { Diagnosis, GroqTerm } from "./diagnosis.types.js";

/**
 * A glossary entry returned by the LLM. `_id: false` keeps the stored/returned
 * shape identical to `GroqTerm`, so the API and mobile app see exactly
 * `id`, `term`, `definition`.
 */
const groqTermSchema = new Schema<GroqTerm>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    term: {
      type: String,
      required: true,
      trim: true,
    },

    definition: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const diagnosisSchema = new Schema<Diagnosis>(
  {
    diagnosisName: {
      type: String,
      required: false,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      unique: true,
      index: true,
    },

    results: {
      type: [
        {
          trackId: {
            type: Number,
            required: true,
          },

          crop: {
            type: String,
            required: true,
            trim: true,
          },

          condition: {
            type: String,
            required: true,
            trim: true,
          },

          confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
          },

          duration: {
            type: Number,
            required: true,
            min: 0,
          },

          observations: {
            type: Number,
            required: true,
            min: 0,
          },

          evidenceKey: {
            type: String,
            required: true,
            trim: true,
          },
        },
      ],
      default: [],
    },

    analysis: {
      summary: String,
      recommendations: [String],
      terms: {
        type: [groqTermSchema],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  },
);

export type DiagnosisDoc = HydratedDocument<Diagnosis>;

export const DiagnosisModel = model("Diagnosis", diagnosisSchema);
