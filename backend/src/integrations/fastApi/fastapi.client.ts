import http from "node:http";
import https from "node:https";

import { env } from "../../core/configs/env.config.js";

interface DetectionList {
  track_id: string;
  crop: string;
  condition: string;
  confidence: string;
  duration: string;
  observations: string;
  evidence_key: string;
}

interface ProcessResultResponse {
  success: boolean;
  results: DetectionList[] | null;
}

/** Raised when the AI service does not answer within `fastapi.timeout_ms`. */
export class FastAPITimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI service did not respond within ${timeoutMs} ms`);
    this.name = "FastAPITimeoutError";
  }
}

/**
 * POST JSON over `node:http(s)` instead of `fetch`.
 *
 * The AI service runs detection synchronously — downloading the clip, running
 * YOLO tracking and uploading evidence crops — which routinely exceeds
 * undici's fixed 300 s `headersTimeout` (surfacing as
 * `UND_ERR_HEADERS_TIMEOUT`). `node:http` lets us set an explicit socket
 * timeout instead, so long clips are allowed to finish.
 */
const postJson = <T>(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);

    const request = transport.request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const status = response.statusCode ?? 0;

          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}: ${raw}`));
            return;
          }

          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(
              new Error(
                `AI service returned invalid JSON: ${raw.slice(0, 200)}`,
              ),
            );
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new FastAPITimeoutError(timeoutMs));
    });

    request.on("error", reject);

    request.end(payload);
  });

class FastAPIClient {
  BASED_URL: string;
  TIMEOUT_MS: number;

  constructor() {
    this.BASED_URL = env.fastapi.based_url;
    this.TIMEOUT_MS = env.fastapi.timeout_ms;
  }

  /**
   * Ask the AI service to process a video.
   *
   * Throws on any transport/HTTP/parsing failure so the worker's job is marked
   * as failed (and can be retried) instead of silently completing with zero
   * detections.
   */
  async aiProcess(data: {
    video_url: string;
    storage_key: string;
  }): Promise<ProcessResultResponse> {
    try {
      return await postJson<ProcessResultResponse>(
        `${this.BASED_URL}/api/v1/detection/process`,
        data,
        this.TIMEOUT_MS,
      );
    } catch (error) {
      console.log("AI Worker Error:", error);
      throw error;
    }
  }
}

export const fastAPIClient = new FastAPIClient();
