import type { Document, Types } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser extends Document {
  _id: Types.ObjectId;
  clerkId: string;
  email?: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  farmLocation?: {
    province?: string;
    municipality?: string;
    barangay?: string;
  };
  preferredCrops?: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUser {
  clerkId: string;
  email: string;
  name: string;
  role?: UserRole;
  phoneNumber?: string;
  farmLocation?: {
    province?: string;
    municipality?: string;
    barangay?: string;
  };
  preferredCrops?: string[];
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface IUpdateUser {
  name?: string | undefined;
  role?: UserRole;
  phoneNumber?: string | undefined;
  farmLocation?:
    | {
        province?: string | undefined;
        municipality?: string | undefined;
        barangay?: string | undefined;
      }
    | undefined;
  preferredCrops?: string[] | undefined;
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface IUserFilter {
  clerkId?: string | undefined;
  email?: string | undefined;
  role?: UserRole | undefined;
  isActive?: boolean | undefined;
  province?: string | undefined;
  municipality?: string | undefined;
  preferredCrops?: string[] | undefined;
}

export interface IUserProjection {
  includePhoneNumber?: boolean;
  includeFarmLocation?: boolean;
  includePreferredCrops?: boolean;
  includeTimestamps?: boolean;
}

export interface IUserListOptions {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
  filter?: IUserFilter;
  projection?: IUserProjection;
}

export interface IUserListResult {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
