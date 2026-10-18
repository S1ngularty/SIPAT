import { WrapServerResponse } from "../types/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

class API {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    {
      token,
      idempotencyKey,
      contentType = "application/json",
    }: {
      token?: string | null;
      idempotencyKey?: string | null;
      contentType?: string;
    } = {},
  ): Promise<WrapServerResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": contentType,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        errorText || `Request failed with status ${response.status}`,
      );
      // Preserve the HTTP status so callers can distinguish "not found" from a
      // genuine failure (e.g. the wrap response body is just text).
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return response.json();
  }
}

export const client = new API(API_URL);
