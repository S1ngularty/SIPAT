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

class FastAPIClient {
  BASED_URL: string;
  constructor() {
    this.BASED_URL = env.fastapi.based_url;
  }

  async aiProcess(data: {
    video_url: string;
    storage_key: string;
  }): Promise<ProcessResultResponse | null> {
    try {
      const response = await fetch(
        `${this.BASED_URL}/api/v1/detection/process`,
        {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const result = (await response.json()) as ProcessResultResponse;

      return result;
    } catch (error) {
      console.log("AI Worker Erorr:", error);
      return null;
    }
  }
}

export const fastAPIClient = new FastAPIClient();
