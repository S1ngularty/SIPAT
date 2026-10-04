import { Schema, model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { Diagnosis } from "./diagnosis.types.js";

const diagnosisSchema = new Schema<Diagnosis>(
  {
    diagnosisName: {
      type: String,
      unique: true,
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
  },
  {
    timestamps: true,
  },
);

export type DiagnosisDoc = HydratedDocument<Diagnosis>;

export const DiagnosisModel = model("Diagnosis", diagnosisSchema);
