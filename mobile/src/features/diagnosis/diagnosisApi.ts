import { client } from "../../api/apiClient";
import type { VideoAnalysis, DiseaseInfo } from "./diagnosisTypes";

export interface AnalysisListResult {
  data: {
    results: VideoAnalysis[];
  };
  meta: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

class DiagnosisAPI {
  async diagnosisList({ page = 1, limit = 5 }): Promise<{
    data: VideoAnalysis[];
    meta: { page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams();

    params.append("page", String(page));
    params.append("limit", String(limit));

    const response = await client.request<VideoAnalysis[]>(
      `/api/v1/diagnosis/list?${params.toString()}`,
      { method: "GET" },
    );

    return {
      data: response.result,
      meta: {
        page: Number(response.meta?.page),
        limit: Number(response.meta?.limit),
        totalPages: Number(response.meta?.total),
      },
    };
  }

  /**
   * Fetch a single diagnosis by videoId.
   * Response shape matches the API payload you shared:
   *   { _id, videoId, results: TrackResult[], createdAt, updatedAt }
   */
  async diagnosisDetail(diagnosisId: string): Promise<VideoAnalysis> {
    console.log(diagnosisId)
    const response = await client.request<VideoAnalysis>(
      `/api/v1/diagnosis/${diagnosisId}`,
      { method: "GET" },
    );
    return response.result;
  }

  /**
   * Fetch disease info (description, symptoms, prevention, treatment)
   * for a given crop + condition pair.
   * Adjust the query params / path if your endpoint differs.
   */
  async diseaseInfo(
    crop: string,
    condition: string,
  ): Promise<DiseaseInfo | null> {
    const params = new URLSearchParams();

    params.append("crop", crop);
    params.append("condition", condition);

    try {
      const response = await client.request<DiseaseInfo>(
        `/api/v1/diagnosis/disease-info?${params.toString()}`,
        { method: "GET" },
      );

      return response.result;
    } catch (err: any) {
      // 404 → no info available; treat as null rather than an error
      if (err?.status === 404) return null;
      throw err;
    }
  }
}

export const diagnosisApi = new DiagnosisAPI();
