import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { IUser, UserRole } from "./user.types.js";

const userSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      // `sparse` keeps the unique index buildable for users created before
      // `email` was persisted (they simply have no value for it).
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"] as UserRole[],
      default: "user",
      index: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
      trim: true,
    },
    farmLocation: {
      province: {
        type: String,
        trim: true,
      },
      municipality: {
        type: String,
        trim: true,
      },
      barangay: {
        type: String,
        trim: true,
      },
    },
    preferredCrops: [
      {
        type: String,
        enum: ["tomato", "eggplant", "pepper", "potato", ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "users",
    versionKey: false,
  },
);

// Compound indexes for common query patterns
userSchema.index({ clerkId: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({
  "farmLocation.province": 1,
  "farmLocation.municipality": 1,
});
userSchema.index({ preferredCrops: 1 });

export type UserDocument = HydratedDocument<IUser>;

export const UserModel: Model<IUser> = mongoose.model<IUser>(
  "User",
  userSchema,
);
