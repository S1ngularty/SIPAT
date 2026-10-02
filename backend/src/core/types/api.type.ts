import type { Response } from "express";

export interface ApiResponse<T> {
  message: string;
  success: boolean;
  result: T;
  error?: string;
  timestamp?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  total?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuthUser {
  clerkId: string;
  email: string;
  name: string;
  role: string;
}

export interface RequestContext {
  user?: AuthUser;
  requestId: string;
  timestamp: Date;
}

export type ResponseDefault<T> = Response<ApiResponse<T>>;
