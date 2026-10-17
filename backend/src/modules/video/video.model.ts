import {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import type { Video } from "./video.types.js";

const videoSchema = new Schema<Video>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    thumbnailStorageKey: {
      type: String,
      default: null,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending_upload", "uploaded", "processing", "completed", "failed"],
      default: "pending_upload",
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "videos",
    versionKey: false,
  },
);

// Compound indexes
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ userId: 1, status: 1 });
videoSchema.index({ status: 1, createdAt: 1 });

// Inferred raw shape (no _id, no timestamps by default)
export type VideoSchemaType = InferSchemaType<typeof videoSchema>;

// Hydrated document (what you get from queries)
export type VideoDocument = HydratedDocument<VideoSchemaType>;

// Model type
export type VideoModelType = Model<VideoSchemaType>;

export const VideoModel = model("Video", videoSchema);
